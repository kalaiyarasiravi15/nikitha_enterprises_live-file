// FILE PATH: ars-fashion-backend/controllers/orderController.js
// ACTION   : REPLACE FULL FILE (added shippingAmount in placeOrder + getOrdersByCustomer)

const { Order, OrderSlot, Customer, CustomerAddress, ShippingAddress, Product, ProductVariant, Coupon, Review } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const couponController = require('./couponController');
const { breakdownFromFinalPrice } = require('../utils/gstHelper');
const { mailer, sendThemedOrderMail } = require('../utils/mailer');
const sms = require('../utils/smsService');

const buildOrderItemsHtml = (items = []) => {
    if (!items.length) return '<p style="margin:0;color:#374151">We have received your order.</p>';
    return `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #dbe3d5;color:#111827">Item</th>
            <th style="text-align:center;padding:10px;border-bottom:1px solid #dbe3d5;color:#111827">Qty</th>
            <th style="text-align:right;padding:10px;border-bottom:1px solid #dbe3d5;color:#111827">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid #eef2e8;color:#374151">${item.productName || 'Item'}</td>
              <td style="padding:10px;border-bottom:1px solid #eef2e8;color:#374151;text-align:center">${item.quantity || 1}</td>
              <td style="padding:10px;border-bottom:1px solid #eef2e8;color:#374151;text-align:right">₹${Number(item.finalPrice || item.salesPrice || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
};

const statusMeta = (status) => {
    const map = {
        Pending: { subject: 'Your order is pending', title: 'Order Received', intro: 'We have received your order and it is currently pending.', highlight: 'Order Update' },
        Confirmed: { subject: 'Your order has been confirmed', title: 'Order Confirmed', intro: 'Good news — your order has been confirmed by our team.', highlight: 'Order Update' },
        Shipped: { subject: 'Your order has been shipped', title: 'Order Shipped', intro: 'Your package is on the way to you now.', highlight: 'Shipment Update' },
        'Out for Delivery': { subject: 'Your order is out for delivery', title: 'Out for Delivery', intro: 'Your order is out for delivery and will reach you soon.', highlight: 'Shipment Update' },
        Delivered: { subject: 'Your order has been delivered', title: 'Order Delivered', intro: 'We are happy to let you know your order has been delivered.', highlight: 'Delivery Update' },
        Cancelled: { subject: 'Your order has been cancelled', title: 'Order Cancelled', intro: 'Your order has been cancelled. If this was unexpected, please contact support.', highlight: 'Order Update' },
    };
    return map[status] || map.Pending;
};

// 1. PLACE ORDER
exports.placeOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            customerId, totalAmount, discountAmount, couponId,
            paymentMethod, paymentStatus, paymentId, razorpayOrderId,
            items, shippingAddressId,
            shippingAmount, // state-wise shipping charge from frontend
            isGuestCheckout = false,
            guestDetails = {},
            invoiceType = 'CUSTOMER',
            businessName,
            businessGstin,
            billingAddress,
            billingState,
            billingPincode
        } = req.body;

        const guest = Boolean(isGuestCheckout);
        const guestEmail = String(guestDetails.email || '').trim().toLowerCase();
        const needsGstInvoice = invoiceType === 'BUSINESS_GST';
        const normalizedGstin = String(businessGstin || '').trim().toUpperCase();

        if (!guest && !customerId) {
            await t.rollback();
            return res.status(400).json({ error: 'customerId is required' });
        }
        if (!guest && String(req.customerId) !== String(customerId)) {
            await t.rollback();
            return res.status(403).json({ error: 'You can only place orders for your own account' });
        }
        if (guest && (!guestDetails.name || !/^\d{10}$/.test(String(guestDetails.phone || '').replace(/\D/g, '')) || !/^\S+@\S+\.\S+$/.test(guestEmail))) {
            await t.rollback();
            return res.status(400).json({ error: 'Guest name, valid phone, and email are required' });
        }
        if (needsGstInvoice) {
            const gstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalizedGstin);
            if (
                !String(businessName || '').trim()
                || !gstinValid
                || !String(billingAddress || '').trim()
                || !String(billingState || '').trim()
                || !/^\d{6}$/.test(String(billingPincode || '').trim())
            ) {
                await t.rollback();
                return res.status(400).json({ error: 'Enter valid business name, GSTIN, billing address, state, and 6-digit pincode.' });
            }
        }
        
        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ error: 'Order must have at least one item' });
        }

        // --------------------------------------------------------
        // Server-Side Price Calculation (Fix for Parameter Manipulation)
        // --------------------------------------------------------
        const { calculateServerOrderTotal } = require('../utils/priceHelper');
        let serverCalculatedTotal = Number(totalAmount); // fallback
        let serverDiscountAmount = Number(discountAmount); // fallback

        try {
            const orderCalc = await calculateServerOrderTotal(items, shippingAmount, couponId);
            serverCalculatedTotal = orderCalc.totalAmount;
            serverDiscountAmount = orderCalc.discountAmount;
            console.log(`[Place Order] Client Total: ${totalAmount}, Server Total: ${serverCalculatedTotal}`);
        } catch (calcError) {
            console.error('[Place Order] Error calculating server total:', calcError);
            await t.rollback();
            return res.status(400).json({ error: 'Error calculating order total on server' });
        }

        const customId = `SE-${Date.now()}`;

        let snapName = null, snapPhone = null, snapAddressLine = null;
        let snapCity = null, snapDistrict = null, snapState = null, snapPincode = null;

        const custRecord = guest ? null : await Customer.findByPk(customerId, { transaction: t });

        if (guest) {
            snapName = String(guestDetails.name || '').trim();
            snapPhone = String(guestDetails.phone || '').replace(/\D/g, '').slice(-10);
            snapAddressLine = String(guestDetails.addressLine || '').trim();
            snapCity = String(guestDetails.city || '').trim();
            snapDistrict = String(guestDetails.district || '').trim();
            snapState = String(guestDetails.state || '').trim();
            snapPincode = String(guestDetails.pincode || '').trim();
        } else if (shippingAddressId) {
            const addr = await ShippingAddress.findByPk(shippingAddressId, { transaction: t });
            if (addr) {
                snapName        = addr.name        || custRecord?.name  || null;
                snapPhone       = addr.phone       || custRecord?.phone || null;
                snapAddressLine = addr.addressLine || null;
                snapCity        = addr.city        || null;
                snapDistrict    = addr.district    || null;
                snapState       = addr.state       || null;
                snapPincode     = addr.pincode     || null;
            }
        }
        if (!snapName && custRecord) snapName = custRecord.name;
        if (!snapPhone && custRecord) snapPhone = custRecord.phone;

        const isPreorder = items.some(item => Boolean(item.isPreorder));
        await Order.create({
            orderId:           customId,
            customerId:        guest ? null : customerId,
            customerType:      guest ? 'GUEST' : 'REGISTERED',
            guestSessionId:    guest ? (guestDetails.guestSessionId || null) : null,
            guestEmail:        guest ? guestEmail : null,
            totalAmount:       serverCalculatedTotal,
            discountAmount:    serverDiscountAmount || 0,
            isPreorder,
            shippingAmount:    shippingAmount  || 0,   // ← NEW
            couponId:          couponId        || null,
            paymentMethod:     paymentMethod   || 'Online',
            paymentId:         paymentId       || null,
            razorpayOrderId:   razorpayOrderId || null,
            invoiceType:       needsGstInvoice ? 'BUSINESS_GST' : 'CUSTOMER',
            businessName:      needsGstInvoice ? String(businessName).trim() : null,
            businessGstin:     needsGstInvoice ? normalizedGstin : null,
            billingAddress:    needsGstInvoice ? String(billingAddress).trim() : null,
            billingState:      needsGstInvoice ? String(billingState).trim() : null,
            billingPincode:    needsGstInvoice ? String(billingPincode).trim() : null,
            orderStatus:       'Pending',
            paymentStatus:     paymentStatus || (paymentMethod === 'COD' ? 'Pending' : 'Paid'),
            shippingAddressId: shippingAddressId || null,
            snapName,
            snapPhone,
            snapAddressLine,
            snapCity,
            snapDistrict,
            snapState,
            snapPincode,
        }, { transaction: t });

        const itemsWithSnapshot = await Promise.all(items.map(async (item) => {
            const salesPrice = parseFloat(item.salesPrice);
            if (isNaN(salesPrice) || salesPrice <= 0)
                throw new Error(`Invalid salesPrice "${item.salesPrice}" for productId ${item.productId}`);

            const quantity = parseInt(item.quantity);
            if (isNaN(quantity) || quantity <= 0)
                throw new Error(`Invalid quantity "${item.quantity}" for productId ${item.productId}`);

            let productName  = item.productName  || null;
            let productImage = item.productImage || null;
            let variantLabel = item.variantLabel || null;
            let selectedSubOption = item.selectedSubOption || null;
            const itemIsPreorder = Boolean(item.isPreorder);

            if (!item.productId) {
                throw new Error('productId is required for every order item');
            }

            const product = await Product.findByPk(item.productId, {
                transaction: t,
                lock: t.LOCK.UPDATE
            });
            if (!product) {
                throw new Error(`Product not found with ID ${item.productId}`);
            }

            let inventoryItem = product;
            let inventoryName = `product "${product.name}"`;

            if (item.variantId) {
                const variant = await ProductVariant.findOne({
                    where: { id: item.variantId, productId: item.productId },
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                if (!variant) {
                    throw new Error('Selected variant does not belong to this product or no longer exists');
                }
                inventoryItem = variant;
                inventoryName = `selected variant "${variant.variantValue || variant.id}"`;
                if (!variantLabel) {
                    variantLabel = [variant.variantType, variant.variantValue].filter(Boolean).join(': ') || null;
                }
            } else {
                const variants = await ProductVariant.findAll({ where: { productId: item.productId }, transaction: t });
                const hasSelectableVariants = variants.some(v => v.variantType && v.variantValue);
                if (hasSelectableVariants) {
                    throw new Error(`Please select a variant for product "${product.name}"`);
                }
            }

            const availableStock = Number(inventoryItem.stock || 0);
            if (itemIsPreorder && availableStock > 0) {
                throw new Error(`${inventoryName} is available now and cannot be placed as a preorder`);
            }
            if (!itemIsPreorder && availableStock < quantity) {
                throw new Error(`Sufficient stock is not available for ${inventoryName}. Remaining stock: ${availableStock}`);
            }

            if (!itemIsPreorder) {
                await inventoryItem.update({
                    stock: availableStock - quantity,
                    salesStock: Number(inventoryItem.salesStock || 0) + quantity
                }, { transaction: t });
            }

            if (!productName) {
                productName = product.name;
                productImage = item.variantId && inventoryItem.mainImage ? inventoryItem.mainImage : product.mainImage;
            }

            const mrpPrice = (item.mrpPrice !== undefined && item.mrpPrice !== null) ? parseFloat(item.mrpPrice) : salesPrice;
            const gstPercent = Number(product.gstPercent || 0);
            const gst = gstPercent > 0
                ? breakdownFromFinalPrice(salesPrice, gstPercent, product.gstType)
                : { basePrice: salesPrice, gstPercent: 0, gstAmount: 0, finalPrice: salesPrice, gstType: product.gstType || null };

            return {
                orderId:      customId,
                productId:    item.productId || null,
                variantId:    item.variantId || null,
                selectedSubOption,
                isPreorder: itemIsPreorder,
                salesPrice,
                mrpPrice,
                basePrice: gst.basePrice,
                gstPercent: gst.gstPercent,
                gstAmount: gst.gstAmount,
                finalPrice: gst.finalPrice,
                gstType: gst.gstType,
                quantity,
                productName,
                productImage,
                variantLabel
            };
        }));

        await OrderSlot.bulkCreate(itemsWithSnapshot, { transaction: t });
        await t.commit();

        if (couponId) {
            await couponController.incrementUsage(couponId);
        }

        setImmediate(async () => {
            let customer = null;
            try {
                customer = guest ? { name: snapName, phone: snapPhone, email: guestEmail } : await Customer.findByPk(customerId);
                const orderItemsHtml = buildOrderItemsHtml(itemsWithSnapshot);
                await sendThemedOrderMail({
                    to: customer?.email,
                    subject: `Order Confirmation - ${customId}`,
                    title: 'Order Placed Successfully',
                    intro: `Hi ${customer?.name || 'Customer'}, your order has been placed successfully.`,
                    body: `
                        <p style="margin:0 0 14px;color:#374151">Your order ID is <strong>${customId}</strong>.</p>
                        ${orderItemsHtml}
                        <p style="margin:18px 0 0;color:#111827;font-weight:700">Total Paid: ₹${Number(totalAmount || 0).toFixed(2)}</p>
                        ${shippingAmount ? `<p style="margin:6px 0 0;color:#374151">Shipping: ₹${Number(shippingAmount || 0).toFixed(2)}</p>` : ''}
                    `,
                    footer: 'We will keep you updated with status changes, shipping, and delivery emails.',
                    ctaText: 'View Website',
                    ctaUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                    highlight: 'Order Confirmation'
                });
            } catch (mailErr) {
                console.error('Order confirmation mail error:', mailErr.message);
            }
            // SMS: Order placed
            try {
                if (customer?.phone) {
                    const smsResult = await sms.sendOrderPlacedSMS(customer.phone, customId);
                    if (!smsResult.success) {
                        console.error(`Order placed SMS rejected for order ${customId}:`, smsResult.error);
                    }
                }
            } catch (smsErr) {
                console.error('Order placed SMS error:', smsErr.message);
            }
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully!',
            order: { id: customId, orderId: customId }
        });

    } catch (err) {
        await t.rollback();
        console.error('Order Placement Error:', err.message);
        if (err.errors) err.errors.forEach(e => console.error('  Validation:', e.path, e.message));
        res.status(500).json({
            error:   err.message,
            details: err.errors?.map(e => ({ field: e.path, message: e.message })) || []
        });
    }
};

const resolveShipping = (order) => {
    if (order.snapAddressLine || order.snapCity) {
        return {
            name:        order.snapName        || order.Customer?.name || 'Guest',
            phone:       order.snapPhone       || order.Customer?.phone || null,
            addressLine: order.snapAddressLine || null,
            city:        order.snapCity        || null,
            district:    order.snapDistrict    || null,
            state:       order.snapState       || null,
            pincode:     order.snapPincode     || null,
        };
    }
    const s = order.orderShipping;
    if (s) {
        return {
            name:        s.name        || order.Customer?.name || 'Guest',
            phone:       s.phone       || order.Customer?.phone || null,
            addressLine: s.addressLine || null,
            city:        s.city        || null,
            district:    s.district    || null,
            state:       s.state       || null,
            pincode:     s.pincode     || null,
        };
    }
    const addr = order.Customer?.CustomerAddresses?.[0];
    if (addr) {
        return {
            name:        order.Customer?.name  || 'Guest',
            phone:       order.Customer?.phone || null,
            addressLine: [addr.houseNo, addr.street].filter(Boolean).join(', '),
            city:        addr.city     || null,
            district:    addr.district || null,
            state:       addr.state    || null,
            pincode:     addr.pincode  || null,
        };
    }
    return null;
};

// 2. GET ALL ORDERS (Admin)
exports.getAllOrders = async (req, res) => {
    try {
        const { status, search, page = 1, filter, customerId, startDate, endDate, paymentMethod, invoiceType } = req.query;
        const limit  = Math.min(Math.max(Number(req.query.limit) || 10, 1), 1000);
        const offset = (Number(page) - 1) * limit;

        let whereCondition = {};
        if (status && status !== 'All') whereCondition.orderStatus = status;
        if (paymentMethod && paymentMethod !== 'All') {
            if (paymentMethod === 'Online') {
                whereCondition.paymentMethod = { [Op.or]: ['Online Payment', 'Online', 'Online Payment (HDFC)', 'HDFC'] };
            } else if (paymentMethod === 'COD') {
                whereCondition.paymentMethod = { [Op.or]: ['COD', 'Cash on Delivery', 'Cash On Delivery'] };
            } else {
                whereCondition.paymentMethod = paymentMethod;
            }
        }
        if (req.query.preorder === 'true') whereCondition.isPreorder = true;
        if (req.query.cancellationOnly === 'true') whereCondition.cancellationStatus = 'Requested';
        if (customerId) whereCondition.customerId = customerId;
        if (invoiceType === 'BUSINESS_GST') whereCondition.invoiceType = 'BUSINESS_GST';
        if (search) whereCondition.orderId = { [Op.like]: `%${search}%` };

        if (filter === 'today') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            if (status === 'Delivered') {
                whereCondition.updatedAt = { [Op.between]: [startOfDay, endOfDay] };
            } else {
                whereCondition.createdAt = { [Op.between]: [startOfDay, endOfDay] };
            }
        } else if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) {
                const s = new Date(startDate);
                s.setHours(0, 0, 0, 0);
                dateFilter[Op.gte] = s;
            }
            if (endDate) {
                const e = new Date(endDate);
                e.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = e;
            }
            whereCondition.createdAt = dateFilter;
        }

        const { count, rows } = await Order.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: Customer,
                    attributes: ['id', 'name', 'email', 'phone'],
                    paranoid: false,
                    include: [{ model: CustomerAddress, required: false, paranoid: false }]
                },
                { model: ShippingAddress, as: 'orderShipping', required: false },
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{ model: Product, attributes: ['name', 'mainImage'], required: false, paranoid: false }]
                },
                { model: Coupon, as: 'appliedCoupon', required: false }
            ],
            limit, offset, distinct: true,
            order: [['createdAt', 'DESC']]
        });

        const ordersWithSnap = rows.map(o => {
            const plain = o.toJSON();
            plain.shippingSnapshot = resolveShipping(o);
            if (plain.Customer && plain.Customer.email) {
                plain.Customer.email = plain.Customer.email.replace(/_deleted_d+/, '');
            }
            return plain;
        });

        res.json({
            orders:      ordersWithSnap,
            totalPages:  Math.ceil(count / limit),
            totalOrders: count
        });

    } catch (error) {
        console.error('Fetch Orders Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// 3. GET ORDERS BY CUSTOMER
exports.getOrdersByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        const orders = await Order.findAll({
            where: { customerId },
            include: [
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{
                        model: Product,
                        attributes: ['name', 'mainImage'],
                        required: false,
                        paranoid: false
                    }]
                },
                { model: ShippingAddress, as: 'orderShipping', required: false },
                { model: Coupon, as: 'appliedCoupon', required: false }
            ],
            order: [['createdAt', 'DESC']]
        });

        const orderIds = orders.map(o => o.orderId);

        const existingReviews = await Review.findAll({
            where: {
                customerId,
                orderId: { [Op.in]: orderIds }
            },
            attributes: ['id', 'orderId', 'productId', 'rating', 'feedback']
        });

        // Map key: "orderId_productId" -> { id, rating, feedback }
        const reviewsMap = {};
        existingReviews.forEach(r => {
            reviewsMap[`${r.orderId}_${r.productId}`] = {
                id: r.id,
                rating: r.rating,
                feedback: r.feedback
            };
        });

        const formatted = orders.map(o => ({
            id:                 o.orderId,
            orderId:            o.orderId,
            createdAt:          o.createdAt,
            status:             o.orderStatus,
            orderStatus:        o.orderStatus,
            courierPartner:     o.courierPartner,
            awb_code:           o.awb_code,
            tracking_url:       o.tracking_url,
            cancellationStatus: o.cancellationStatus,
            cancellationReason: o.cancellationReason,
            totalAmount:        o.totalAmount,
            discountAmount:     o.discountAmount  || 0,
            shippingAmount:     o.shippingAmount  || 0,
            paymentMethod:      o.paymentMethod,
            paymentStatus:      o.paymentStatus,
            invoiceType:        o.invoiceType || 'CUSTOMER',
            businessName:       o.businessName || null,
            businessGstin:      o.businessGstin || null,
            billingAddress:     o.billingAddress || null,
            billingState:       o.billingState || null,
            billingPincode:     o.billingPincode || null,
            couponCode:         o.appliedCoupon?.code || null,
            shippingSnapshot:   resolveShipping(o),
            items: (o.slots || []).map(slot => {
                const reviewData = reviewsMap[`${o.orderId}_${slot.productId}`];
                return {
                    productId:    slot.productId,
                    productName:  slot.Product?.name      || slot.productName  || `Product #${slot.productId || '?'}`,
                    productImage: slot.Product?.mainImage || slot.productImage || null,
                    variantLabel: slot.variantLabel || null,
                    selectedSubOption: slot.selectedSubOption || null,
                    quantity:     slot.quantity,
                    salesPrice:   slot.salesPrice,
                    mrpPrice:     slot.mrpPrice || slot.salesPrice,
                    basePrice:    slot.basePrice,
                    gstPercent:   slot.gstPercent,
                    gstAmount:    slot.gstAmount,
                    finalPrice:   slot.finalPrice || slot.salesPrice,
                    gstType:      slot.gstType,
                    hasReview:    !!reviewData,
                    _reviewId:     reviewData?.id || null,
                    _reviewRating: reviewData?.rating || null,
                    _reviewText:   reviewData?.feedback || null
                };
            })
        }));

        res.json(formatted);

    } catch (error) {
        console.error('Customer Orders Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// 4. UPDATE ORDER STATUS (Admin)
exports.updateStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { orderStatus } = req.body;
        const { id } = req.params;

        const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(orderStatus))
            return res.status(400).json({ error: 'Invalid status value' });

        const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        if (order.orderStatus === 'Cancelled' && orderStatus !== 'Cancelled') {
            await t.rollback();
            return res.status(400).json({ error: 'Cancelled orders cannot be reactivated. Create a new order instead.' });
        }

        if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            const slots = await OrderSlot.findAll({ where: { orderId: id }, transaction: t });
            for (const slot of slots) {
                // Pre-booking orders never deducted inventory when placed,
                // so cancelling them must never add inventory back.
                if (slot.isPreorder) continue;
                const model = slot.variantId ? ProductVariant : Product;
                const inventoryItem = await model.findByPk(slot.variantId || slot.productId, {
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                if (!inventoryItem) continue;
                const quantity = Number(slot.quantity || 0);
                await inventoryItem.update({
                    stock: Number(inventoryItem.stock || 0) + quantity,
                    salesStock: Math.max(0, Number(inventoryItem.salesStock || 0) - quantity)
                }, { transaction: t });
            }
        }
        if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
            if (order.courierPartner === 'Shiprocket' && order.shiprocket_order_id) {
                const shiprocketService = require('../services/shiprocketService');
                try {
                    await shiprocketService.cancelOrder(order.shiprocket_order_id);
                } catch(err) { console.error('Shiprocket cancel err:', err.message); }
            } else if (order.courierPartner === 'DTDC' && order.awb_code) {
                const dtdcService = require('../services/dtdcService');
                try {
                    await dtdcService.cancelOrder(order.awb_code);
                } catch(err) { console.error('DTDC cancel err:', err.message); }
            }
        }

        await order.update({ orderStatus }, { transaction: t });
        await t.commit();

        setImmediate(async () => {
            let customer = null;
            try {
                customer = await Customer.findByPk(order.customerId);
                const meta = statusMeta(orderStatus);
                await sendThemedOrderMail({
                    to: customer?.email,
                    subject: meta.subject,
                    title: meta.title,
                    intro: `Hi ${customer?.name || 'Customer'}, ${meta.intro}`,
                    body: `
                        <p style="margin:0 0 12px;color:#374151">Order ID: <strong>${order.orderId || id}</strong></p>
                        <p style="margin:0;color:#111827">Current Status: <strong>${orderStatus}</strong></p>
                    `,
                    footer: 'You will receive a new email whenever your order moves to the next step.',
                    ctaText: 'Track Your Order',
                    ctaUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                    highlight: meta.highlight
                });

            } catch (mailErr) {
                console.error(`Order status mail failed for order ${id}:`, mailErr.message);
            }

            try {
                // Send SMS notifications for the approved Confirmed and Shipped templates.
                const customerPhone = order.snapPhone || customer?.phone;
                if (customerPhone) {
                    const orderIdStr = order.orderId || id;
                    let smsResult = null;
                    if (orderStatus === 'Confirmed') {
                        smsResult = await sms.sendOrderConfirmedSMS(customerPhone, orderIdStr, order.totalAmount);
                    } else if (orderStatus === 'Shipped') {
                        smsResult = await sms.sendOrderShippedSMS(customerPhone, orderIdStr);
                    }
                    if (smsResult && !smsResult.success) {
                        console.error(`Order status SMS rejected for order ${id}:`, smsResult.error);
                    }
                }
            } catch (smsErr) {
                console.error(`Order status SMS failed for order ${id}:`, smsErr.message);
            }
        });

        if (orderStatus === 'Delivered') {
            setImmediate(async () => {
                try {
                    const { sendDeliveryReviewMail } = require('./customerController');
                    const fakeReq = { params: { orderId: id } };
                    const fakeRes = {
                        json:   () => {},
                        status: () => ({ json: () => {} }),
                    };
                    await sendDeliveryReviewMail(fakeReq, fakeRes);
                    console.log(` Delivery mail sent for order ${id}`);
                } catch (mailErr) {
                    console.error(` Delivery mail failed for order ${id}:`, mailErr.message);
                }
            });
        }

        res.json({ success: true, message: `Order status updated to ${orderStatus}` });

    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

// 5. DELETE ORDER
exports.deleteOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) {
            await t.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        await OrderSlot.destroy({ where: { orderId: id }, transaction: t });
        await Review.update({ orderId: null }, { where: { orderId: id }, transaction: t });
        await order.destroy({ transaction: t });
        await t.commit();

        res.json({ success: true, message: 'Order and its history deleted successfully' });
    } catch (err) {
        await t.rollback();
        res.status(500).json({ error: err.message });
    }
};

