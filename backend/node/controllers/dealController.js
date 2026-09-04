const { Op } = require('sequelize');
const Deal = require('../models/Deal');

// GET: /api/deals/active
exports.getActiveDeal = async (req, res) => {
    try {
        const { audience } = req.query; // 'NEW_CUSTOMER' or 'REGULAR_CUSTOMER'
        const now = new Date();

        // Automatically deactivate expired active deals
        await Deal.update(
            { isActive: false },
            {
                where: {
                    isActive: true,
                    expiryDate: { [Op.lte]: now }
                }
            }
        );

        // Build target audience filter
        const audienceFilter = ['ALL'];
        if (audience) {
            audienceFilter.push(audience);
        }

        const deals = await Deal.findAll({
            where: { 
                isActive: true,
                expiryDate: { [Op.gt]: now },
                targetAudience: { [Op.in]: audienceFilter }
            },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(deals);
    } catch (err) {
        res.status(500).json({ message: "Error fetching deal", error: err.message });
    }
};

// POST: /api/deals/add
exports.addDeal = async (req, res) => {
    try {
        const { title, description, startDate, expiryDate, buttonText, buttonLink, discountPercentage, isActive, discountType, discountValue, targetAudience, targetType, targetProductId } = req.body || {};

        const activeStatus = isActive !== undefined ? (isActive === 'true' || isActive === true) : true;
        const type = targetType === 'PRODUCT' ? 'PRODUCT' : 'SHOP';
        const prodId = (targetProductId && targetProductId !== 'null' && targetProductId !== '') ? parseInt(targetProductId) : null;
        const now = new Date();
        if (type === 'PRODUCT' && !Number.isInteger(prodId)) {
            return res.status(400).json({ message: 'Select a product for this deal.' });
        }
        const Product = require('../models/Product');
        const targetProd = type === 'PRODUCT' ? await Product.findByPk(prodId) : null;
        if (type === 'PRODUCT' && !targetProd) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }

        let bannerImage = req.file ? req.file.filename : null;

        // Fallback: If no custom banner uploaded, check if product has a mainImage
        if (!bannerImage && targetProd?.mainImage) {
            bannerImage = targetProd.mainImage;
        }

        if (!bannerImage) {
            bannerImage = 'default_banner.png';
        }

        if (activeStatus && type === 'SHOP') {
            const existingShopDeal = await Deal.findOne({
                where: { isActive: true, targetType: 'SHOP', expiryDate: { [Op.gt]: now } }
            });
            if (existingShopDeal) {
                return res.status(400).json({ message: 'An Entire Shop deal is already active. Deactivate it before creating another shop-wide deal.' });
            }
        } else if (activeStatus && type === 'PRODUCT') {
            const existingProductDeal = await Deal.findOne({
                where: { isActive: true, targetType: 'PRODUCT', targetProductId: prodId, expiryDate: { [Op.gt]: now } }
            });
            if (existingProductDeal) {
                return res.status(400).json({ message: 'An active deal already exists for this specific product. Please deactivate it first.' });
            }
        }

        const newDeal = await Deal.create({
            title: title || "Deal of the Day",
            description,
            startDate,
            expiryDate,
            buttonText: buttonText || "SHOP NOW",
            buttonLink: type === 'PRODUCT' ? `/product/${prodId}` : (buttonLink || '/shop'),
            discountPercentage: discountPercentage ? parseInt(discountPercentage) : 0,
            discountType: discountType || 'PERCENTAGE',
            discountValue: discountValue ? parseFloat(discountValue) : 0.00,
            targetAudience: targetAudience || 'ALL',
            targetType: type,
            targetProductId: prodId,
            image: bannerImage, 
            isActive: activeStatus
        });

        res.status(201).json({
            success: true,
            message: "New Deal of the Day activated successfully!",
            data: newDeal
        });
    } catch (err) {
        console.error("Add Deal Error:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
};

// DELETE: /api/deals/:id
exports.deleteDeal = async (req, res) => {
    try {
        const { id } = req.params;
        await Deal.destroy({ where: { id } });
        res.status(200).json({ message: "Deal removed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT: /api/deals/update/:id
exports.updateDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, startDate, expiryDate, buttonText, buttonLink, discountPercentage, isActive, discountType, discountValue, targetAudience } = req.body;

        const deal = await Deal.findByPk(id); 
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        deal.title = title !== undefined ? title : deal.title;
        deal.description = description !== undefined ? description : deal.description;
        deal.startDate = startDate !== undefined ? startDate : deal.startDate;
        deal.expiryDate = expiryDate !== undefined ? expiryDate : deal.expiryDate;
        deal.buttonText = buttonText !== undefined ? buttonText : deal.buttonText;
        deal.buttonLink = buttonLink !== undefined ? buttonLink : deal.buttonLink;
        deal.discountPercentage = discountPercentage !== undefined ? parseInt(discountPercentage) : deal.discountPercentage;
        deal.discountType = discountType !== undefined ? discountType : deal.discountType;
        deal.discountValue = discountValue !== undefined ? parseFloat(discountValue) : deal.discountValue;
        deal.targetAudience = targetAudience !== undefined ? targetAudience : deal.targetAudience;
        const nextTargetType = req.body.targetType === 'PRODUCT' ? 'PRODUCT' : 'SHOP';
        const parsedTargetId = nextTargetType === 'PRODUCT'
            ? (req.body.targetProductId !== undefined
                ? (req.body.targetProductId === 'null' || !req.body.targetProductId ? null : parseInt(req.body.targetProductId))
                : Number(deal.targetProductId))
            : null;
        if (nextTargetType === 'PRODUCT' && !Number.isInteger(parsedTargetId)) {
            return res.status(400).json({ message: 'Select a product for this deal.' });
        }
        const Product = require('../models/Product');
        const targetProduct = nextTargetType === 'PRODUCT' ? await Product.findByPk(parsedTargetId) : null;
        if (nextTargetType === 'PRODUCT' && !targetProduct) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        deal.targetType = nextTargetType;
        deal.targetProductId = parsedTargetId;
        deal.buttonLink = nextTargetType === 'PRODUCT' ? `/product/${parsedTargetId}` : (buttonLink || '/shop');
        
        if (isActive !== undefined) {
            deal.isActive = isActive === 'true' || isActive === true;
        }

        const type = deal.targetType;
        const prodId = deal.targetProductId;
        const now = new Date();

        if (deal.isActive && type === 'SHOP') {
            const existingShopDeal = await Deal.findOne({
                where: { isActive: true, targetType: 'SHOP', id: { [Op.ne]: id }, expiryDate: { [Op.gt]: now } }
            });
            if (existingShopDeal) {
                return res.status(400).json({ message: 'An Entire Shop deal is already active. Deactivate it before activating another shop-wide deal.' });
            }
        } else if (deal.isActive && type === 'PRODUCT') {
            const existingProductDeal = await Deal.findOne({
                where: { isActive: true, targetType: 'PRODUCT', targetProductId: prodId, id: { [Op.ne]: id }, expiryDate: { [Op.gt]: now } }
            });
            if (existingProductDeal) {
                return res.status(400).json({ message: "An active deal already exists for this specific product. Please deactivate it first." });
            }
        }

        if (req.file) deal.image = req.file.filename;

        await deal.save();

        res.status(200).json({
            success: true,
            message: "Deal updated successfully!",
            data: deal
        });
    } catch (err) {
        res.status(500).json({ message: "Update failed", error: err.message });
    }
};

// GET: /api/deals/all (Admin)
exports.getAllDeals = async (req, res) => {
    try {
        const now = new Date();
        // Automatically deactivate expired active deals
        await Deal.update(
            { isActive: false },
            {
                where: {
                    isActive: true,
                    expiryDate: { [Op.lte]: now }
                }
            }
        );

        const deals = await Deal.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(deals);
    } catch (err) {
        res.status(500).json({ message: "Error fetching all deals", error: err.message });
    }
};
