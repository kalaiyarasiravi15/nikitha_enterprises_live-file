const SubCategory = require('../models/SubCategory');
const fs = require('fs');
const path = require('path');

// 1. ADD SUB-CATEGORY 
exports.addSubCategory = async (req, res) => {
    try {
        const { name, categoryId } = req.body; 
        
        const subCategory = await SubCategory.create({
            name,
            categoryId, 
            image: req.file ? req.file.filename : null
        });
        res.status(201).json({ message: "Sub-Category Created!", subCategory });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. GET ALL SUB-CATEGORIES
exports.getAllSubCategories = async (req, res) => {
    try {
        const subCategories = await SubCategory.findAll();
        res.json(subCategories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. GET SINGLE SUB-CATEGORY
exports.getSingleSubCategory = async (req, res) => {
    try {
        const sub = await SubCategory.findByPk(req.params.id);
        if (!sub) return res.status(404).json({ message: "Not Found" });
        res.json(sub);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE SUB-CATEGORY
exports.deleteSubCategory = async (req, res) => {
    try {
        const sub = await SubCategory.findByPk(req.params.id);
        if (sub && sub.image) {
            const filePath = path.join(__dirname, '../uploads/', sub.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await SubCategory.destroy({ where: { id: req.params.id } });
        res.json({ message: "Sub-Category Deleted Entirely!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};