// 6. DASHBOARD RECENT ORDERS
exports.getRecentOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: Customer,        attributes: ['id', 'name', 'email', 'phone'], required: false, paranoid: false },
                { model: ShippingAddress, as: 'orderShipping',                          required: false },
                {
                    model: OrderSlot,
                    as: 'slots',
                    required: false,
                    include: [{ model: Product, attributes: ['name'], required: false, paranoid: false }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        const ordersWithSnap = orders.map(o => {
            const plain = o.toJSON();
            plain.shippingSnapshot = resolveShipping(o);
            if (plain.Customer && plain.Customer.email) {
                plain.Customer.email = plain.Customer.email.replace(/_deleted_d+/, '');
            }
            return plain;
        });

        res.json({ orders: ordersWithSnap });
    } catch (error) {
        console.error('Recent Orders Error:', error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
};

exports.requestCancellation = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const order = await Order.findOne({ where: { orderId: id } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        if (order.cancellationStatus === 'Requested' || order.orderStatus === 'Cancelled') {
            return res.status(400).json({ success: false, error: 'Cancellation already requested or order is already cancelled' });
        }

        await order.update({
            cancellationStatus: 'Requested',
            cancellationReason: reason
        });

        res.status(200).json({ success: true, message: 'Cancellation requested successfully' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.approveCancellation = async (req, res) => {
    const sequelize = require('../config/db');
    const { Product, ProductVariant, OrderSlot } = require('../models');
    
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { action } = req.body; // 'Approve' or 'Reject'
        const order = await Order.findOne({
            where: { orderId: id },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        
        if (!order) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        if (action === 'Reject') {
            await order.update({ cancellationStatus: 'Rejected' }, { transaction: t });
            await t.commit();
            return res.status(200).json({ success: true, message: 'Cancellation rejected' });
        }

        if (action === 'Approve') {
            if (order.orderStatus === 'Cancelled' || order.cancellationStatus === 'Approved') {
                await t.rollback();
                return res.status(400).json({ success: false, error: 'This cancellation has already been approved.' });
            }
            // Cancel with courier if assigned
            if (order.courierPartner === 'Shiprocket' && order.shiprocket_order_id) {
                const shiprocketService = require('../services/shiprocketService');
                try {
                    await shiprocketService.cancelOrder(order.shiprocket_order_id);
                } catch(err) { console.error('Shiprocket cancel err:', err.message); }
            } else if (order.courierPartner === 'DTDC' && order.awb_code) {
                const dtdcService = require('../services/dtdcService');
                try {
                    await dtdcService.cancelOrder(order.awb_code);
                } catch(err) { console.error('DTDC cancel err:', err.message); }
            }

            // Restore stock
            const slots = await OrderSlot.findAll({ where: { orderId: order.orderId }, transaction: t });
            for (let item of slots) {
                if (!item.isPreorder) {
                    if (item.variantId) {
                        const variant = await ProductVariant.findByPk(item.variantId, { transaction: t, lock: t.LOCK.UPDATE });
                        if (variant) {
                            await variant.update({
                                stock: Number(variant.stock || 0) + Number(item.quantity || 0),
                                salesStock: Math.max(0, Number(variant.salesStock || 0) - Number(item.quantity || 0))
                            }, { transaction: t });
                        }
                    } else {
                        const product = await Product.findByPk(item.productId, { transaction: t, lock: t.LOCK.UPDATE });
                        if (product) {
                            await product.update({
                                stock: Number(product.stock || 0) + Number(item.quantity || 0),
                                salesStock: Math.max(0, Number(product.salesStock || 0) - Number(item.quantity || 0))
                            }, { transaction: t });
                        }
                    }
                }
            }

            await order.update({
                orderStatus: 'Cancelled',
                cancellationStatus: 'Approved'
            }, { transaction: t });
            await t.commit();
            return res.status(200).json({ success: true, message: 'Cancellation approved and stock restored' });
        }

        await t.rollback();
        res.status(400).json({ success: false, error: 'Invalid action' });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ success: false, error: e.message });
    }
};

// ============================================================
// COURIER SETTLEMENT & SHIPPING COST TRACKING
// ============================================================

exports.updateCourierSettlement = async (req, res) => {
    try {
        const { orderIds, courierPaymentStatus, courierShippingCost } = req.body;

        if (!Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, error: 'orderIds array is required' });
        }

        if (!['Paid', 'Unpaid'].includes(courierPaymentStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid courierPaymentStatus. Use Paid or Unpaid.' });
        }

        const updateData = {
            courierPaymentStatus,
            courierSettlementDate: courierPaymentStatus === 'Paid' ? new Date() : null
        };

        if (courierShippingCost !== undefined) {
            updateData.courierShippingCost = Number(courierShippingCost);
        }

        await Order.update(updateData, {
            where: {
                orderId: orderIds
            }
        });

        res.status(200).json({
            success: true,
            message: `Successfully updated settlement status to ${courierPaymentStatus} for ${orderIds.length} orders.`
        });
    } catch (error) {
        console.error('Update Settlement Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getCourierSettlementSummary = async (req, res) => {
    try {
        const { range, startDate, endDate, courierPartner } = req.query;
        let dateFilter = '';
        const replacements = {};

        if (range === 'weekly') {
            dateFilter = 'AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        } else if (range === 'monthly') {
            dateFilter = 'AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        } else if (range === 'yearly') {
            dateFilter = 'AND createdAt >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
        } else if (range === 'custom' && startDate && endDate) {
            dateFilter = 'AND createdAt BETWEEN :startDate AND :endDate';
            replacements.startDate = new Date(startDate);
            replacements.endDate = new Date(endDate);
        }

        let partnerFilter = '';
        if (courierPartner) {
            partnerFilter = 'AND courierPartner = :courierPartner';
            replacements.courierPartner = courierPartner;
        }

        const query = `
            SELECT 
                courierPartner,
                COUNT(*) AS totalOrders,
                COALESCE(SUM(courierShippingCost), 0) AS totalCost,
                COALESCE(SUM(CASE WHEN courierPaymentStatus = 'Paid' THEN courierShippingCost ELSE 0 END), 0) AS totalPaid,
                COALESCE(SUM(CASE WHEN courierPaymentStatus = 'Unpaid' THEN courierShippingCost ELSE 0 END), 0) AS totalPending
            FROM orders
            WHERE courierPartner IS NOT NULL ${dateFilter} ${partnerFilter}
            GROUP BY courierPartner
        `;

        const summary = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const detailsQuery = `
            SELECT 
                orderId,
                customerId,
                totalAmount,
                orderStatus,
                courierPartner,
                awb_code,
                courierShippingCost,
                courierPaymentStatus,
                courierSettlementDate,
                createdAt
            FROM orders
            WHERE courierPartner IS NOT NULL ${dateFilter} ${partnerFilter}
            ORDER BY createdAt DESC
        `;

        const orders = await sequelize.query(detailsQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.status(200).json({
            success: true,
            summary,
            orders
        });
    } catch (error) {
        console.error('Settlement Summary Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
