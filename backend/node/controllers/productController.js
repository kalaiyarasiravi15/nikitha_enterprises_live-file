const {
    Product, ProductVariant, ProductSpecification, Thumbnail,
    Category, Brand, BestSeller, TrendingProduct, NewArrival, TopRatedProduct,
    OrderSlot, Review, Cart, Wishlist, sequelize
} = require('../models');
const { updateProductCollections } = require('./collectionController');
const { Op } = require('sequelize');
const fs   = require('fs');
const path = require('path');
const { getActiveDiscountContext, formatProductWithDiscounts } = require('../utils/priceHelper');
const { calculateGstPrice } = require('../utils/gstHelper');

const MAX_PRODUCT_THUMBNAILS = 15;

const hasValue = (value) => value !== undefined && value !== null && value !== '' && value !== 'null' && value !== 'undefined';

const validatePricePair = (mrpValue, salesValue, label = 'Product', required = false) => {
    const hasMrp = hasValue(mrpValue);
    const hasSales = hasValue(salesValue);

    if (!hasMrp && !hasSales && !required) return null;
    if (!hasMrp || !hasSales) return `${label} MRP and Sales Price are required.`;

    const mrp = Number(mrpValue);
    const sales = Number(salesValue);
    if (!Number.isFinite(mrp) || mrp <= 0) return `${label} MRP must be a positive number.`;
    if (!Number.isFinite(sales) || sales <= 0) return `${label} Sales Price must be a positive number.`;
    if (sales >= mrp) return `${label} Sales Price must be lower than MRP.`;
    return null;
};

const parseJsonArray = (value) => {
    if (!value) return [];
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
};

const withCapacityImages = (subOptions, files, fieldPrefix) => {
    const options = Array.isArray(subOptions) ? subOptions : [];
    return options.map((option, index) => {
        const value = typeof option === 'object' && option !== null ? option.value : option;
        const existingImage = typeof option === 'object' && option !== null ? option.image : null;
        const uploadedImage = files?.find(file => file.fieldname === fieldPrefix + index);
        return {
            value: value || '',
            image: uploadedImage ? uploadedImage.filename : (existingImage || null)
        };
    });
};

const validateVariantPrices = (defaultVariants = [], variantGroups = []) => {
    for (let index = 0; index < defaultVariants.length; index += 1) {
        const error = validatePricePair(defaultVariants[index].mrpPrice, defaultVariants[index].salesPrice, `Variant ${index + 1}`);
        if (error) return error;
    }

    for (const group of variantGroups) {
        const values = Array.isArray(group.values) ? group.values : [];
        for (let index = 0; index < values.length; index += 1) {
            const error = validatePricePair(values[index].mrpPrice, values[index].salesPrice, `${group.variantType || 'Variant'} ${index + 1}`);
            if (error) return error;
        }
    }
    return null;
};


