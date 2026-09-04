const Banner = require('../models/Banner');
const fs = require('fs');
const path = require('path');

const getFilePath = (filename) => path.join(process.cwd(), 'uploads', filename);

// 1. ADD BANNER
exports.addBanner = async (req, res) => {
    try {
        const { title, subtitle, buttonText, link, status } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!image) {
            return res.status(400).json({ message: "Image required!" });
        }

        const banner = await Banner.create({ 
            title, 
            subtitle, 
            buttonText, 
            image, 
            link,
            status: status !== undefined ? (status === 'true' || status === true) : true
        });

        res.status(201).json({ message: "Banner Added Successfully!", banner });
    } catch (e) {
   
        if (req.file) {
            const tempPath = getFilePath(req.file.filename);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        res.status(500).json({ error: e.message });
    }
};

// 2. GET ALL BANNERS
exports.getBanners = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const query = { order: [['createdAt', 'DESC']] };
        if (!isAdmin) {
            query.where = { status: true };
        }
        const banners = await Banner.findAll(query);
        res.json(banners);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

// 3. GET SINGLE BANNER
exports.getSingleBanner = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: "Banner not found" });
        res.json(banner);
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};

// 4. UPDATE BANNER
exports.updateBanner = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: "Banner not found" });

        const { title, subtitle, buttonText, link, status } = req.body;
        let imageName = banner.image;

        
        if (req.file) {
            const oldPath = getFilePath(banner.image);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            imageName = req.file.filename;
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (subtitle !== undefined) updateData.subtitle = subtitle;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        if (link !== undefined) updateData.link = link;
        if (status !== undefined) updateData.status = (status === 'true' || status === true);
        if (imageName) updateData.image = imageName;

        await banner.update(updateData);

        res.json({ message: "Banner Updated Successfully!", banner });
    } catch (e) {
        if (req.file) {
            const tempPath = getFilePath(req.file.filename);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
        res.status(500).json({ error: e.message });
    }
};

// 5. DELETE BANNER
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findByPk(req.params.id);
        if (!banner) return res.status(404).json({ message: "Banner not found" });

     
        const imgPath = getFilePath(banner.image);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

        await banner.destroy();
        res.json({ message: "Banner Deleted Permanently!" });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
};