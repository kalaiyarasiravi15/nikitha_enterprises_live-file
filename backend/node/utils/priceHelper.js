const { Op } = require('sequelize');
const { Deal, OfferBanner, Product, ProductVariant, Coupon } = require('../models');

/**
 * Fetches the active global deal and active product-specific offer banners in a single query-set.
 */
const getActiveDiscountContext = async (audience = 'ALL') => {
    try {
        const now = new Date();
        const audienceFilter = ['ALL'];
        if (['NEW_CUSTOMER', 'REGULAR_CUSTOMER'].includes(audience)) {
            audienceFilter.push(audience);
        }
        const activeDateWhere = {
            [Op.or]: [
                { startDate: null },
                { startDate: { [Op.lte]: now } }
            ]
        };
        
        // 1. Fetch active global deals
        const activeDeals = await Deal.findAll({
            where: {
                isActive: true,
                expiryDate: { [Op.gt]: now },
                targetAudience: { [Op.in]: audienceFilter },
                ...activeDateWhere
            },
            order: [['createdAt', 'DESC']]
        });

        // 2. Fetch active offer banners that target a specific product
        const activeOffers = await OfferBanner.findAll({
            where: {
                status: true,
                productId: { [Op.ne]: null },
                expiryDate: { [Op.gt]: now },
                targetAudience: { [Op.in]: audienceFilter },
                ...activeDateWhere
            }
        });

        // Map productID -> offer banner
        const activeOffersByProduct = {};
        activeOffers.forEach(offer => {
            activeOffersByProduct[offer.productId] = offer;
        });

        return { activeDeals, activeOffersByProduct };
    } catch (err) {
        console.error('[getActiveDiscountContext Error]', err.message);
        return { activeDeals: [], activeOffersByProduct: {} };
    }
};

const formatProductWithDiscounts = (productJSON, context) => {
    if (!context) return productJSON;
    const { activeDeals, activeOffersByProduct } = context;

    const mrp = productJSON.mrpPrice !== null ? Number(productJSON.mrpPrice) : null;
    const dbSales = productJSON.salesPrice !== null ? Number(productJSON.salesPrice) : null;
    const promotionBasePrice = mrp > 0 ? mrp : dbSales;
    
    let salesPrice = dbSales !== null ? dbSales : mrp;
    let discountPercentage = 0;
    let discountType = 'None';
    
    const specificOffer = activeOffersByProduct && activeOffersByProduct[productJSON.id];
    let appliedDiscountSource = null;
    let appliedDiscountType = null;
    let appliedDiscountValue = 0;
    let appliedPromotionLabel = null;

    const calculateDiscount = (basePrice, type, value) => {
        if (!basePrice || basePrice <= 0) return null;
        let discounted = basePrice;
        let calcPerc = 0;
        
        if (type === 'FLAT' && value > 0) {
            discounted = basePrice - value;
            calcPerc = Math.round((value / basePrice) * 100);
        } else if ((type === 'PERCENTAGE' || !type) && value > 0) {
            discounted = basePrice - (basePrice * value / 100);
            calcPerc = value;
        } else {
            return null;
        }
        
        if (discounted < 0) discounted = 0;
        return { price: Math.round(discounted * 100) / 100, percentage: calcPerc };
    };

    // 1. Specific offer banner discount (Priority 1)
    if (specificOffer && promotionBasePrice > 0) {
        const type = specificOffer.discountType || 'PERCENTAGE';
        const val = Number(specificOffer.discountValue || specificOffer.discountPercentage || 0);
        const result = calculateDiscount(promotionBasePrice, type, val);
        if (result) {
            salesPrice = result.price;
            discountPercentage = result.percentage;
            discountType = 'Offer Banner';
            appliedDiscountSource = 'Offer Banner';
            appliedDiscountType = type;
            appliedDiscountValue = val;
            appliedPromotionLabel = specificOffer.discountTag || specificOffer.title || 'Offer';
        }
    }
    
    // 2. Global deals of the day (Priority 2)
    if (!appliedDiscountSource && activeDeals && activeDeals.length > 0 && promotionBasePrice > 0) {
        // A matching product deal wins; otherwise an active shop-wide deal applies.
        let bestDeal = null;
        let bestDiscountResult = null;

        const evaluateDeal = (deal) => {
            const type = deal.discountType || 'PERCENTAGE';
            const val = Number(deal.discountValue || deal.discountPercentage || 0);
            return calculateDiscount(promotionBasePrice, type, val);
        };

        const productDeals = activeDeals.filter(d =>
            d.targetType === 'PRODUCT' && Number(d.targetProductId) === Number(productJSON.id)
        );
        const shopDeals = activeDeals.filter(d => d.targetType === 'SHOP');

        // First check product specific deals
        if (productDeals.length > 0) {
            productDeals.forEach(deal => {
                const res = evaluateDeal(deal);
                if (res && (!bestDiscountResult || res.percentage > bestDiscountResult.percentage)) {
                    bestDiscountResult = res;
                    bestDeal = deal;
                }
            });
        } else if (shopDeals.length > 0) {
            shopDeals.forEach(deal => {
                const res = evaluateDeal(deal);
                if (res && (!bestDiscountResult || res.percentage > bestDiscountResult.percentage)) {
                    bestDiscountResult = res;
                    bestDeal = deal;
                }
            });
        }

        if (bestDeal && bestDiscountResult) {
            salesPrice = bestDiscountResult.price;
            discountPercentage = bestDiscountResult.percentage;
            discountType = 'Deal of the Day';
            appliedDiscountSource = 'Deal of the Day';
            appliedDiscountType = bestDeal.discountType || 'PERCENTAGE';
            appliedDiscountValue = Number(bestDeal.discountValue || bestDeal.discountPercentage || 0);
            appliedPromotionLabel = bestDeal.title || 'Deal of the Day';
        }
    }

    // Format variants if they exist
    let variants = productJSON.variants;
    if (variants && variants.length > 0) {
        variants = variants.map(v => {
            const vmrp = v.mrpPrice !== null ? Number(v.mrpPrice) : null;
            const vdbSales = v.salesPrice !== null ? Number(v.salesPrice) : null;
            let vsalesPrice = vdbSales !== null ? vdbSales : vmrp;
            const variantPromotionBase = vmrp > 0 ? vmrp : vdbSales;

            if (appliedDiscountSource && variantPromotionBase > 0) {
                const result = calculateDiscount(variantPromotionBase, appliedDiscountType, appliedDiscountValue);
                if (result) {
                    vsalesPrice = result.price;
                }
            }
            return {
                ...v,
                salesPrice: vsalesPrice !== null ? Number(vsalesPrice) : null,
                mrpPrice: vmrp
            };
        });
    }

    return {
        ...productJSON,
        salesPrice: salesPrice !== null ? Number(salesPrice) : null,
        mrpPrice: mrp,
        discountPercentage,
        discountType,
        promotionSource: appliedDiscountSource,
        promotionLabel: appliedPromotionLabel,
        promotionDiscountType: appliedDiscountType,
        promotionDiscountValue: appliedDiscountValue,
        originalPrice: promotionBasePrice !== null ? Number(promotionBasePrice) : null,
        variants
    };
};

