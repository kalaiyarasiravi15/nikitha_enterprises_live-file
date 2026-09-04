const { BestSeller, TrendingProduct, NewArrival, TopRatedProduct, Product, Category, ProductVariant, Thumbnail, ProductSpecification } = require('../models');
const { getActiveDiscountContext, formatProductWithDiscounts } = require('../utils/priceHelper');

const productInclude = [
    { model: Category,       as: 'category',   attributes: ['id', 'name'] },
    { model: ProductVariant, as: 'variants' },
    { model: Thumbnail,      as: 'thumbnails', attributes: ['id', 'image'] },
    { model: ProductSpecification, as: 'specifications', attributes: ['id', 'heading', 'description', 'sortOrder'] }
];

const formatCollectionItem = (item, context, isAdmin = false) => {
    const raw = item.toJSON();
    if (!raw.product) return raw;
    
    const p = raw.product;

    let variants = p.variants || [];
    if (!isAdmin) {
        variants = variants.filter(v => v.status !== false);
    }

    const inventoryVariants = variants.filter(v => v.variantType && v.variantValue);
    const totalStock = inventoryVariants.length > 0
        ? inventoryVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
        : Number(p.stock || 0);

    const totalSalesStock = inventoryVariants.length > 0
        ? inventoryVariants.reduce((sum, v) => sum + Number(v.salesStock || 0), 0)
        : Number(p.salesStock || 0);

    variants = variants.map(v => ({
        ...v,
        mrpPrice:   v.mrpPrice   !== null ? Number(v.mrpPrice)   : null,
        salesPrice: v.salesPrice !== null ? Number(v.salesPrice) : null,
        stock:      Number(v.stock || 0),
        salesStock: Number(v.salesStock || 0),
    }));

    const base = {
        ...p,
        mrpPrice:     p.mrpPrice   !== null ? Number(p.mrpPrice)   : null,
        salesPrice:   p.salesPrice !== null ? Number(p.salesPrice) : null,
        stock:        p.stock      !== null ? Number(p.stock)      : 0,
        salesStock:   p.salesStock !== null ? Number(p.salesStock) : 0,
        variants,
        totalStock,
        totalSalesStock,
    };

    raw.product = formatProductWithDiscounts(base, context);
    return raw;
};

// ── GET ALL THREE COLLECTIONS ──
exports.getAllCollections = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const productQuery = { model: Product, as: 'product', include: productInclude };
        if (!isAdmin) productQuery.where = { status: true };

        const [bestSellers, trending, newArrivals, topRated] = await Promise.all([
            BestSeller.findAll({ include: [productQuery], order: [['addedAt', 'DESC']] }),
            TrendingProduct.findAll({ include: [productQuery], order: [['addedAt', 'DESC']] }),
            NewArrival.findAll({ include: [productQuery], order: [['addedAt', 'DESC']] }),
            TopRatedProduct.findAll({ include: [productQuery], order: [['addedAt', 'DESC']] })
        ]);
        const context = await getActiveDiscountContext();
        res.json({
            bestSellers: bestSellers.map(item => formatCollectionItem(item, context, isAdmin)),
            trending: trending.map(item => formatCollectionItem(item, context, isAdmin)),
            newArrivals: newArrivals.map(item => formatCollectionItem(item, context, isAdmin)),
            topRated: topRated.map(item => formatCollectionItem(item, context, isAdmin))
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GET BEST SELLERS ──
exports.getBestSellers = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const productQuery = { model: Product, as: 'product', include: productInclude };
        if (!isAdmin) productQuery.where = { status: true };

        const data = await BestSeller.findAll({
            include: [productQuery],
            order: [['addedAt', 'DESC']]
        });
        const context = await getActiveDiscountContext();
        res.json(data.map(item => formatCollectionItem(item, context, isAdmin)));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GET TRENDING ──
exports.getTrending = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const productQuery = { model: Product, as: 'product', include: productInclude };
        if (!isAdmin) productQuery.where = { status: true };

        const data = await TrendingProduct.findAll({
            include: [productQuery],
            order: [['addedAt', 'DESC']]
        });
        const context = await getActiveDiscountContext();
        res.json(data.map(item => formatCollectionItem(item, context, isAdmin)));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GET NEW ARRIVALS ──
exports.getNewArrivals = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const productQuery = { model: Product, as: 'product', include: productInclude };
        if (!isAdmin) productQuery.where = { status: true };

        const data = await NewArrival.findAll({
            include: [productQuery],
            order: [['addedAt', 'DESC']]
        });
        const context = await getActiveDiscountContext();
        res.json(data.map(item => formatCollectionItem(item, context, isAdmin)));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── GET TOP RATED ──
exports.getTopRated = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const productQuery = { model: Product, as: 'product', include: productInclude };
        if (!isAdmin) productQuery.where = { status: true };

        const data = await TopRatedProduct.findAll({
            include: [productQuery],
            order: [['addedAt', 'DESC']]
        });
        const context = await getActiveDiscountContext();
        res.json(data.map(item => formatCollectionItem(item, context, isAdmin)));
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── UPDATE COLLECTIONS FOR A PRODUCT ──
exports.updateProductCollections = async (productId, { isBestSeller, isTrending, isNewArrival, isTopRated }) => {
    // BestSeller
    if (isBestSeller === true || isBestSeller === 'true') {
        await BestSeller.findOrCreate({ where: { productId } });
    } else {
        await BestSeller.destroy({ where: { productId } });
    }

    // Trending
    if (isTrending === true || isTrending === 'true') {
        await TrendingProduct.findOrCreate({ where: { productId } });
    } else {
        await TrendingProduct.destroy({ where: { productId } });
    }

    // New Arrival
    if (isNewArrival === true || isNewArrival === 'true') {
        await NewArrival.findOrCreate({ where: { productId } });
    } else {
        await NewArrival.destroy({ where: { productId } });
    }

    // Top Rated
    if (isTopRated === true || isTopRated === 'true') {
        await TopRatedProduct.findOrCreate({ where: { productId } });
    } else {
        await TopRatedProduct.destroy({ where: { productId } });
    }
};

// ── REMOVE FROM COLLECTION (Admin manual remove)
exports.removeFromBestSeller = async (req, res) => {
    try {
        await BestSeller.destroy({ where: { productId: req.params.productId } });
        res.json({ success: true, message: 'Removed from Best Sellers' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeFromTrending = async (req, res) => {
    try {
        await TrendingProduct.destroy({ where: { productId: req.params.productId } });
        res.json({ success: true, message: 'Removed from Trending' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeFromNewArrival = async (req, res) => {
    try {
        await NewArrival.destroy({ where: { productId: req.params.productId } });
        res.json({ success: true, message: 'Removed from New Arrivals' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeFromTopRated = async (req, res) => {
    try {
        await TopRatedProduct.destroy({ where: { productId: req.params.productId } });
        res.json({ success: true, message: 'Removed from Top Rated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