const generateSlug = (name) => {
    return (name || 'product')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const parseOptionalField = (val) => {
    if (val === undefined || val === null || val === '' || val === 'null' || val === 'undefined') {
        return null;
    }
    return val;
};

const makeUniqueSlug = async (baseName, excludeId = null) => {
    const base = generateSlug(baseName);
    let slug = base;
    let counter = 2;
    while (true) {
        const where = { slug };
        if (excludeId) where.id = { [Op.ne]: excludeId };
        const existing = await Product.findOne({ where, paranoid: false });
        if (!existing) return slug;
        slug = `${base}-${counter}`;
        counter++;
    }
};

/* ─── shared include array ─── */
const fullInclude = [
    { model: Category,        as: 'category',   attributes: ['id', 'name'] },
    { model: Brand,           as: 'brand',      attributes: ['id', 'name'] },
    { model: ProductVariant,  as: 'variants' },
    { model: Thumbnail,       as: 'thumbnails', attributes: ['id', 'image'] },
    { model: ProductSpecification, as: 'specifications', attributes: ['id', 'heading', 'description', 'sortOrder'] },
    { model: BestSeller,      as: 'bestSeller', attributes: ['id'] },
    { model: TrendingProduct, as: 'trending',   attributes: ['id'] },
    { model: NewArrival,      as: 'newArrival', attributes: ['id'] },
    { model: TopRatedProduct, as: 'topRated',   attributes: ['id'] },
];

const formatProduct = (p, isAdmin = false) => {
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

    variants = variants.map(v => {
        let parsedThumbs = [];
        try {
            parsedThumbs = typeof v.thumbnails === 'string' ? JSON.parse(v.thumbnails) : (v.thumbnails || []);
        } catch (err) { parsedThumbs = []; }

        let parsedSpecs = [];
        try {
            parsedSpecs = typeof v.specifications === 'string' ? JSON.parse(v.specifications) : (v.specifications || []);
        } catch (err) { parsedSpecs = []; }

        let parsedSubOptions = [];
        try {
            parsedSubOptions = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []);
        } catch (err) { parsedSubOptions = []; }

        return {
            ...v,
            mrpPrice:   v.mrpPrice   !== null ? Number(v.mrpPrice)   : null,
            salesPrice: v.salesPrice !== null ? Number(v.salesPrice) : null,
            stock:      Number(v.stock || 0),
            salesStock: Number(v.salesStock || 0),
            thumbnails: parsedThumbs,
            specifications: parsedSpecs,
            subOptions: parsedSubOptions
        };
    });

    const specifications = (p.specifications || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return {
        ...p,
        mrpPrice:     p.mrpPrice   !== null ? Number(p.mrpPrice)   : null,
        salesPrice:   p.salesPrice !== null ? Number(p.salesPrice) : null,
        basePrice:    p.basePrice != null ? Number(p.basePrice) : null,
        gstPercent:   p.gstPercent != null ? Number(p.gstPercent) : null,
        gstAmount:    p.gstAmount != null ? Number(p.gstAmount) : null,
        finalPrice:   p.finalPrice != null ? Number(p.finalPrice) : null,
        gstType:      p.gstType || null,
        stock:        p.stock      !== null ? Number(p.stock)      : 0,
        salesStock:   p.salesStock !== null ? Number(p.salesStock) : 0,
        thumbVideo:   p.thumbVideo || null,
        variants,
        specifications,
        totalStock,
        totalSalesStock,
        status:       p.status !== undefined ? p.status : true,
        isBestSeller: !!p.bestSeller,
        isTrending:   !!p.trending,
        isNewArrival: !!p.newArrival,
        isTopRated:   !!p.topRated,
    };
};

const formatSingle = (p, isAdmin = false) => {
    const base = formatProduct(p, isAdmin);
    return {
        ...base,
        slug: p.slug || generateSlug(p.name),
    };
};


// --- 1. GET ALL PRODUCTS ---
exports.getAllProducts = async (req, res) => {
    try {
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;
        
        const query = {
            include: fullInclude,
            order: [['createdAt', 'DESC']]
        };
        if (!isAdmin) {
            query.where = { status: true };
        }

        if (page && isAdmin) {
            query.limit = limit;
            query.offset = (page - 1) * limit;
            const { count, rows } = await Product.findAndCountAll(query);
            return res.status(200).json({
                products: rows.map(p => formatProduct(p.toJSON(), true)),
                totalProducts: count,
                totalPages: Math.ceil(count / limit)
            });
        }

        const products = await Product.findAll(query);
        
        if (isAdmin) {
            return res.status(200).json(products.map(p => formatProduct(p.toJSON(), true)));
        }
        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(products.map(p => {
            const base = formatProduct(p.toJSON(), false);
            return formatProductWithDiscounts(base, context);
        }));
    } catch (e) {
        console.error('Error fetching products:', e);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// --- 2. GET SINGLE PRODUCT BY ID ---
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, { include: fullInclude });
        if (!product) return res.status(404).json({ message: 'Product Not Found' });
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const base = formatSingle(product.toJSON(), isAdmin);
        if (!isAdmin && base.status === false) {
            return res.status(404).json({ message: 'Product Not Found' });
        }
        if (isAdmin) {
            return res.status(200).json(base);
        }
        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(formatProductWithDiscounts(base, context));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

exports.getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // First: try exact slug match (normal case)
        let product = await Product.findOne({
            where: { slug },
            include: fullInclude
        });

        if (!product) {
            const allProducts = await Product.findAll({
                where: { slug: null },
                include: fullInclude
            });
            product = allProducts.find(p => generateSlug(p.name) === slug) || null;
        }

        if (!product) return res.status(404).json({ message: 'Product Not Found' });

        const isAdmin = req.headers['x-admin-request'] === 'true';
        const formatted = formatSingle(product.toJSON(), isAdmin);

        if (!isAdmin && formatted.status === false) {
            return res.status(404).json({ message: 'Product Not Found' });
        }

        if (!product.slug) {
            await product.update({ slug: formatted.slug }).catch(() => {});
        }

        if (isAdmin) {
            return res.status(200).json(formatted);
        }

        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(formatProductWithDiscounts(formatted, context));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 3. CREATE PRODUCT ---
exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, categoryId, brandId, mrpPrice, salesPrice, enteredPrice, gstType, gstPercent, stock, status,
            showVariants, defaultVariantType, defaultVariantValue,
            variants, specifications,
            isBestSeller, isTrending, isNewArrival, isTopRated
        } = req.body || {};

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Product name is required.' });
        }
        const priceError = validatePricePair(mrpPrice, salesPrice, 'Product', true);
        if (priceError) return res.status(400).json({ success: false, error: priceError });

        const isVar = showVariants === 'true' || showVariants === true;
        const submittedDefaultVariants = parseJsonArray(req.body.defaultVariants);
        const submittedVariantGroups = parseJsonArray(variants);
        if (isVar) {
            const variantPriceError = validateVariantPrices(submittedDefaultVariants, submittedVariantGroups);
            if (variantPriceError) return res.status(400).json({ success: false, error: variantPriceError });
        }

        const mainImageFile = req.files?.find(f => f.fieldname === 'mainImage');
        const mainImage = mainImageFile ? mainImageFile.filename : null;

        const thumbFiles = req.files?.filter(f => f.fieldname === 'thumbnails') || [];

        const thumbVideoFile = req.files?.find(f => f.fieldname === 'thumbVideo');
        const thumbVideo = thumbVideoFile ? thumbVideoFile.filename : null;

        const slug = await makeUniqueSlug(name);

        const gst = gstType && gstPercent
            ? calculateGstPrice({ enteredPrice: salesPrice, gstType, gstPercent })
            : null;

        // MRP and Sales Price are customer-facing values. GST fields are saved
        // separately for invoice breakdown and must never overwrite the sale price.
        const product = await Product.create({
            name, slug, description, categoryId, mainImage, thumbVideo,
            brandId:    parseOptionalField(brandId),
            mrpPrice:   parseOptionalField(mrpPrice),
            salesPrice: parseOptionalField(salesPrice),
            ...(gst || {}),
            stock:      stock || 0,
            status: status !== undefined ? (status === 'true' || status === true) : true
        });

        // ── Main product thumbnails ──
        const thumbData = thumbFiles.slice(0, MAX_PRODUCT_THUMBNAILS).map(file => ({
            image: file.filename, productId: product.id
        }));
        await Thumbnail.bulkCreate(thumbData);

        // ── Specifications (min 3 required, max 30) ──
        if (specifications) {
            const parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
            if (!Array.isArray(parsedSpecs) || parsedSpecs.length < 3) {
                await product.destroy();
                return res.status(400).json({ success: false, error: 'Please provide at least 3 product specifications.' });
            }
            const specData = parsedSpecs.slice(0, 30).map((f, idx) => ({
                productId:   product.id,
                heading:     f.heading     || null,
                description: f.description || null,
                sortOrder:   f.sortOrder   !== undefined ? f.sortOrder : idx
            }));
            await ProductSpecification.bulkCreate(specData);
        } else {
            await product.destroy();
            return res.status(400).json({ success: false, error: 'Please provide at least 3 product specifications.' });
        }

        // ── Create Variants if enabled ──
        if (isVar) {
            // 1. Create Default Variants (Variant 1 with multiple rows for each dimension, all under groupId = 1)
            const mainThumbsList = thumbFiles.slice(0, MAX_PRODUCT_THUMBNAILS).map(f => f.filename);
            const defaultVariants = submittedDefaultVariants;

            if (Array.isArray(defaultVariants) && defaultVariants.length > 0) {
                const defaultRows = defaultVariants.map((dv, variantIndex) => ({
                    productId:    product.id,
                    groupId:      1,
                    variantType:  dv.variantType || null,
                    variantValue: dv.variantValue || null,
                    stock:        dv.stock !== undefined && dv.stock !== '' ? dv.stock : product.stock,
                    mrpPrice:     dv.mrpPrice || product.mrpPrice,
                    salesPrice:   dv.salesPrice || product.salesPrice,
                    mainImage:    product.mainImage,
                    thumbnails:   JSON.stringify(mainThumbsList),
                    specifications: JSON.stringify(specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : []),
                    subOptions:   JSON.stringify(withCapacityImages(dv.subOptions, req.files, 'default_variant_capacityImage_' + variantIndex + '_')),
                    status:       true
                }));
                await ProductVariant.bulkCreate(defaultRows);
            } else {
                // Fallback to old behavior
                await ProductVariant.create({
                    productId:    product.id,
                    groupId:      1,
                    variantType:  defaultVariantType  || null,
                    variantValue: defaultVariantValue || null,
                    stock:        product.stock,
                    mrpPrice:     product.mrpPrice,
                    salesPrice:   product.salesPrice,
                    mainImage:    product.mainImage,
                    thumbnails:   JSON.stringify(mainThumbsList),
                    specifications: JSON.stringify(specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : []),
                    subOptions:   JSON.stringify([]),
                    status:       true
                });
            }

            // 2. Create Additional Variant Groups (if any)
            // variantGroups format: [{variantType, values:[{variantValue, name, description, stock, mrpPrice, salesPrice, ...}]}]
            if (variants) {
                const finalGroups = typeof variants === 'string' ? JSON.parse(variants) : variants;
                if (Array.isArray(finalGroups) && finalGroups.length > 0) {
                    const rowsToInsert = [];
                    finalGroups.forEach((group, gIdx) => {
                        const groupId = gIdx + 2; // groupId starts at 2 (1 is default)
                        const groupType = group.variantType || null;
                        const values = Array.isArray(group.values) ? group.values : [];
                        values.forEach((v, vIdx) => {
                            const fileKey = `vg${gIdx}_v${vIdx}`;
                            const varMainImgFile = req.files?.find(f => f.fieldname === `variant_mainImage_${fileKey}`);
                            const varMainImg = varMainImgFile ? varMainImgFile.filename : null;
                            const varThumbFiles = req.files?.filter(f => f.fieldname === `variant_thumbnails_${fileKey}`) || [];
                            const varThumbs = varThumbFiles.slice(0, MAX_PRODUCT_THUMBNAILS).map(f => f.filename);
                            const varVideoFile = req.files?.find(f => f.fieldname === `variant_video_${fileKey}`);
                            const varVideo = varVideoFile ? varVideoFile.filename : null;
                            const capacityOptions = withCapacityImages(v.subOptions, req.files, 'variant_capacityImage_' + fileKey + '_');
                            rowsToInsert.push({
                                productId:    product.id,
                                groupId,
                                variantType:  groupType,
                                variantValue: v.variantValue || null,
                                name:         v.name || null,
                                description:  v.description || null,
                                video:        varVideo,
                                stock: (v.stock !== undefined && v.stock !== '') ? v.stock : 0,
                                mrpPrice:     v.mrpPrice || null,
                                salesPrice:   v.salesPrice || null,
                                mainImage:    varMainImg,
                                thumbnails:   JSON.stringify(varThumbs),
                                specifications: JSON.stringify(v.specifications || []),
                                subOptions:   JSON.stringify(capacityOptions),
                                status:       v.status !== undefined ? (v.status === 'true' || v.status === true) : true
                            });
                        });
                    });
                    if (rowsToInsert.length > 0) {
                        await ProductVariant.bulkCreate(rowsToInsert);
                    }
                }
            }
        }

        await updateProductCollections(product.id, { isBestSeller, isTrending, isNewArrival, isTopRated });

        res.status(201).json({ success: true, message: 'Product Created!', productId: product.id, slug });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 4. UPDATE PRODUCT ---
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, categoryId, brandId, mrpPrice, salesPrice, enteredPrice, gstType, gstPercent, stock, status,
            showVariants, defaultVariantType, defaultVariantValue,
            variants, specifications, removedThumbIds,
            isBestSeller, isTrending, isNewArrival, isTopRated
        } = req.body;

        const isVar = showVariants === 'true' || showVariants === true;

        const product = await Product.findByPk(id, {
            include: [{ model: Thumbnail, as: 'thumbnails' }]
        });
        if (!product) return res.status(404).json({ message: 'Product Not Found' });

        const nextMrpPrice = mrpPrice !== undefined ? mrpPrice : product.mrpPrice;
        const nextSalesPrice = salesPrice !== undefined ? salesPrice : product.salesPrice;
        if (mrpPrice !== undefined || salesPrice !== undefined) {
            const priceError = validatePricePair(nextMrpPrice, nextSalesPrice, 'Product', true);
            if (priceError) return res.status(400).json({ success: false, error: priceError });
        }
        const submittedDefaultVariants = parseJsonArray(req.body.defaultVariants);
        const submittedVariantGroups = parseJsonArray(variants);
        if (isVar) {
            const variantPriceError = validateVariantPrices(submittedDefaultVariants, submittedVariantGroups);
            if (variantPriceError) return res.status(400).json({ success: false, error: variantPriceError });
        }

        // ── Main image ──
        let mainImage = product.mainImage;
        const mainImageFile = req.files?.find(f => f.fieldname === 'mainImage');
        if (mainImageFile) {
            if (product.mainImage) {
                const oldPath = path.join(__dirname, '../uploads', product.mainImage);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            mainImage = mainImageFile.filename;
        }

        // ── Product Video ──
        let thumbVideo = product.thumbVideo;
        const thumbVideoFile = req.files?.find(f => f.fieldname === 'thumbVideo');
        if (thumbVideoFile) {
            if (product.thumbVideo) {
                const oldPath = path.join(__dirname, '../uploads', product.thumbVideo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbVideo = thumbVideoFile.filename;
        } else if (req.body.removeVideo === 'true') {
            if (product.thumbVideo) {
                const oldPath = path.join(__dirname, '../uploads', product.thumbVideo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbVideo = null;
        }

        // ── Slug ──
        let slug = product.slug;
        if (name && name !== product.name) {
            slug = await makeUniqueSlug(name, id);
        }
        if (!slug) {
            slug = await makeUniqueSlug(name || product.name, id);
        }

        const gst = gstType && gstPercent
            ? calculateGstPrice({ enteredPrice: nextSalesPrice, gstType, gstPercent })
            : null;

        // Update main product metadata
        await product.update({
            name, slug, description, categoryId, mainImage, thumbVideo,
            brandId:    brandId    !== undefined ? parseOptionalField(brandId)    : product.brandId,
            mrpPrice:   mrpPrice   !== undefined ? parseOptionalField(mrpPrice)   : product.mrpPrice,
            salesPrice: salesPrice !== undefined ? parseOptionalField(salesPrice) : product.salesPrice,
            ...(gst || {}),
            stock:      stock      !== undefined ? stock      : product.stock,
            status: status !== undefined ? (status === 'true' || status === true) : product.status
        });

        // ── Remove main thumbnails ──
        if (removedThumbIds) {
            const ids = typeof removedThumbIds === 'string' ? JSON.parse(removedThumbIds) : removedThumbIds;
            if (Array.isArray(ids) && ids.length > 0) {
                const toDelete = product.thumbnails.filter(t => ids.includes(t.id));
                toDelete.forEach(t => {
                    const p = path.join(__dirname, '../uploads', t.image);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                });
                await Thumbnail.destroy({ where: { id: ids, productId: id } });
            }
        }

        // ── Add new main thumbnails (max 15 total) ──
        const thumbFiles = req.files?.filter(f => f.fieldname === 'thumbnails') || [];
        if (thumbFiles.length > 0) {
            const currentCount = await Thumbnail.count({ where: { productId: id } });
            const canAdd = Math.max(0, MAX_PRODUCT_THUMBNAILS - currentCount);
            if (canAdd > 0) {
                const newThumbs = thumbFiles.slice(0, canAdd).map(file => ({
                    image: file.filename, productId: id
                }));
                await Thumbnail.bulkCreate(newThumbs);
            }
        }

        // ── Specifications (min 3, max 30) — destroy & recreate ──
        if (specifications !== undefined) {
            const parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
            if (Array.isArray(parsedSpecs) && parsedSpecs.length >= 3) {
                await ProductSpecification.destroy({ where: { productId: id } });
                const specData = parsedSpecs.slice(0, 30).map((f, idx) => ({
                    productId:   id,
                    heading:     f.heading     || null,
                    description: f.description || null,
                    sortOrder:   f.sortOrder   !== undefined ? f.sortOrder : idx
                }));
                await ProductSpecification.bulkCreate(specData);
            }
        }

        // ── Variants Sync ──
        const oldVariants = await ProductVariant.findAll({ where: { productId: id } });
        const salesStockMap = {};
        const oldFiles = [];
        oldVariants.forEach(ev => {
            const key = `${ev.groupId || 0}_${(ev.variantValue || '').trim().toLowerCase()}`;
            salesStockMap[key] = Number(ev.salesStock || 0);
            if (ev.mainImage) oldFiles.push(ev.mainImage);
            if (ev.video) oldFiles.push(ev.video);
            if (ev.thumbnails) {
                try {
                    const parsed = JSON.parse(ev.thumbnails);
                    if (Array.isArray(parsed)) oldFiles.push(...parsed);
                } catch (e) {}
            }
            oldFiles.push(...parseJsonArray(ev.subOptions)
                .map(option => typeof option === 'object' && option !== null ? option.image : null)
                .filter(Boolean));
        });

        await ProductVariant.destroy({ where: { productId: id } });

        const newFiles = [];
        if (isVar) {
            // 1. Re-create Default Variants (Variant 1 with multiple rows for each dimension, all under groupId = 1)
            const updatedThumbs = await Thumbnail.findAll({ where: { productId: id } });
            const mainThumbsList = updatedThumbs.map(t => t.image);

            if (product.mainImage) newFiles.push(product.mainImage);
            newFiles.push(...mainThumbsList);

            const defaultVariants = submittedDefaultVariants;
            if (Array.isArray(defaultVariants) && defaultVariants.length > 0) {
                const defaultRows = defaultVariants.map((dv, variantIndex) => {
                    const defaultKey = `1_${(dv.variantValue || '').trim().toLowerCase()}`;
                    const preservedDefaultSalesStock = salesStockMap[defaultKey] || 0;
                    const capacityOptions = withCapacityImages(dv.subOptions, req.files, 'default_variant_capacityImage_' + variantIndex + '_');
                    newFiles.push(...capacityOptions.map(option => option.image).filter(Boolean));
                    return {
                        productId:    id,
                        groupId:      1,
                        variantType:  dv.variantType || null,
                        variantValue: dv.variantValue || null,
                        stock:        dv.stock !== undefined && dv.stock !== '' ? dv.stock : product.stock,
                        salesStock:   preservedDefaultSalesStock,
                        mrpPrice:     dv.mrpPrice || product.mrpPrice,
                        salesPrice:   dv.salesPrice || product.salesPrice,
                        mainImage:    product.mainImage,
                        thumbnails:   JSON.stringify(mainThumbsList),
                        specifications: JSON.stringify(specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : (product.specifications || [])),
                        subOptions:   JSON.stringify(capacityOptions),
                        status:       true
                    };
                });
                await ProductVariant.bulkCreate(defaultRows);
            } else {
                // Fallback to old behavior
                const defaultKey = `1_${(defaultVariantValue || '').trim().toLowerCase()}`;
                const preservedDefaultSalesStock = salesStockMap[defaultKey] || 0;
                await ProductVariant.create({
                    productId:    id,
                    groupId:      1,
                    variantType:  defaultVariantType  || null,
                    variantValue: defaultVariantValue || null,
                    stock:        product.stock,
                    salesStock:   preservedDefaultSalesStock,
                    mrpPrice:     product.mrpPrice,
                    salesPrice:   product.salesPrice,
                    mainImage:    product.mainImage,
                    thumbnails:   JSON.stringify(mainThumbsList),
                    specifications: JSON.stringify(specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : (product.specifications || [])),
                    subOptions:   JSON.stringify([]),
                    status:       true
                });
            }

            // 2. Re-create Additional Variant Groups
            if (variants !== undefined) {
                const finalGroups = typeof variants === 'string' ? JSON.parse(variants) : variants;
                if (Array.isArray(finalGroups) && finalGroups.length > 0) {
                    const rowsToInsert = [];
                    finalGroups.forEach((group, gIdx) => {
                        const groupId = gIdx + 2;
                        const groupType = group.variantType || null;
                        const values = Array.isArray(group.values) ? group.values : [];
                        values.forEach((v, vIdx) => {
                            const fileKey = `vg${gIdx}_v${vIdx}`;
                            const varMainImgFile = req.files?.find(f => f.fieldname === `variant_mainImage_${fileKey}`);
                            const mainImage = varMainImgFile ? varMainImgFile.filename : (v.mainImage || null);

                            const varVideoFile = req.files?.find(f => f.fieldname === `variant_video_${fileKey}`);
                            const video = varVideoFile ? varVideoFile.filename : (v.video || null);

                            const varThumbFiles = req.files?.filter(f => f.fieldname === `variant_thumbnails_${fileKey}`) || [];
                            const newThumbs = varThumbFiles.slice(0, MAX_PRODUCT_THUMBNAILS).map(f => f.filename);

                            let existingThumbs = [];
                            if (v.thumbnails) {
                                try {
                                    existingThumbs = typeof v.thumbnails === 'string' ? JSON.parse(v.thumbnails) : v.thumbnails;
                                } catch (e) { existingThumbs = []; }
                            }
                            if (!Array.isArray(existingThumbs)) existingThumbs = [];

                            const finalThumbs = [...existingThumbs, ...newThumbs].slice(0, MAX_PRODUCT_THUMBNAILS);
                            const capacityOptions = withCapacityImages(v.subOptions, req.files, 'variant_capacityImage_' + fileKey + '_');
                            const preservedSalesStock = salesStockMap[`${groupId}_${(v.variantValue || '').trim().toLowerCase()}`] || 0;

                            if (mainImage) newFiles.push(mainImage);
                            if (video) newFiles.push(video);
                            newFiles.push(...finalThumbs);
                            newFiles.push(...capacityOptions.map(option => option.image).filter(Boolean));

                            rowsToInsert.push({
                                productId:    id,
                                groupId,
                                variantType:  groupType,
                                variantValue: v.variantValue || null,
                                name:         v.name || null,
                                description:  v.description || null,
                                video,
                                stock: (v.stock !== undefined && v.stock !== '') ? v.stock : 0,
                                salesStock:   preservedSalesStock,
                                mrpPrice:     v.mrpPrice || null,
                                salesPrice:   v.salesPrice || null,
                                mainImage,
                                thumbnails:   JSON.stringify(finalThumbs),
                                specifications: JSON.stringify(v.specifications || []),
                                subOptions:   JSON.stringify(capacityOptions),
                                status:       v.status !== undefined ? (v.status === 'true' || v.status === true) : true
                            });
                        });
                    });
                    if (rowsToInsert.length > 0) {
                        await ProductVariant.bulkCreate(rowsToInsert);
                    }
                }
            }
        }

        // Cleanup deleted variant files from disk
        oldFiles.forEach(file => {
            if (!newFiles.includes(file)) {
                const p = path.join(__dirname, '../uploads', file);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        });

        await updateProductCollections(id, { isBestSeller, isTrending, isNewArrival, isTopRated });

        res.status(200).json({ success: true, message: 'Product Updated Successfully!', slug });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 5. GET PRODUCTS BY CATEGORY ---
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const isAdmin = req.headers['x-admin-request'] === 'true';
        const query = {
            where: { categoryId },
            include: fullInclude,
            order: [['createdAt', 'DESC']]
        };
        if (!isAdmin) {
            query.where.status = true;
        }
        const products = await Product.findAll(query);

        if (isAdmin) {
            return res.status(200).json(products.map(p => {
                const formatted = formatProduct(p.toJSON(), true);
                return {
                    ...formatted,
                    slug: p.slug || generateSlug(p.name),
                };
            }));
        }
        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(products.map(p => {
            const formatted = formatProduct(p.toJSON(), false);
            const withSlug = {
                ...formatted,
                slug: p.slug || generateSlug(p.name),
            };
            return formatProductWithDiscounts(withSlug, context);
        }));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 6. DELETE PRODUCT ---
exports.deleteProduct = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id, {
            include: [
                { model: Thumbnail,      as: 'thumbnails' },
                { model: ProductVariant, as: 'variants' }
            ],
            transaction: t
        });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ message: 'Product Not Found' });
        }

        const variantIds = (product.variants || []).map(v => v.id);

        const slots = await OrderSlot.findAll({
            where: {
                [Op.or]: [
                    { productId: product.id },
                    ...(variantIds.length ? [{ variantId: { [Op.in]: variantIds } }] : [])
                ]
            },
            transaction: t
        });

        for (const slot of slots) {
            await slot.update({
                productName:  slot.productName  || product.name      || null,
                productImage: slot.productImage || product.mainImage || null,
            }, { transaction: t });
        }

        const reviews = await Review.findAll({ where: { productId: product.id }, transaction: t });
        for (const review of reviews) {
            if (review.orderId) await review.update({ orderId: null }, { transaction: t });
            await review.destroy({ transaction: t });
        }

        // Explicitly destroy referencing records in Cart, Wishlist, and collections
        await Cart.destroy({ where: { productId: product.id }, transaction: t });
        await Wishlist.destroy({ where: { productId: product.id }, transaction: t });
        await BestSeller.destroy({ where: { productId: product.id }, transaction: t });
        await TrendingProduct.destroy({ where: { productId: product.id }, transaction: t });
        await NewArrival.destroy({ where: { productId: product.id }, transaction: t });
        await TopRatedProduct.destroy({ where: { productId: product.id }, transaction: t });

        // Explicitly destroy child records (Thumbnails, Variants, Specifications)
        await Thumbnail.destroy({ where: { productId: product.id }, transaction: t });
        await ProductVariant.destroy({ where: { productId: product.id }, transaction: t });
        await ProductSpecification.destroy({ where: { productId: product.id }, transaction: t });

        await product.destroy({ transaction: t });
        await t.commit();

        const safeUnlink = (filename) => {
            if (!filename) return;
            const p = path.join(__dirname, '../uploads', filename);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        };

        // Clean up variant images from disk
        (product.variants || []).forEach(v => {
            safeUnlink(v.mainImage);
            if (v.thumbnails) {
                try {
                    const parsed = JSON.parse(v.thumbnails);
                    if (Array.isArray(parsed)) parsed.forEach(file => safeUnlink(file));
                } catch (e) {}
            }
        });

        // Clean up video from disk
        safeUnlink(product.thumbVideo);

        (product.thumbnails || []).forEach(t => safeUnlink(t.image));

        res.status(200).json({ success: true, message: 'Product Deleted Successfully!' });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

exports.updateStock = async (req, res) => {
    try {
        const { productId, variantId, stock } = req.body;
        const normalizedStock = Number(stock);
        if (!Number.isInteger(normalizedStock) || normalizedStock < 0) {
            return res.status(400).json({ success: false, error: 'Stock must be a non-negative whole number' });
        }
        const variants = await ProductVariant.findAll({ where: { productId } });
        const selectableVariants = variants.filter(v =>
            String(v.variantType || '').trim() && String(v.variantValue || '').trim()
        );

        if (variantId) {
            const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
            if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' });
            await variant.update({ stock: normalizedStock });
            return res.status(200).json({ success: true, message: 'Variant stock updated successfully', data: variant });
        } else {
            const product = await Product.findByPk(productId);
            if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
            if (selectableVariants.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'This product has selectable variants. Update stock for each variant instead of the base product.'
                });
            }
            await product.update({ stock: normalizedStock });
            if (variants.length > 0) {
                const placeholderVariantIds = variants
                    .filter(v => !String(v.variantType || '').trim() && !String(v.variantValue || '').trim())
                    .map(v => v.id);
                if (placeholderVariantIds.length > 0) {
                    await ProductVariant.update(
                        { stock: normalizedStock },
                        { where: { id: placeholderVariantIds } }
                    );
                }
            }
            return res.status(200).json({ success: true, message: 'Product stock updated successfully', data: product });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};