/**
 * Calculates the exact final order total securely on the server-side.
 * Used for mitigating Request Amount Tampering vulnerabilities.
 */
const calculateServerOrderTotal = async (items, shippingAmount, couponId) => {
    let subTotal = 0;
    const productTotals = new Map();
    
    // 1. Get discount context
    const context = await getActiveDiscountContext();

    // 2. Loop through items and fetch prices
    for (let item of items) {
        if (!item.productId) continue;
        
        const product = await Product.findByPk(item.productId, {
            include: [{ model: ProductVariant, as: 'variants' }]
        });
        
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        
        // Format product to get applicable active deals/banners
        const formattedProduct = formatProductWithDiscounts(product.toJSON(), context);
        
        let unitPrice = formattedProduct.salesPrice || 0;
        
        // If variant is selected, fetch variant's discounted price
        if (item.variantId) {
            const formattedVariant = formattedProduct.variants?.find(v => Number(v.id) === Number(item.variantId));
            if (formattedVariant) {
                unitPrice = formattedVariant.salesPrice || 0;
            } else {
                // Fallback directly to DB variant price if not found in formatted JSON for some reason
                const variant = await ProductVariant.findByPk(item.variantId);
                if (variant) unitPrice = variant.salesPrice || 0;
            }
        }
        
        const lineTotal = unitPrice * (Number(item.quantity) || 1);
        subTotal += lineTotal;
        productTotals.set(
            Number(item.productId),
            (productTotals.get(Number(item.productId)) || 0) + lineTotal
        );
    }
    
    let total = subTotal + Number(shippingAmount || 0);
    
    // 3. Apply coupon if any
    let discountAmount = 0;
    if (couponId) {
        const coupon = await Coupon.findByPk(couponId);
        const now = new Date();
        const isActive = coupon
            && coupon.status
            && new Date(coupon.startDate) <= now
            && new Date(coupon.endDate) >= now
            && Number(coupon.usedCount || 0) < Number(coupon.usageLimit || 0);

        if (isActive) {
            const eligibleSubtotal = coupon.targetType === 'PRODUCT'
                ? Number(productTotals.get(Number(coupon.productId)) || 0)
                : subTotal;

            if (eligibleSubtotal > 0) {
                if (coupon.type === 'percentage') {
                    discountAmount = (eligibleSubtotal * Number(coupon.discountValue || 0)) / 100;
                } else {
                    discountAmount = Number(coupon.discountValue || 0);
                }
            } else {
                discountAmount = 0;
            }
            if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
                discountAmount = Number(coupon.maxDiscount);
            }
            if (discountAmount > eligibleSubtotal) {
                discountAmount = eligibleSubtotal;
            }
        }
        total -= discountAmount;
    }
    
    return {
        subTotal: Math.max(0, subTotal),
        discountAmount: Math.max(0, discountAmount),
        shippingAmount: Number(shippingAmount || 0),
        totalAmount: Math.max(0, total)
    };
};

module.exports = {
    getActiveDiscountContext,
    formatProductWithDiscounts,
    calculateServerOrderTotal
};
