const { Thumbnail } = require('../models');
const fs = require('fs');
const path = require('path');

// 1. CREATE - Add Thumbnails
exports.addThumbnails = async (req, res) => {
    try {
        const productId = req.body.productId;
        const thumbData = req.files.map(file => ({ image: file.filename, productId }));
        await Thumbnail.bulkCreate(thumbData);
        res.status(201).json({ success: true, message: "Thumbnails Added!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2. GET ALL - All thumbnails in system
exports.getAllThumbnails = async (req, res) => {
    try {
        const thumbs = await Thumbnail.findAll();
        res.json(thumbs);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 3. GET ONE - Particular Thumbnail info
exports.getThumbnailById = async (req, res) => {
    try {
        const thumb = await Thumbnail.findByPk(req.params.id);
        if (!thumb) return res.status(404).json({ message: "Image not found" });
        res.json(thumb);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. DELETE - Delete Particular Image & File
exports.deleteThumbnail = async (req, res) => {
    try {
        const thumb = await Thumbnail.findByPk(req.params.id);
        if (thumb) {
            
            const filePath = path.join(__dirname, '../uploads/', thumb.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            
           
            await thumb.destroy();
            res.json({ success: true, message: "Image File & Record Deleted" });
        } else {
            res.status(404).json({ message: "Thumbnail not found" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
};