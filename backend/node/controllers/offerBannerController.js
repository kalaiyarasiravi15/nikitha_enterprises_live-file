const { Op } = require('sequelize');
const OfferBanner = require('../models/OfferBanner');
const fs = require('fs');
const path = require('path');

// 1. ADD
exports.addOfferBanner = async (req, res) => {
    try {
        const { title, subtitle, buttonText, link, discountTag, productId, discountPercentage, startDate, expiryDate, status, discountType, discountValue, targetAudience } = req.body;
        const image = req.file ? req.file.filename : null;
        if (!image) return res.status(400).json({ message: "Image required!" });

        const pid = productId && productId !== 'null' && productId !== '' ? parseInt(productId) : null;
        if (!Number.isInteger(pid)) {
            return res.status(400).json({ message: 'Select a product for this offer banner.' });
        }
        const Product = require('../models/Product');
        const targetProduct = await Product.findByPk(pid);
        if (!targetProduct) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        const pct = discountPercentage ? parseInt(discountPercentage) : 0;
        const start = startDate && startDate !== 'null' && startDate !== '' ? new Date(startDate) : null;
        const exp = expiryDate && expiryDate !== 'null' && expiryDate !== '' ? new Date(expiryDate) : null;
        const activeStatus = status !== undefined ? (status === 'true' || status === true) : true;

        if (activeStatus && pid) {
            await OfferBanner.update({ status: false }, { where: { productId: pid, status: true } });
        }
        const dType = discountType || 'PERCENTAGE';
        const dValue = discountValue ? parseFloat(discountValue) : 0.00;
        const tAudience = targetAudience || 'ALL';

        const ob = await OfferBanner.create({ 
            title, subtitle, buttonText, image, link: `/product/${pid}`, discountTag,
            productId: pid,
            discountPercentage: pct,
            startDate: start,
            expiryDate: exp,
            status: activeStatus,
            discountType: dType,
            discountValue: dValue,
            targetAudience: tAudience
        });
        res.status(201).json({ message: "Offer Banner Added!", offerBanner: ob });
    } catch (e) {
        if (req.file) fs.unlinkSync(path.join(process.cwd(), 'uploads', req.file.filename));
        res.status(500).json({ error: e.message });
    }
};

// 2. GET ALL (Public)
exports.getOfferBanners = async (req, res) => {
    try {
        const { audience } = req.query;
        const now = new Date();

        // Auto de-activate expired ones
        await OfferBanner.update(
            { status: false },
            {
                where: {
                    status: true,
                    expiryDate: { [Op.lte]: now }
                }
            }
        );

        const audienceFilter = ['ALL'];
        if (audience) {
            audienceFilter.push(audience);
        }

        const obs = await OfferBanner.findAll({ 
            where: { 
                status: true,
                productId: { [Op.ne]: null },
                expiryDate: { [Op.gt]: now },
                targetAudience: { [Op.in]: audienceFilter }
            }, 
            order: [['createdAt', 'DESC']] 
        });
        res.json(obs);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2b. GET ALL (Admin)
exports.getAllOfferBanners = async (req, res) => {
    try {
        const now = new Date();
        // Auto de-activate expired ones
        await OfferBanner.update(
            { status: false },
            {
                where: {
                    status: true,
                    expiryDate: { [Op.lte]: now }
                }
            }
        );

        const obs = await OfferBanner.findAll({ order: [['createdAt', 'DESC']] });
        res.json(obs);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 3. GET SINGLE
exports.getSingleOfferBanner = async (req, res) => {
    try {
        const ob = await OfferBanner.findByPk(req.params.id);
        if (!ob) return res.status(404).json({ message: "Not found" });
        res.json(ob);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. UPDATE
exports.updateOfferBanner = async (req, res) => {
    try {
        const ob = await OfferBanner.findByPk(req.params.id);
        if (!ob) return res.status(404).json({ message: "Not found" });

        const { title, subtitle, buttonText, link, discountTag, productId, discountPercentage, startDate, expiryDate, status, discountType, discountValue, targetAudience } = req.body;
        let image = ob.image;

        if (req.file) {
            const oldImgPath = path.join(process.cwd(), 'uploads', ob.image);
            if (fs.existsSync(oldImgPath)) fs.unlinkSync(oldImgPath);
            image = req.file.filename;
        }

        const pid = productId !== undefined ? (productId && productId !== 'null' && productId !== '' ? parseInt(productId) : null) : Number(ob.productId);
        if (!Number.isInteger(pid)) {
            return res.status(400).json({ message: 'Select a product for this offer banner.' });
        }
        const Product = require('../models/Product');
        const targetProduct = await Product.findByPk(pid);
        if (!targetProduct) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        const pct = discountPercentage !== undefined ? parseInt(discountPercentage) : ob.discountPercentage;
        const start = startDate !== undefined ? (startDate && startDate !== 'null' && startDate !== '' ? new Date(startDate) : null) : ob.startDate;
        const exp = expiryDate !== undefined ? (expiryDate && expiryDate !== 'null' && expiryDate !== '' ? new Date(expiryDate) : null) : ob.expiryDate;
        const activeStatus = status !== undefined ? (status === 'false' || status === false ? false : true) : ob.status;

        if (activeStatus && (Number(ob.productId) !== Number(pid) || !ob.status)) {
            await OfferBanner.update({
                status: false
            }, {
                where: {
                    productId: pid,
                    status: true,
                    id: { [Op.ne]: ob.id }
                }
            });
        }
        const dType = discountType !== undefined ? discountType : ob.discountType;
        const dValue = discountValue !== undefined ? parseFloat(discountValue) : ob.discountValue;
        const tAudience = targetAudience !== undefined ? targetAudience : ob.targetAudience;

        const updateData = { image };
        if (title !== undefined) updateData.title = title;
        if (subtitle !== undefined) updateData.subtitle = subtitle;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        updateData.link = `/product/${pid}`;
        if (discountTag !== undefined) updateData.discountTag = discountTag;
        if (productId !== undefined) updateData.productId = pid;
        if (discountPercentage !== undefined) updateData.discountPercentage = pct;
        if (startDate !== undefined) updateData.startDate = start;
        if (expiryDate !== undefined) updateData.expiryDate = exp;
        if (status !== undefined) updateData.status = activeStatus;
        if (discountType !== undefined) updateData.discountType = dType;
        if (discountValue !== undefined) updateData.discountValue = dValue;
        if (targetAudience !== undefined) updateData.targetAudience = tAudience;

        await ob.update(updateData);
        res.json({ message: "Offer Banner Updated!", offerBanner: ob });
    } catch (e) {
        if (req.file) fs.unlinkSync(path.join(process.cwd(), 'uploads', req.file.filename));
        res.status(500).json({ error: e.message });
    }
};

// 5. DELETE
exports.deleteOfferBanner = async (req, res) => {
    try {
        const ob = await OfferBanner.findByPk(req.params.id);
        if (!ob) return res.status(404).json({ message: "Not found" });
        
        const imgPath = path.join(process.cwd(), 'uploads', ob.image);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        
        await ob.destroy();
        res.json({ message: "Offer Banner Deleted!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
