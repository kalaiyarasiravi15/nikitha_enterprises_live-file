const Coupon = require('../models/Coupon');
const { Order, OrderSlot, Customer, Product } = require('../models');
const { Op, literal } = require('sequelize');

const buildCouponDescription = ({ type, discountValue, targetType }) => {
    const discount = type === 'flat' ? '₹' + discountValue + ' off' : discountValue + '% off';
    return targetType === 'PRODUCT'
        ? 'Get ' + discount + ' on the selected product.'
        : 'Get ' + discount + ' on all products.';
};

const getEligibleAmount = (coupon, items, fallbackAmount) => {
    const safeItems = Array.isArray(items) ? items : [];
    if (coupon.targetType !== 'PRODUCT') return Number(fallbackAmount || 0);
    return safeItems
        .filter(item => Number(item.productId ?? item.id) === Number(coupon.productId))
        .reduce((sum, item) => sum + Number(item.price ?? item.salesPrice ?? 0) * Number(item.quantity || 1), 0);
};

// 1. CREATE COUPON

// 1. CREATE COUPON
exports.createCoupon = async (req, res) => {
    try {
        const { code, startDate, endDate, targetType, productId } = req.body;
        if (code) req.body.code = code.toUpperCase();
        req.body.description = buildCouponDescription(req.body);

        if (new Date(startDate) > new Date(endDate))
            return res.status(400).json({ error: 'Start date cannot be later than end date' });

        req.body.minOrderAmount = 0;
        req.body.maxOrderAmount = null;
        req.body.targetType = targetType === 'PRODUCT' ? 'PRODUCT' : 'SHOP';
        req.body.productId = req.body.targetType === 'PRODUCT' ? Number(productId) || null : null;
        if (req.body.targetType === 'PRODUCT' && !req.body.productId)
            return res.status(400).json({ error: 'Select a product for this coupon.' });
        if (req.body.productId && !await Product.findByPk(req.body.productId))
            return res.status(400).json({ error: 'The selected product no longer exists.' });

        const coupon = await Coupon.create(req.body);
        res.status(201).json({ message: 'Coupon Created Successfully! ', coupon });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError')
            return res.status(400).json({ error: 'This coupon code already exists!' });
        res.status(500).json({ error: error.message });
    }
};

