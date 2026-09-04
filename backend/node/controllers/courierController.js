const Order = require('../models/Order');
const OrderSlot = require('../models/OrderSlot');
const { ShippingAddress, Customer } = require('../models');
const shiprocketService = require('../services/shiprocketService');
const dtdcService = require('../services/dtdcService');

const buildTrackingUrl = (courierPartner, awbCode) => {
    if (courierPartner === 'DTDC' && awbCode && awbCode !== 'Pending Assignment') {
        return `https://smarttrack.dtdc.com/ctms-pt-web/portal/track/index?strBookingID=${awbCode}`;
    }
    if (courierPartner === 'Shiprocket' && awbCode && awbCode !== 'Pending Assignment') {
        return `https://shiprocket.co/tracking/${awbCode}`;
    }
    return /^https?:\/\//i.test(awbCode) ? awbCode : null;
};

exports.assignCourier = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { courierPartner, packageDetails } = req.body;

        if (!['Shiprocket', 'DTDC', 'Manual'].includes(courierPartner)) {
            return res.status(400).json({ success: false, message: 'Invalid courier partner' });
        }

        const order = await Order.findOne({
            where: { orderId },
            include: [{ model: Customer, attributes: ['name', 'email', 'phone'] }]
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.courierPartner) {
            return res.status(400).json({ success: false, message: `Order already assigned to ${order.courierPartner}` });
        }

        const shippingAddress = await ShippingAddress.findByPk(order.shippingAddressId);
        if (!shippingAddress) return res.status(404).json({ success: false, message: 'Shipping address not found' });

        const items = await OrderSlot.findAll({ where: { orderId: order.orderId } });

        let awbCode = null;
        let shipmentId = null;
        let trackingUrl = null;

        const courierCost = Number(packageDetails.courierShippingCost || 0);

        if (courierPartner === 'Shiprocket') {
            const shiprocketOrder = await shiprocketService.createOrder(order, packageDetails, shippingAddress, items);
            shipmentId = shiprocketOrder.shipment_id;
            try {
                // Try to generate AWB immediately
                const awbRes = await shiprocketService.generateAWB(shipmentId);
                awbCode = awbRes.response?.data?.awb_code;
                trackingUrl = buildTrackingUrl(courierPartner, awbCode);
            } catch (awbError) {
                console.warn('Shiprocket AWB generation skipped:', awbError.message);
                awbCode = 'Pending Assignment';
            }
            
            await order.update({
                courierPartner,
                shiprocket_order_id: String(shiprocketOrder.order_id),
                shiprocket_shipment_id: String(shipmentId),
                awb_code: awbCode,
                tracking_url: trackingUrl,
                courierShippingCost: courierCost,
                courierPaymentStatus: 'Unpaid',
                orderStatus: 'Shipped'
            });

        } else if (courierPartner === 'DTDC') {
            awbCode = await dtdcService.createOrder(order, packageDetails, shippingAddress, items);
            trackingUrl = buildTrackingUrl(courierPartner, awbCode);
            
            await order.update({
                courierPartner,
                awb_code: awbCode,
                tracking_url: trackingUrl,
                courierShippingCost: courierCost,
                courierPaymentStatus: 'Unpaid',
                orderStatus: 'Shipped'
            });
        } else if (courierPartner === 'Manual') {
            awbCode = packageDetails.trackingId || 'N/A';
            trackingUrl = /^https?:\/\//i.test(awbCode) ? awbCode : null;
            const manualShippingAmount = Number(packageDetails.shippingAmount || 0);
            const existingShippingAmount = Number(order.shippingAmount || 0);
            const shouldUpdateShipping = manualShippingAmount > 0 && !existingShippingAmount;
            const updatedShippingAmount = shouldUpdateShipping ? manualShippingAmount : existingShippingAmount;
            const updatedTotalAmount = shouldUpdateShipping
                ? Number(order.totalAmount || 0) + manualShippingAmount
                : Number(order.totalAmount || 0);
            
            await order.update({
                courierPartner,
                awb_code: awbCode,
                tracking_url: trackingUrl,
                shippingAmount: updatedShippingAmount,
                totalAmount: updatedTotalAmount,
                courierShippingCost: courierCost,
                courierPaymentStatus: 'Unpaid',
                orderStatus: 'Shipped'
            });
        }

        res.status(200).json({
            success: true,
            message: `Order assigned to ${courierPartner} successfully`,
            awb_code: awbCode
        });

    } catch (error) {
        console.error('Assign Courier Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTracking = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ where: { orderId } });

        if (!order || !order.courierPartner) {
            return res.status(404).json({ success: false, message: 'Order or Courier not found' });
        }

        if (order.courierPartner === 'Manual') {
            return res.status(200).json({
                success: true,
                courier: 'Manual',
                currentStatus: 'Manual shipping',
                awb_code: order.awb_code,
                tracking_url: order.tracking_url,
                events: [
                    {
                        index: 0,
                        status: order.awb_code || 'Manual tracking details',
                        location: 'Manual courier details',
                        dateTime: order.updatedAt || order.createdAt,
                        raw: { manual: true }
                    }
                ]
            });
        }

        if (!order.awb_code) {
            return res.status(400).json({ success: false, message: 'AWB code not found for tracking' });
        }

        const tracking = order.courierPartner === 'Shiprocket'
            ? await shiprocketService.getTracking(order.awb_code)
            : await dtdcService.getTracking(order.awb_code);

        const officialUrl = buildTrackingUrl(order.courierPartner, order.awb_code) || order.tracking_url;

        res.status(200).json({
            success: true,
            ...tracking,
            orderId: order.orderId,
            courierPartner: order.courierPartner,
            awb_code: order.awb_code,
            tracking_url: officialUrl
        });
    } catch (error) {
        console.error('Get Tracking Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
};

exports.getLabel = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ where: { orderId } });

        if (!order || !order.courierPartner) {
            return res.status(404).json({ success: false, message: 'Order or Courier not found' });
        }

        let labelData = null;

        if (order.courierPartner === 'Shiprocket') {
            if (!order.shiprocket_shipment_id) return res.status(400).json({ success: false, message: 'Shipment ID not found' });
            labelData = await shiprocketService.getLabel(order.shiprocket_shipment_id);
        } else if (order.courierPartner === 'DTDC') {
            if (!order.awb_code) return res.status(400).json({ success: false, message: 'AWB not found' });
            labelData = await dtdcService.getLabel(order.awb_code);
        }

        res.status(200).json({ success: true, label: labelData, courier: order.courierPartner });

    } catch (error) {
        console.error('Get Label Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
};
