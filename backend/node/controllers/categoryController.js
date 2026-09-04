const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const {
    sequelize, Category, Review, Product, OrderSlot, ProductVariant,
    Cart, Wishlist, BestSeller, TrendingProduct, NewArrival, TopRatedProduct,
    Thumbnail, ProductSpecification
} = require('../models');
const { Sequelize } = require('sequelize');

// 1. Add Category
exports.addCategory = async (req, res) => {
    try {
        const { name, status } = req.body || {};
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Category name is required" });
        }
        const image = req.file ? req.file.filename : null;
        let activeStatus = true;
        if (status !== undefined) {
            activeStatus = (status === 'true' || status === true);
        }
        const category = await Category.create({ ...req.body, name: name.trim(), image, status: activeStatus });
        res.status(201).json(category);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 2. Get All Categories 
exports.getAllCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;

        if (page) {
            const offset = (page - 1) * limit;
            const { count, rows } = await Category.findAndCountAll({
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            return res.status(200).json({
                success: true,
                categories: rows,
                totalCount: count,
                totalPages: Math.ceil(count / limit)
            });
        }

        const categories = await Category.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// 3. Get Single Category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const cat = await Category.findByPk(req.params.id, {
            attributes: {
                include: [[
                    Sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM products AS p
                        WHERE p.categoryId = Category.id AND p.deletedAt IS NULL ${isAdmin ? '' : 'AND p.status = 1'}
                    )`),
                    'productCount'
                ]]
            }
        });
        if (!cat) return res.status(404).json({ message: "Category not found" });
        if (!isAdmin && !cat.status) return res.status(404).json({ message: "Category not found" });
        res.json(cat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Update Category
exports.updateCategory = async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ message: "Category not found" });
        let updatedData = { ...req.body };
        if (req.body.status !== undefined) {
            updatedData.status = (req.body.status === 'true' || req.body.status === true);
        }
        if (req.file) updatedData.image = req.file.filename;
        await cat.update(updatedData);
        res.json({ message: "Category updated successfully", cat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.deleteCategory = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const cat = await Category.findByPk(req.params.id, { transaction: t });
        if (!cat) {
            await t.rollback();
            return res.status(404).json({ message: 'Category not found' });
        }

        const products = await Product.findAll({
            where: { categoryId: cat.id },
            include: [{ model: ProductVariant, as: 'variants' }],
            transaction: t
        });

        let productIds = [];
        let thumbnails = [];
        if (products.length > 0) {
            productIds = products.map(p => p.id);
            const variantIds = products.flatMap(p => (p.variants || []).map(v => v.id));

            // Fetch thumbnails before destroying them so we can clean up disk files
            thumbnails = await Thumbnail.findAll({
                where: { productId: { [Op.in]: productIds } },
                transaction: t
            });

            const slots = await OrderSlot.findAll({
                where: {
                    [Op.or]: [
                        { productId: { [Op.in]: productIds } },
                        ...(variantIds.length ? [{ variantId: { [Op.in]: variantIds } }] : [])
                    ]
                },
                transaction: t
            });

            for (const slot of slots) {
                const product = products.find(p => p.id === slot.productId);
                const variant = (product?.variants || []).find(v => v.id === slot.variantId);
                await slot.update({
                    productName:  slot.productName  || (product ? product.name      : null) || null,
                    productImage: slot.productImage || (product ? product.mainImage : null) || null,
                    variantLabel: slot.variantLabel || [variant?.variantType, variant?.variantValue].filter(Boolean).join(': ') || null,
                }, { transaction: t });
            }

            const allReviews = await Review.findAll({
                where: { productId: { [Op.in]: productIds } },
                transaction: t
            });
            for (const review of allReviews) {
                if (review.orderId) await review.update({ orderId: null }, { transaction: t });
                await review.destroy({ transaction: t });
            }

            // Explicitly destroy referencing records in Cart, Wishlist, and collections
            await Cart.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await Wishlist.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await BestSeller.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await TrendingProduct.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await NewArrival.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await TopRatedProduct.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });

            // Explicitly destroy child records
            await Thumbnail.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await ProductVariant.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await ProductSpecification.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });



            // Destroy products
            await Product.destroy({ where: { categoryId: cat.id }, transaction: t });
        }

        // Destroy category inside the transaction
        await cat.destroy({ transaction: t });

        await t.commit();

        // Safe disk deletion after successful database commit
        const safeUnlink = (filename) => {
            if (!filename) return;
            const p = path.join(__dirname, '../uploads', filename);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        };

        // Delete category image
        safeUnlink(cat.image);

        // Keep product main images on disk for order history, only delete category image, thumbnails, and brochures
        // for (const prod of products) {
        //     safeUnlink(prod.mainImage);
        // }
        for (const thumb of thumbnails) {
            safeUnlink(thumb.image);
        }


        res.json({
            message: 'Category and its products deleted successfully. Order history is preserved.',
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};
