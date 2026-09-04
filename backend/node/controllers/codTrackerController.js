const { Op } = require('sequelize');
const { Order, OrderSlot, Customer, Product } = require('../models/index');

// Get all COD orders with amount status
exports.getCodOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { paymentMethod: 'COD' },
            include: [
                { model: Customer, attributes: ['name', 'email', 'phone'] },
                { model: OrderSlot, as: 'slots', include: [{ model: Product, attributes: ['name'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: orders });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Get COD tracker summary
exports.getCodSummary = async (req, res) => {
    try {
        const { sequelize } = require('../models/index');

        const [summary] = await sequelize.query(`
            SELECT
                COALESCE(SUM(totalAmount), 0) as totalCodAmount,
                COALESCE(SUM(CASE WHEN codAmountStatus = 'paid' THEN totalAmount ELSE 0 END), 0) as totalPaid,
                COALESCE(SUM(CASE WHEN codAmountStatus = 'partial' THEN codReceivedAmount ELSE 0 END), 0) as totalPartialReceived,
                COALESCE(SUM(CASE WHEN codAmountStatus = 'pending' OR codAmountStatus IS NULL THEN totalAmount ELSE 0 END), 0) as totalPending,
                COUNT(*) as totalOrders,
                SUM(CASE WHEN codAmountStatus = 'paid' THEN 1 ELSE 0 END) as paidOrders,
                SUM(CASE WHEN codAmountStatus = 'partial' THEN 1 ELSE 0 END) as partialOrders,
                SUM(CASE WHEN codAmountStatus IS NULL OR codAmountStatus = 'pending' THEN 1 ELSE 0 END) as pendingOrders
            FROM Orders
            WHERE paymentMethod = 'COD'
            AND orderStatus NOT IN ('Cancelled')
        `);

        // Per courier breakdown
        const [courierBreakdown] = await sequelize.query(`
            SELECT
                COALESCE(courierPartner, 'Unassigned') as courier,
                COALESCE(SUM(totalAmount), 0) as totalAmount,
                COALESCE(SUM(CASE WHEN codAmountStatus = 'paid' THEN totalAmount ELSE 0 END), 0) as paidAmount,
                COALESCE(SUM(CASE WHEN codAmountStatus = 'partial' THEN codReceivedAmount ELSE 0 END), 0) as partialAmount,
                COUNT(*) as orderCount
            FROM Orders
            WHERE paymentMethod = 'COD'
            AND orderStatus NOT IN ('Cancelled')
            GROUP BY courierPartner
        `);

        res.json({ success: true, summary: summary[0], courierBreakdown });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Update COD amount status for an order
exports.updateCodStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { codAmountStatus, codReceivedAmount } = req.body;

        const order = await Order.findOne({ where: { orderId } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.paymentMethod !== 'COD') return res.status(400).json({ success: false, message: 'Not a COD order' });

        await order.update({
            codAmountStatus,
            codReceivedAmount: codAmountStatus === 'paid' ? order.totalAmount : (Number(codReceivedAmount) || 0)
        });

        res.json({ success: true, message: 'COD status updated', data: order });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Get Online orders with shipping due tracker
exports.getOnlineOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { paymentMethod: 'Online', paymentStatus: 'Paid' },
            include: [
                { model: Customer, attributes: ['name', 'email', 'phone'] },
                { model: OrderSlot, as: 'slots', include: [{ model: Product, attributes: ['name'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Calculate total shipping due to couriers
        const totalShippingDue = orders
            .filter(o => !o.courierPaymentStatus || o.courierPaymentStatus === 'Unpaid')
            .reduce((sum, o) => sum + Number(o.shippingAmount || 0), 0);

        res.json({ success: true, data: orders, totalShippingDue });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
