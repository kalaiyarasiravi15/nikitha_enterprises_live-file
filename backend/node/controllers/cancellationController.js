const { Op } = require('sequelize');
const { OrderCancellation, Order, OrderSlot, Product, ProductVariant, Customer, sequelize } = require('../models/index');
const path = require('path');
const courierService = require('../utils/courierService');
const refundService = require('../utils/refundService');
const fs = require('fs');

const restoreOrderStock = async (orderId, transaction) => {
    const slots = await OrderSlot.findAll({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
    for (const slot of slots) {
        // Pre-booking never reserves/deducts stock, so it must not be restored.
        if (slot.isPreorder) continue;

        const model = slot.variantId ? ProductVariant : Product;
        const inventory = await model.findByPk(slot.variantId || slot.productId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (!inventory) continue;

        const quantity = Number(slot.quantity || 0);
        await inventory.update({
            stock: Number(inventory.stock || 0) + quantity,
            salesStock: Math.max(0, Number(inventory.salesStock || 0) - quantity)
        }, { transaction });
    }
};

// User: Request cancellation
exports.requestCancel = async (req, res) => {
    try {
        const { orderId, cancelType, reasonCategory, reasonText, customerUpiId, refundMethod, videoUrl } = req.body;
        let images = [];
        let video = videoUrl || null;

        if (req.files) {
            if (Array.isArray(req.files)) {
                images = req.files.filter(f => f.fieldname === 'images' || f.mimetype.startsWith('image/')).map(f => f.filename);
                const vidFile = req.files.find(f => f.fieldname === 'video' || f.mimetype.startsWith('video/'));
                if (vidFile) video = vidFile.filename;
            } else if (typeof req.files === 'object') {
                if (req.files.images) images = req.files.images.map(f => f.filename);
                if (req.files.video && req.files.video[0]) video = req.files.video[0].filename;
            }
        }

        if (!orderId || !cancelType) {
            return res.status(400).json({ success: false, message: 'orderId and cancelType are required' });
        }

        const order = await Order.findOne({ where: { orderId } });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        // Check if already has a pending cancellation
        const existing = await OrderCancellation.findOne({
            where: { orderId, status: { [Op.notIn]: ['REJECTED', 'REFUNDED'] } }
        });
        if (existing) return res.status(400).json({ success: false, message: 'A cancellation request already exists for this order' });

        // Validate 7-day window for POST_DELIVERY
        if (cancelType === 'POST_DELIVERY' && order.orderStatus === 'Delivered') {
            const deliveredAt = order.updatedAt;
            const daysDiff = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 7) {
                return res.status(400).json({ success: false, message: 'Return window of 7 days has expired' });
            }
        }

        const effectiveRefundMethod = (order.paymentMethod === 'Online' && refundMethod === 'SAME_ACCOUNT') ? 'SAME_ACCOUNT' : 'UPI';

        // UPI ID required only if refundMethod is UPI and payment was Online (or COD return)
        if (cancelType !== 'PRE_DISPATCH' && effectiveRefundMethod === 'UPI' && !customerUpiId && order.paymentMethod === 'Online') {
            return res.status(400).json({ success: false, message: 'UPI ID is required for UPI refund option' });
        }

        const cancellation = await OrderCancellation.create({
            orderId,
            cancelType,
            reasonCategory: reasonCategory || null,
            reasonText: reasonText || null,
            images,
            video,
            customerUpiId: customerUpiId || null,
            refundMethod: effectiveRefundMethod,
            refundAmount: order.paymentMethod === 'Online' ? Number(order.totalAmount) : 0,
            refundStatus: order.paymentMethod === 'Online' ? 'PENDING' : 'NOT_APPLICABLE',
            status: 'REQUESTED'
        });

        // Update order cancellation status
        await order.update({ cancellationStatus: 'Requested', cancellationReason: reasonCategory || reasonText || 'Cancel requested' });

        setImmediate(async () => {
            try {
                const { sendThemedOrderMail } = require('../utils/mailer');
                const customer = await Customer.findByPk(order.customerId);
                const email = order.snapEmail || customer?.email;
                if (email) {
                    await sendThemedOrderMail({
                        to: email,
                        subject: `Cancellation Requested - Order NE-${order.orderId}`,
                        title: 'Cancellation Requested',
                        intro: `Hi ${order.snapName || customer?.name || 'Customer'}, we have received your request to cancel Order NE-${order.orderId}.`,
                        body: `<p style="margin:0;color:#374151">Our team is reviewing your request and will update you shortly.</p>`,
                        footer: 'Thank you for shopping with Anyra\'s Trove.'
                    });
                }
            } catch (err) {
                console.error('Cancel request mail error:', err.message);
            }
        });

        res.json({ success: true, message: 'Cancellation request submitted', data: cancellation });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Get all cancellations
exports.getAll = async (req, res) => {
    try {
        const { cancelType, status } = req.query;
        const where = {};
        if (cancelType) where.cancelType = cancelType;
        if (status) where.status = status;

        const cancellations = await OrderCancellation.findAll({
            where,
            include: [{ model: Order, attributes: ['orderId', 'totalAmount', 'paymentMethod', 'snapName', 'snapPhone', 'snapState', 'orderStatus'] }],
            order: [['createdAt', 'DESC']]
        });

        const formatted = cancellations.map(c => {
            const json = c.toJSON();
            if (json.Order && json.Order.cancellationStatus === 'Approved' && json.status === 'REQUESTED') {
                json.status = 'APPROVED';
            }
            return json;
        });

        res.json({ success: true, data: formatted });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Approve cancellation
exports.approve = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { adminId, pickupDate, pickupTimeSlot } = req.body;

        const cancel = await OrderCancellation.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!cancel) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        if (cancel.status !== 'REQUESTED') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'This cancellation request has already been processed.' });
        }
        const order = await Order.findOne({ where: { orderId: cancel.orderId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!order || order.orderStatus === 'Cancelled') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'This order is already cancelled.' });
        }

        await cancel.update({
            status: 'APPROVED',
            adminApprovedBy: adminId || null,
            adminApprovedAt: new Date(),
            pickupDate: pickupDate || null,
            pickupTimeSlot: pickupTimeSlot || null
        }, { transaction: t });

        // ONLY Pre-dispatch returns inventory immediately.
        // In-transit and Delivered returns must wait for "Product Received".
        if (cancel.cancelType === 'PRE_DISPATCH') {
            await restoreOrderStock(order.orderId, t);
        }

        // Automated courier cancellation if the order was assigned
        if (cancel.cancelType !== 'POST_DELIVERY') {
            await courierService.cancelShipment(order.courierPartner, order.orderId, order.awb_code);
        }
        await order.update({ orderStatus: 'Cancelled', cancellationStatus: 'Approved' }, { transaction: t });
        await t.commit();

        setImmediate(async () => {
            try {
                const { sendThemedOrderMail } = require('../utils/mailer');
                const customer = await Customer.findByPk(order.customerId);
                const email = order.snapEmail || customer?.email;
                if (email) {
                    await sendThemedOrderMail({
                        to: email,
                        subject: `Cancellation Approved - Order NE-${order.orderId}`,
                        title: 'Cancellation Approved',
                        intro: `Hi ${order.snapName || customer?.name || 'Customer'}, your cancellation request for Order NE-${order.orderId} has been approved.`,
                        body: `<p style="margin:0;color:#374151">The order has been cancelled successfully.</p>`,
                        footer: 'Thank you for shopping with Anyra\'s Trove.'
                    });
                }
            } catch (err) {
                console.error('Cancel approval mail error:', err.message);
            }
        });

        // Send Return Pickup Email notification to customer if pickupDate is set
        if (pickupDate) {
            setImmediate(async () => {
                try {
                    const { sendThemedOrderMail } = require('../utils/mailer');
                    const customer = await Customer.findByPk(order.customerId);
                    const email = order.snapEmail || customer?.email;
                    if (email) {
                        await sendThemedOrderMail({
                            to: email,
                            subject: `Return Pickup Scheduled - Order NE-${order.orderId}`,
                            title: 'Return Pickup Scheduled',
                            intro: `Hi ${order.snapName || customer?.name || 'Customer'}, your return pickup for Order NE-${order.orderId} has been scheduled.`,
                            body: `
                                <p style="margin:0 0 12px;color:#374151">Pickup Date: <strong>${new Date(pickupDate).toLocaleDateString('en-IN')}</strong></p>
                                <p style="margin:0 0 12px;color:#374151">Time Slot: <strong>${pickupTimeSlot || '10:00 AM - 05:00 PM'}</strong></p>
                                <p style="margin:0;color:#6b7280">Please keep the item safely packed with all original invoice and tags.</p>
                            `,
                            footer: 'Thank you for shopping with Anyra\'s Trove.'
                        });
                    }
                } catch (mailErr) {
                    console.error('Return pickup mail error:', mailErr.message);
                }
            });
        }

        res.json({ success: true, message: 'Cancellation approved successfully', data: cancel });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Reject cancellation
exports.reject = async (req, res) => {
    try {
        const { id } = req.params;
        const cancel = await OrderCancellation.findByPk(id, { include: [Order] });
        if (!cancel) return res.status(404).json({ success: false, message: 'Not found' });

        await cancel.update({ status: 'REJECTED' });
        if (cancel.Order) {
            await cancel.Order.update({ cancellationStatus: 'Rejected' });
            
            setImmediate(async () => {
                try {
                    const { sendThemedOrderMail } = require('../utils/mailer');
                    const order = cancel.Order;
                    const customer = await Customer.findByPk(order.customerId);
                    const email = order.snapEmail || customer?.email;
                    if (email) {
                        await sendThemedOrderMail({
                            to: email,
                            subject: `Cancellation Rejected - Order NE-${order.orderId}`,
                            title: 'Cancellation Rejected',
                            intro: `Hi ${order.snapName || customer?.name || 'Customer'}, your cancellation/return request for Order NE-${order.orderId} was rejected.`,
                            body: `<p style="margin:0;color:#374151">If you have any questions, please contact our support team.</p>`,
                            footer: 'Thank you for shopping with Anyra\'s Trove.'
                        });
                    }
                } catch (err) {
                    console.error('Cancel rejection mail error:', err.message);
                }
            });
        }

        res.json({ success: true, message: 'Cancellation rejected' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Mark product received (POST_DELIVERY returns)
exports.markProductReceived = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const cancel = await OrderCancellation.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!cancel) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        if (cancel.cancelType === 'PRE_DISPATCH' || cancel.status !== 'APPROVED') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Invalid state for marking product received.' });
        }
        await restoreOrderStock(cancel.orderId, t);
        await cancel.update({ status: 'PRODUCT_RECEIVED', productReceivedAt: new Date() }, { transaction: t });
        await t.commit();
        res.json({ success: true, message: 'Product received marked' });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Initiate refund
exports.initiateRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const cancel = await OrderCancellation.findByPk(id);
        if (!cancel) return res.status(404).json({ success: false, message: 'Not found' });
        await cancel.update({ status: 'REFUND_INITIATED', refundStatus: 'INITIATED' });
        res.json({ success: true, message: 'Refund initiated', upiId: cancel.customerUpiId, amount: cancel.refundAmount });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Mark refund completed
exports.completeRefund = async (req, res) => {
    try {
        const { id } = req.params;
        // Include Order to get the payment method
        const cancel = await OrderCancellation.findByPk(id, { include: [{ model: Order }] });
        if (!cancel) return res.status(404).json({ success: false, message: 'Not found' });

        const order = cancel.Order;

        // Auto-refund logic for Online + SAME_ACCOUNT
        if (order && order.paymentMethod === 'Online' && cancel.refundMethod === 'SAME_ACCOUNT') {
            const success = await refundService.processHdfcRefund(order.orderId, cancel.refundAmount);
            if (!success) {
                return res.status(500).json({ success: false, message: 'Automated API refund failed. Please check your HDFC API keys or process manually via gateway dashboard.' });
            }
        }

        await cancel.update({ status: 'REFUNDED', refundStatus: 'COMPLETED' });
        res.json({ success: true, message: 'Refund completed successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Stats summary
exports.stats = async (req, res) => {
    try {
        const { sequelize } = require('../models/index');
        const [rows] = await sequelize.query(`
            SELECT
                cancel_type, status,
                COUNT(*) as count,
                SUM(refund_amount) as total_refund
            FROM OrderCancellations
            GROUP BY cancel_type, status
        `);
        res.json({ success: true, data: rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// User: Get cancellations for an order
exports.getByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const cancellations = await OrderCancellation.findAll({ where: { orderId }, order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: cancellations });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
