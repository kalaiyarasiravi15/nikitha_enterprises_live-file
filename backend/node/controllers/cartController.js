const { Cart, Product, ProductVariant, Thumbnail, Category } = require('../models/index');
const { getActiveDiscountContext, formatProductWithDiscounts } = require('../utils/priceHelper');

const productInclude = [
    { model: Product, as: 'product', include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: ProductVariant, as: 'variants' },
        { model: Thumbnail, as: 'thumbnails', attributes: ['id', 'image'] }
    ]}
];

const isSameCustomer = (req, customerId) => String(req.customerId) === String(customerId);

// GET cart for logged-in customer
exports.getCart = async (req, res) => {
    try {
        const customerId = req.params.customerId;
        if (!isSameCustomer(req, customerId)) return res.status(403).json({ message: 'You can access only your own cart.' });
        const items = await Cart.findAll({
            where: { customerId },
            include: productInclude,
            order: [['createdAt', 'DESC']]
        });
        const context = await getActiveDiscountContext();
        const formattedItems = items.map(item => {
            const raw = item.toJSON();
            if (raw.product) {
                const p = raw.product;
                const inventoryVariants = (p.variants || []).filter(v => v.variantType && v.variantValue);
                const totalStock = inventoryVariants.length > 0
                    ? inventoryVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
                    : Number(p.stock || 0);

                const totalSalesStock = inventoryVariants.length > 0
                    ? inventoryVariants.reduce((sum, v) => sum + Number(v.salesStock || 0), 0)
                    : Number(p.salesStock || 0);

                const variants = (p.variants || []).map(v => ({
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
            }
            return raw;
        });
        res.json(formattedItems);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// ADD item to cart
exports.addToCart = async (req, res) => {
    try {
        let { customerId, productId, variantId, selectedSubOption, quantity, salesPrice, productName, price, image, isPreorder = false } = req.body;
        if (!isSameCustomer(req, customerId)) return res.status(403).json({ message: 'You can update only your own cart.' });
        isPreorder = Boolean(isPreorder);

        if (!productId && productName) {
            // Find or create default category
            const [category] = await Category.findOrCreate({
                where: { name: 'Medical Equipment' },
                defaults: { image: 'default-category.png' }
            });

            // Find or create product
            let product = await Product.findOne({ where: { name: productName } });
            if (!product) {
                // Generate a unique slug
                const baseSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                let slug = baseSlug;
                let counter = 1;
                while (await Product.findOne({ where: { slug } })) {
                    slug = `${baseSlug}-${counter++}`;
                }

                product = await Product.create({
                    name: productName,
                    slug,
                    mrpPrice: price ? price * 1.2 : 100,
                    salesPrice: price || 100,
                    mainImage: image || 'assets/images/products/product-thumb-1.jpg',
                    categoryId: category.id,
                    description: `${productName} - High-quality medical laboratory equipment and consumables.`
                });
            }
            productId = product.id;
            if (!salesPrice) salesPrice = product.salesPrice;
        }

        const existing = await Cart.findOne({ where: { 
            customerId, 
            productId, 
            variantId: variantId || null,
            selectedSubOption: selectedSubOption || null,
            isPreorder
        } });

        if (existing) {
            existing.quantity += Math.max(1, Number(quantity) || 1);
            if (salesPrice !== undefined && salesPrice !== null) {
                existing.salesPrice = salesPrice;
            }
            await existing.save();
            return res.json({ message: 'Cart quantity updated', action: 'updated', item: existing });
        }

        const item = await Cart.create({ 
            customerId, 
            productId, 
            variantId: variantId || null, 
            selectedSubOption: selectedSubOption || null,
            isPreorder,
            quantity: quantity || 1, 
            salesPrice 
        });
        res.status(201).json({ message: 'Added to cart', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// UPDATE quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const item = await Cart.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'Cart item not found' });
        if (!isSameCustomer(req, item.customerId)) return res.status(403).json({ message: 'You can update only your own cart.' });
        if (quantity <= 0) {
            await item.destroy();
            return res.json({ message: 'Item removed' });
        }
        item.quantity = quantity;
        await item.save();
        res.json({ message: 'Updated', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// REMOVE single item
exports.removeFromCart = async (req, res) => {
    try {
        const item = await Cart.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (!isSameCustomer(req, item.customerId)) return res.status(403).json({ message: 'You can update only your own cart.' });
        const deleted = await Cart.destroy({ where: { id: req.params.id } });
        if (deleted) res.json({ message: 'Removed from cart' });
        else res.status(404).json({ message: 'Item not found' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// CLEAR entire cart for customer
exports.clearCart = async (req, res) => {
    try {
        if (!isSameCustomer(req, req.params.customerId)) return res.status(403).json({ message: 'You can update only your own cart.' });
        await Cart.destroy({ where: { customerId: req.params.customerId } });
        res.json({ message: 'Cart cleared' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const validGuestSession = (value) => typeof value === 'string' && /^[a-zA-Z0-9-]{20,80}$/.test(value);

// Guest cart records are database-backed.  The UUID is kept in the browser only
// as the anonymous visitor's key; product and quantity data remain in MySQL.
exports.getGuestCart = async (req, res) => {
    try {
        const { guestSessionId } = req.params;
        if (!validGuestSession(guestSessionId)) return res.status(400).json({ message: 'Invalid guest session.' });
        const items = await Cart.findAll({
            where: { guestSessionId, customerId: null },
            include: productInclude,
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.addGuestToCart = async (req, res) => {
    try {
        const { guestSessionId, productId, variantId, selectedSubOption, quantity = 1, isPreorder = false } = req.body || {};
        if (!validGuestSession(guestSessionId) || !productId) return res.status(400).json({ message: 'Guest session and product are required.' });
        const product = await Product.findByPk(productId);
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        let salesPrice = Number(product.salesPrice || product.mrpPrice || 0);
        if (variantId) {
            const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
            if (!variant) return res.status(400).json({ message: 'Invalid product variant.' });
            salesPrice = Number(variant.salesPrice || variant.mrpPrice || salesPrice);
        }
        const where = { guestSessionId, customerId: null, productId, variantId: variantId || null, selectedSubOption: selectedSubOption || null, isPreorder: Boolean(isPreorder) };
        const existing = await Cart.findOne({ where });
        if (existing) {
            existing.quantity += Math.max(1, Number(quantity) || 1);
            existing.salesPrice = salesPrice;
            await existing.save();
            return res.json({ message: 'Cart quantity updated', action: 'updated', item: existing });
        }
        const item = await Cart.create({ ...where, quantity: Math.max(1, Number(quantity) || 1), salesPrice });
        res.status(201).json({ message: 'Added to cart', action: 'added', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateGuestCartItem = async (req, res) => {
    try {
        const { guestSessionId, quantity } = req.body || {};
        if (!validGuestSession(guestSessionId)) return res.status(400).json({ message: 'Invalid guest session.' });
        const item = await Cart.findOne({ where: { id: req.params.id, guestSessionId, customerId: null } });
        if (!item) return res.status(404).json({ message: 'Cart item not found.' });
        if (Number(quantity) <= 0) { await item.destroy(); return res.json({ message: 'Item removed' }); }
        item.quantity = Math.max(1, Number(quantity) || 1);
        await item.save();
        res.json({ message: 'Updated', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeGuestFromCart = async (req, res) => {
    try {
        const { guestSessionId } = req.body || {};
        if (!validGuestSession(guestSessionId)) return res.status(400).json({ message: 'Invalid guest session.' });
        const deleted = await Cart.destroy({ where: { id: req.params.id, guestSessionId, customerId: null } });
        if (!deleted) return res.status(404).json({ message: 'Cart item not found.' });
        res.json({ message: 'Removed' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.clearGuestCart = async (req, res) => {
    try {
        const { guestSessionId } = req.params;
        if (!validGuestSession(guestSessionId)) return res.status(400).json({ message: 'Invalid guest session.' });
        await Cart.destroy({ where: { guestSessionId, customerId: null } });
        res.json({ message: 'Cart cleared' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
