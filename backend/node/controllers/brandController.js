const Brand = require('../models/Brand');
const fs = require('fs');
const path = require('path');

// 1. ADD BRAND
exports.addBrand = async (req, res) => {
    try {
        const { name, description } = req.body || {};
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Brand name is required" });
        }
        const brand = await Brand.create({
            name: name.trim(),
            description: description || null,
            image: req.file ? req.file.filename : null 
        });
        res.status(201).json({ message: "Brand Added Successfully! ", brand });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. GET ALL BRANDS
exports.getAllBrands = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;

        if (page) {
            const offset = (page - 1) * limit;
            const { count, rows } = await Brand.findAndCountAll({
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            return res.status(200).json({
                success: true,
                brands: rows,
                totalCount: count,
                totalPages: Math.ceil(count / limit)
            });
        }

        const brands = await Brand.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(brands);
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// 3. GET SINGLE BRAND
exports.getSingleBrand = async (req, res) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (!brand) return res.status(404).json({ message: "Brand not found!" });
        res.json(brand);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. UPDATE BRAND
exports.updateBrand = async (req, res) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (!brand) return res.status(404).json({ message: "Brand not found!" });

        let updatedData = { ...req.body };
        if (req.file) {
           
            if (brand.image) {
                const oldPath = path.join(__dirname, '../uploads/', brand.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            updatedData.image = req.file.filename;
        }

        await brand.update(updatedData);
        res.json({ message: "Brand Updated! ", brand });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. DELETE BRAND
exports.deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (brand && brand.image) {
            const filePath = path.join(__dirname, '../uploads/', brand.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Brand.destroy({ where: { id: req.params.id } });
        res.json({ message: "Brand and Image Deleted! " });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};