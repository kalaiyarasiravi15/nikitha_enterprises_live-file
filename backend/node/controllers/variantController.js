const { ProductVariant } = require('../models');

// 1. CREATE - Bulk Add Variants
exports.addVariants = async (req, res) => {
    try {
        const variants = await ProductVariant.bulkCreate(req.body.variants);
        res.status(201).json({ success: true, data: variants });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2. GET ALL - Get all variants
exports.getAllVariants = async (req, res) => {
    try {
        const variants = await ProductVariant.findAll();
        res.json(variants);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 3. GET ONE - Particular Variant by ID
exports.getVariantById = async (req, res) => {
    try {
        const variant = await ProductVariant.findByPk(req.params.id);
        if (!variant) return res.status(404).json({ message: "Variant not found" });
        res.json(variant);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. UPDATE - Particular Variant
exports.updateVariant = async (req, res) => {
    try {
        const variant = await ProductVariant.findByPk(req.params.id);
        if (!variant) return res.status(404).json({ message: "Variant not found" });
        await variant.update(req.body);
        res.json({ success: true, message: "Variant Updated", data: variant });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 5. DELETE - Particular Variant
exports.deleteVariant = async (req, res) => {
    try {
        await ProductVariant.destroy({ where: { id: req.params.id } });
        res.json({ success: true, message: "Variant Deleted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};