// 2. VALIDATE COUPON (Checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.body;
        // Never use shipping or the checkout grand total for coupon eligibility.
        // `orderAmount` remains as a legacy fallback for older storefront builds.
        const productSubtotal = req.body.productSubtotal ?? req.body.orderAmount;
        const currentDate = new Date();

        if (!code || productSubtotal === undefined || productSubtotal === null)
            return res.status(400).json({ message: 'Coupon code and product subtotal are required' });

        const coupon = await Coupon.findOne({
            where: {
                code:      code.toUpperCase(),
                status:    true,
                startDate: { [Op.lte]: currentDate },
                endDate:   { [Op.gte]: currentDate }
            }
        });

        if (!coupon)
            return res.status(404).json({ message: 'Invalid or Expired Coupon! ' });

        //  Usage limit check
        if (coupon.usedCount >= coupon.usageLimit)
            return res.status(400).json({ message: `Coupon usage limit reached! (${coupon.usedCount}/${coupon.usageLimit})` });

        const currentAmount = getEligibleAmount(coupon, req.body.items, productSubtotal);
        if (!Number.isFinite(currentAmount) || currentAmount < 0)
            return res.status(400).json({ message: 'A valid product subtotal is required' });

        if (coupon.targetType === 'PRODUCT' && currentAmount <= 0)
            return res.status(400).json({ message: 'This coupon is valid only for its selected product in your cart.' });

        // Calculate discount
        let discount = 0;
        const val = parseFloat(coupon.discountValue);

        if (coupon.type === 'percentage') {
            discount = (currentAmount * val) / 100;
        } else {
            discount = val;
        }

        if (discount > currentAmount) discount = currentAmount;
        if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
            discount = Number(coupon.maxDiscount);
        }
        const roundedDiscount = Math.round(discount);

        res.json({
            success: true,
            message: `Coupon Applied! You saved ₹${roundedDiscount.toLocaleString('en-IN')} `,
            data: {
                couponId:       coupon.id,
                code:           coupon.code,
                discountAmount: roundedDiscount,
                finalAmount:    Math.round(currentAmount - roundedDiscount),
                usageLeft:      coupon.usageLimit - coupon.usedCount 
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. GET VISIBLE COUPONS (Checkout suggestions — active and unexpired only)
exports.getVisibleCoupons = async (req, res) => {
    try {
        // `orderAmount` is retained only for compatibility with older clients.
        const currentDate = new Date();
        const productIds = String(req.query.productIds || '').split(',').map(Number).filter(Number.isFinite);
        const isGlobal = req.query.global === 'true';

        let targetWhere = {};
        if (!isGlobal) {
            targetWhere = productIds.length
                ? { [Op.or]: [{ targetType: 'SHOP' }, { targetType: 'PRODUCT', productId: { [Op.in]: productIds } }] }
                : { targetType: 'SHOP' };
        }

        const coupons = await Coupon.findAll({
            where: {
                status:    true,
                startDate: { [Op.lte]: currentDate },
                endDate:   { [Op.gte]: currentDate },
                [Op.and]: [
                    literal('`Coupon`.`usedCount` < `Coupon`.`usageLimit`'),
                    targetWhere
                ]
            },
            order: [['createdAt', 'DESC']],
            attributes: [
                'id', 'code', 'description', 'type',
                'discountValue', 'targetType', 'productId',
                'maxDiscount', 'endDate', 'usedCount', 'usageLimit' 
            ],
            include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'mainImage'], required: false }]
        });

        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. TOGGLE STATUS
exports.toggleStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        coupon.status = !coupon.status;
        await coupon.save();
        res.json({ message: `Coupon is now ${coupon.status ? 'Active' : 'Inactive'}`, status: coupon.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. INCREMENT USAGE — internal function (never auto-deletes)
exports.incrementUsage = async (couponId) => {
    try {
        const coupon = await Coupon.findByPk(couponId);
        if (!coupon) return;

        if (coupon.usedCount < coupon.usageLimit) {
            await coupon.increment('usedCount', { by: 1 });
            await coupon.reload();

            // Auto-disable when limit reached (do not delete)
            if (coupon.usedCount >= coupon.usageLimit) {
                await coupon.update({ status: false });
                console.log(`Coupon ${coupon.code} auto-disabled — limit reached`);
            }
        }
    } catch (error) {
        console.error('Coupon Increment Error:', error.message);
    }
};

// 6. GET ALL COUPONS (Admin - keeps expired coupons marked as inactive/expired)
exports.getAllCoupons = async (req, res) => {
    try {
        const currentDate = new Date();
        const coupons = await Coupon.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'mainImage'], required: false }]
        });
        
        const formatted = coupons.map(c => {
            const json = c.toJSON();
            const isExpired = new Date(c.endDate) < currentDate;
            return {
                ...json,
                isExpired,
                effectiveStatus: isExpired ? false : json.status
            };
        });

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. DELETE COUPON
exports.deleteCoupon = async (req, res) => {
    try {
        await Coupon.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Coupon deleted successfully! ' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 8. UPDATE COUPON
exports.getCouponUsage = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
        const orders = await Order.findAll({
            where: { couponId: coupon.id },
            include: [
                { model: Customer, attributes: ['id', 'name', 'email', 'phone'], paranoid: false },
                { model: OrderSlot, as: 'slots', attributes: ['productName', 'variantLabel', 'quantity', 'salesPrice'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ coupon: { id: coupon.id, code: coupon.code, usedCount: coupon.usedCount }, orders });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        const { code, startDate, endDate, targetType, productId } = req.body;
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

        if (code) req.body.code = code.toUpperCase();
        req.body.description = buildCouponDescription({ ...coupon.toJSON(), ...req.body });

        if (startDate && endDate && new Date(startDate) > new Date(endDate))
            return res.status(400).json({ error: 'Start date cannot be later than end date' });

        req.body.minOrderAmount = 0;
        req.body.maxOrderAmount = null;
        req.body.targetType = targetType === 'PRODUCT' ? 'PRODUCT' : 'SHOP';
        req.body.productId = req.body.targetType === 'PRODUCT' ? Number(productId) || null : null;
        if (req.body.targetType === 'PRODUCT' && !req.body.productId)
            return res.status(400).json({ error: 'Select a product for this coupon.' });
        if (req.body.productId && !await Product.findByPk(req.body.productId))
            return res.status(400).json({ error: 'The selected product no longer exists.' });

        await coupon.update(req.body);
        res.json({ message: 'Coupon Updated Successfully!', coupon });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError')
            return res.status(400).json({ error: 'This coupon code already exists!' });
        res.status(500).json({ error: error.message });
    }
};
