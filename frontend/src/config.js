export const API = import.meta.env.VITE_API_URL;
export const IMG = import.meta.env.VITE_IMG_URL;

export let activeGlobalDeals = [];
export let activeGlobalOfferBanners = [];

export const setActiveGlobalDeals = (deals) => {
  activeGlobalDeals = deals || [];
};

export const setActiveGlobalOfferBanners = (banners) => {
  activeGlobalOfferBanners = banners || [];
};

export const formatBackendProduct = (p) => {
  if (!p) return null;
  const selectableVariants = Array.isArray(p.variants)
    ? p.variants.filter(v => v.variantType && v.variantValue)
    : [];
  const thumb = p.mainImage ? (p.mainImage.startsWith('http') ? p.mainImage : `${IMG}/${p.mainImage}`) : '';
  const imagesList = [];
  if (thumb) imagesList.push(thumb);
  if (Array.isArray(p.thumbnails)) {
    p.thumbnails.forEach(t => {
      const url = t.image.startsWith('http') ? t.image : `${IMG}/${t.image}`;
      if (!imagesList.includes(url)) {
        imagesList.push(url);
      }
    });
  }
  
  let salesPrice = Number(p.salesPrice || 0);
  let mrpPrice = p.mrpPrice ? Number(p.mrpPrice) : null;
  
  if (!salesPrice && Array.isArray(p.variants) && p.variants.length > 0) {
    salesPrice = Number(p.variants[0].salesPrice || 0);
    mrpPrice = p.variants[0].mrpPrice ? Number(p.variants[0].mrpPrice) : null;
  }

  let finalPrice = salesPrice;
  let oldPrice = mrpPrice;
  let dealActive = false;
  let activePromo = null; // To store which promo applied
  // Public product APIs already return deal/offer-adjusted prices. Do not
  // apply the same promotion a second time in the browser.
  const serverDiscountApplied = Boolean(
    p.discountType && p.discountType !== 'None' && Number(p.discountPercentage) > 0
  );

  const now = new Date();

  // Helper to check if a promo is active right now based on dates
  const isPromoLive = (promo) => {
    if (!promo) return false;
    // We treat missing dates as loosely passing, but strictly they should exist.
    const start = promo.startDate ? new Date(promo.startDate) : new Date(0);
    const end = (promo.expiryDate || promo.endDate) ? new Date(promo.expiryDate || promo.endDate) : new Date('2999-12-31');
    return now >= start && now <= end;
  };

  // Helper to calculate discounted price from MRP
  const getDiscountedPrice = (base, promo) => {
    let computed = base;
    if (promo.discountType === 'FLAT') {
      computed = Math.max(0, base - Number(promo.discountValue || 0));
    } else {
      const discountPct = Number(promo.discountValue || promo.discountPercentage || 0);
      computed = Math.max(0, base * (1 - discountPct / 100));
    }
    return computed;
  };

  // The base price used for discounts is always MRP if available, else Sales Price
  const discountBasePrice = mrpPrice || salesPrice;

  // Rule 1: Product-specific Offer Banner
  const matchingBanner = Array.isArray(activeGlobalOfferBanners) 
    ? activeGlobalOfferBanners.find(b => Number(b.productId) === Number(p.id) && isPromoLive(b))
    : null;

  if (!serverDiscountApplied && matchingBanner) {
    const discountedPrice = getDiscountedPrice(discountBasePrice, matchingBanner);
    finalPrice = discountedPrice;
    oldPrice = discountBasePrice;
    dealActive = true;
    activePromo = { type: 'banner', data: matchingBanner };
  } 
  // Rule 2: Deals of the Day (only if Rule 1 didn't apply)
  else if (!serverDiscountApplied && activeGlobalDeals && activeGlobalDeals.length > 0) {
    let bestDeal = null;
    let bestDiscountResult = null;

    const evaluateDeal = (deal) => {
      let calcPrice = getDiscountedPrice(discountBasePrice, deal);
      let percentage = 0;
      if (deal.discountType === 'FLAT') {
        percentage = discountBasePrice > 0 ? Math.round(((discountBasePrice - calcPrice) / discountBasePrice) * 100) : 0;
      } else {
        percentage = Number(deal.discountValue || deal.discountPercentage || 0);
      }
      return { price: calcPrice, percentage };
    };

    const productDeals = activeGlobalDeals.filter(d => d.targetType === 'PRODUCT' && Number(d.targetProductId) === Number(p.id) && isPromoLive(d));
    const shopDeals = activeGlobalDeals.filter(d => d.targetType === 'SHOP' && isPromoLive(d));

    if (productDeals.length > 0) {
        productDeals.forEach(deal => {
            const res = evaluateDeal(deal);
            if (!bestDiscountResult || res.percentage > bestDiscountResult.percentage) {
                bestDiscountResult = res;
                bestDeal = deal;
            }
        });
    } else if (shopDeals.length > 0) {
        shopDeals.forEach(deal => {
            const res = evaluateDeal(deal);
            if (!bestDiscountResult || res.percentage > bestDiscountResult.percentage) {
                bestDiscountResult = res;
                bestDeal = deal;
            }
        });
    }

    if (bestDeal && bestDiscountResult) {
      finalPrice = bestDiscountResult.price;
      oldPrice = discountBasePrice;
      dealActive = true;
      activePromo = { type: 'deal', data: bestDeal };
    }
  }

  // Ensure oldPrice is strictly greater than finalPrice for display, else nullify oldPrice
  if (oldPrice <= finalPrice) {
    oldPrice = null;
  }

  const discountPercentage = oldPrice && finalPrice < oldPrice
    ? Math.round(((oldPrice - finalPrice) / oldPrice) * 100)
    : 0;

  return {
    id: p.id,
    name: p.name,
    price: finalPrice,
    oldPrice: oldPrice,
    baseSalesPrice: salesPrice,
    baseMrpPrice: mrpPrice,
    dealActive,
    activePromo,
    serverDiscountApplied,
    promotionSource: p.promotionSource || (activePromo ? (activePromo.type === 'banner' ? 'Offer Banner' : 'Deal of the Day') : null),
    promotionLabel: p.promotionLabel || null,
    promotionDiscountType: p.promotionDiscountType || activePromo?.data?.discountType || null,
    promotionDiscountValue: p.promotionDiscountValue ?? activePromo?.data?.discountValue ?? activePromo?.data?.discountPercentage ?? null,
    discountPercentage,
    category: p.category ? (typeof p.category === 'object' ? p.category.name : p.category) : '',
    categoryId: p.categoryId,
    brand: p.brand ? (typeof p.brand === 'object' ? p.brand.name : p.brand) : (p.brandName || p.Brand?.name || ''),
    brandId: p.brandId || null,
    tag: p.tag || '',
    thumb: thumb,
    images: imagesList.length > 0 ? imagesList : [thumb],
    description: p.description || '',
    inStock: p.status !== false && (selectableVariants.length ? selectableVariants.some(v => Number(v.stock) > 0) : Number(p.stock) > 0),
    stockLeft: selectableVariants.length ? selectableVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0) : Number(p.stock || 0),
    soldRecently: p.soldRecently || 0,
    variants: p.variants || [],
    specifications: p.specifications || [],
    thumbVideo: p.thumbVideo || null,
    sku: p.sku || '',
    raw: p
  };
};
