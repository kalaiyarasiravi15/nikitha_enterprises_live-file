import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ShopDetail.css";
import { FiArrowLeft, FiShoppingCart, FiHeart, FiEye, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { API, IMG, formatBackendProduct } from "../../config";
import { toast } from "react-toastify";
import { ProductCard } from "../../components/ProductSliders/ProductSliders";

function formatPrice(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function parseCapacityOptions(subOptions) {
  let parsed = [];
  try {
    parsed = typeof subOptions === 'string' ? JSON.parse(subOptions) : (subOptions || []);
  } catch {
    parsed = [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(option => typeof option === 'object' && option !== null
      ? { value: String(option.value || ''), image: option.image || null }
      : { value: String(option || ''), image: null })
    .filter(option => option.value.trim());
}

function renderStars(rating) {
  const r = Math.round(Number(rating) || 0);
  return (
    <span className="review-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= r ? '#FFCC00' : '#ddd', fontSize: '16px' }}>★</span>
      ))}
    </span>
  );
}

const UpdateQtyConfirm = ({ onConfirm, onCancel, closeToast }) => (
  <div style={{ fontFamily: 'Jost, sans-serif', padding: '6px' }}>
    <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>
      Do you want to update the quantity in your cart?
    </p>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button 
        onClick={() => { onConfirm(); closeToast(); }} 
        style={{ background: '#2d5a1b', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
      >
        Yes
      </button>
      <button 
        onClick={() => { onCancel(); closeToast(); }} 
        style={{ background: '#e0dbd2', color: '#333', border: 'none', padding: '6px 14px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
      >
        No
      </button>
    </div>
  </div>
);

export default function ShopDetail({
  productId,
  onProductClick,
  onBack,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onUpdateCartQuantity,
  onNavigate,
  cart = [],
  wishlist = [],
  currentUser,
  coupons = [],
  highlightedCouponCode = '',
}) {
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [variantGroups, setVariantGroups] = useState({});
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedCapacity, setSelectedCapacity] = useState('');
  const [variantPickerAction, setVariantPickerAction] = useState(null);
  const highlightedCouponRef = useRef(null);

  const activeVariantId = Object.keys(selectedAttributes).map(type => {
    const val = selectedAttributes[type];
    const matched = product?.variants?.find(v => v.variantType === type && v.variantValue === val && v.status !== false);
    return matched ? matched.id : null;
  }).filter(id => id != null).at(-1) || null;

  const cartItem = product ? cart.find((item) => 
    item.id === product.id && 
    (item.variantId || null) === activeVariantId &&
    (item.selectedSubOption || null) === (selectedCapacity || null)
  ) : null;
  const isInCart = Boolean(cartItem);
  const availableCoupons = coupons.filter(coupon =>
    coupon?.targetType === 'SHOP' || Number(coupon?.productId) === Number(product?.id)
  );

  const copyCouponCode = async (code) => {
    sessionStorage.setItem('at_pending_coupon_code', code);
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied — apply it at checkout.`);
    } catch {
      toast.info(`Use coupon code: ${code}`);
    }
  };

  useEffect(() => {
    const activeCoupon = String(highlightedCouponCode || '').trim().toUpperCase();
    if (!activeCoupon || !availableCoupons.some(coupon => String(coupon.code || '').toUpperCase() === activeCoupon)) return;
    const timer = setTimeout(() => highlightedCouponRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    return () => clearTimeout(timer);
  }, [highlightedCouponCode, product?.id, availableCoupons.length]);

  useEffect(() => {
    if (cartItem) {
      setQuantity(cartItem.quantity);
    } else {
      setQuantity(1);
    }
  }, [cartItem]);

  useEffect(() => {
    setLoading(true);
    setReviews([]);
    setReviewPage(0);
    setActiveTab('description');
    // Fetch product details
    fetch(`${API}/products/${productId}`)
      .then(res => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then(data => {
        if (data) {
          const formatted = formatBackendProduct(data);
          setProduct(formatted);
          setActiveImage(0);
          setQuantity(1);

          // Group variants by type
          const activeVars = data.variants ? data.variants.filter(v => v.status !== false) : [];
          const groups = {};
          activeVars.forEach(v => {
            if (!v.variantType || !v.variantValue || String(v.variantValue).trim() === '') return;
            const type = v.variantType;
            if (!groups[type]) groups[type] = [];
            if (!groups[type].includes(v.variantValue)) groups[type].push(v.variantValue);
          });
          setVariantGroups(groups);

          // A product that has variants must be explicitly selected by the customer.
          // Do not silently add the first variant to the cart.
          setSelectedAttributes({});
          setSelectedCapacity('');

          // Fetch related products
          if (formatted.categoryId) {
            fetch(`${API}/products/by-category/${formatted.categoryId}`)
              .then(res => res.json())
              .then(relatedData => {
                if (Array.isArray(relatedData)) {
                  const mapped = relatedData
                    .filter(p => p.id !== formatted.id)
                    .slice(0, 4)
                    .map(formatBackendProduct)
                    .filter(Boolean);
                  setRelated(mapped);
                }
              })
              .catch(() => setRelated([]));
          }

          // Fetch published reviews
          fetch(`${API}/reviews/product/${data.id}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setReviews(Array.isArray(data) ? data : []))
            .catch(() => setReviews([]));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading product detail:", err);
        setProduct(null); setRelated([]); setReviews([]);
        setActiveImage(0); setQuantity(1); setVariantGroups({}); setSelectedAttributes({});
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-empty">
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="detail-page">
        <div className="detail-empty">
          <p>This product could not be found.</p>
          {onBack && (
            <button type="button" onClick={onBack}>
              Back to shop
            </button>
          )}
        </div>
      </div>
    );
  }

  // Helper to dynamically resolve product properties based on selected variants
  const resolveActiveProduct = () => {
    if (!product) return null;
    
    // Start with base product details
    let resolved = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice,
      thumb: product.thumb,
      images: product.images && product.images.length > 0 ? product.images : [product.thumb],
      inStock: product.inStock,
      stockCount: product.stockLeft || 0,
      sku: product.sku || `AT-PRD-${product.id}`,
      video: product.raw?.thumbVideo ? `${IMG}/${product.raw.thumbVideo}` : null,
      dealActive: product.dealActive,
      activePromo: product.activePromo,
      serverDiscountApplied: product.serverDiscountApplied,
      promotionSource: product.promotionSource,
      promotionLabel: product.promotionLabel,
      promotionDiscountType: product.promotionDiscountType,
      promotionDiscountValue: product.promotionDiscountValue,
      baseSalesPrice: product.baseSalesPrice,
      baseMrpPrice: product.baseMrpPrice,
    };

    // Find selected variants
    const activeVariants = product.variants ? product.variants.filter(v => v.status !== false) : [];
    
    // Apply overrides from selected variants in order of selection/groups
    Object.keys(selectedAttributes).forEach(type => {
      const val = selectedAttributes[type];
      const matched = activeVariants.find(v => v.variantType === type && v.variantValue === val);
      if (matched) {
        if (matched.name) {
          resolved.name = matched.name;
        }
        if (matched.description) {
          resolved.description = matched.description;
        }
        if (matched.salesPrice !== null && matched.salesPrice !== undefined && matched.salesPrice !== '') {
          resolved.price = Number(matched.salesPrice);
        }
        if (matched.mrpPrice !== null && matched.mrpPrice !== undefined && matched.mrpPrice !== '') {
          resolved.oldPrice = Number(matched.mrpPrice);
        }
        if (matched.mainImage) {
          resolved.thumb = matched.mainImage.startsWith('http') ? matched.mainImage : `${IMG}/${matched.mainImage}`;
        }
        if (matched.thumbnails) {
          let parsed = [];
          try {
            parsed = typeof matched.thumbnails === 'string' ? JSON.parse(matched.thumbnails) : matched.thumbnails;
          } catch(e) { parsed = []; }
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolved.images = parsed.map(t => t.startsWith('http') ? t : `${IMG}/${t}`);
          }
        }
        if (matched.video) {
          resolved.video = matched.video.startsWith('http') ? matched.video : `${IMG}/${matched.video}`;
        }
        if (matched.stock !== null && matched.stock !== undefined && matched.stock !== '') {
          resolved.stockCount = Number(matched.stock);
          resolved.inStock = Number(matched.stock) > 0;
        }
        // Unique SKU per variant combination
        resolved.sku = `AT-PRD-${product.id}-${matched.id}${selectedCapacity ? '-' + selectedCapacity.replace(/\s+/g, '-') : ''}`;
        resolved.variantId = matched.id;
        resolved.selectedCapacity = selectedCapacity;
      }
    });

    // A capacity can have a dedicated image saved with its sub-option.
    const selectedVariant = activeVariantId
      ? activeVariants.find(variant => Number(variant.id) === Number(activeVariantId))
      : null;
    if (selectedVariant && selectedCapacity) {
      const selectedOption = parseCapacityOptions(selectedVariant.subOptions)
        .find(option => option.value === selectedCapacity);
      if (selectedOption?.image) {
        const capacityImage = selectedOption.image.startsWith('http')
          ? selectedOption.image
          : `${IMG}/${selectedOption.image}`;
        resolved.thumb = capacityImage;
        resolved.images = [capacityImage, ...(resolved.images || []).filter(image => image !== capacityImage)];
      }
    }

    // Re-apply promo discount logic if a deal is active (since variants may have overridden the base price)
    if (!resolved.serverDiscountApplied && resolved.dealActive && resolved.activePromo) {
      const promo = resolved.activePromo.data;
      const baseForDiscount = resolved.oldPrice || resolved.price;
      
      let computed = baseForDiscount;
      if (promo.discountType === 'FLAT') {
        computed = Math.max(0, baseForDiscount - Number(promo.discountValue || 0));
      } else {
        const discountPct = Number(promo.discountValue || promo.discountPercentage || 0);
        computed = Math.max(0, baseForDiscount * (1 - discountPct / 100));
      }
      
      resolved.oldPrice = baseForDiscount;
      resolved.price = computed;
    }

    if (resolved.oldPrice <= resolved.price) {
      resolved.oldPrice = null;
    }

    if (resolved.thumb) {
      if (!resolved.images) {
        resolved.images = [resolved.thumb];
      } else {
        resolved.images = resolved.images.filter(img => img !== resolved.thumb);
        resolved.images.unshift(resolved.thumb);
      }
    }
    
    if (resolved.images) {
      resolved.images = [...new Set(resolved.images)];
    }

    return resolved;
  };

  const resolved = resolveActiveProduct();
  if (!resolved) return null;

  const buildSelectedProduct = () => ({
    ...product,
    name: selectedCapacity ? `${resolved.name} - ${selectedCapacity}` : resolved.name,
    price: resolved.price,
    oldPrice: resolved.oldPrice,
    thumb: resolved.thumb,
    sku: resolved.sku,
    selectedAttributes,
    variantId: resolved.variantId || activeVariantId || null,
    selectedVariantId: resolved.variantId || activeVariantId || null,
    selectedSubOption: selectedCapacity || null,
    selectedCapacity: selectedCapacity || null,
  });

  // Media list handles both images and videos
  const mediaList = resolved.images.map(img => ({ type: 'image', url: img }));
  if (resolved.video) {
    mediaList.push({ type: 'video', url: resolved.video });
  }

  const isWishlisted = wishlist.some((item) => item.id === product.id);
  const selectedQuantity = quantity;

  const goPrev = () => setActiveImage((i) => (i === 0 ? mediaList.length - 1 : i - 1));
  const goNext = () => setActiveImage((i) => (i === mediaList.length - 1 ? 0 : i + 1));
  
  const updateQuantity = (nextQuantity) => {
    const maxQty = resolved.stockCount > 0 ? resolved.stockCount : 1;
    const safeQuantity = Math.max(1, Math.min(maxQty, nextQuantity));
    setQuantity(safeQuantity);
  };

  const getCartButtonText = () => {
    if (isInCart) {
      if (cartItem.quantity !== quantity) {
        return "Update Quantity";
      }
      return "Go to Cart";
    }
    return "Add to Cart";
  };

  const handleCartAction = () => {
    if (requiresVariantSelection) {
      setVariantPickerAction('cart');
      return;
    }
    if (isInCart) {
      if (cartItem.quantity !== quantity) {
        toast.dismiss();
        toast.info(
          <UpdateQtyConfirm 
            onConfirm={() => {
              onUpdateCartQuantity && onUpdateCartQuantity(cartItem.cartItemId, quantity);
              toast.success("Cart quantity updated!");
            }} 
            onCancel={() => {
              setQuantity(cartItem.quantity);
            }}
          />,
          { autoClose: false, closeOnClick: false, closeButton: false, icon: false }
        );
      } else {
        onNavigate && onNavigate("cart");
      }
    } else {
      if (onAddToCart) {
        onAddToCart(buildSelectedProduct(), quantity);
      }
    }
  };

  const handleSelectAttribute = (type, val) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [type]: val
    }));
    setActiveImage(0);
    
    // Auto-select first capacity of new dimension
    const matchedVar = (product?.variants || []).find(v => v.variantType === type && v.variantValue === val);
    if (matchedVar) {
      const capacityOptions = parseCapacityOptions(matchedVar.subOptions);
      if (capacityOptions.length > 0) setSelectedCapacity(capacityOptions[0].value);
      else setSelectedCapacity('');
    }
  };

  const isAvailable = resolved.inStock && resolved.stockCount > 0;
  const requiresVariantSelection = Object.keys(variantGroups).length > 0 && !activeVariantId;
  const displayRelated = related || [];

  const completeVariantSelection = (requestedAction = variantPickerAction) => {
    if (requiresVariantSelection || !isAvailable) return;
    setVariantPickerAction(null);
    if (requestedAction === 'buy') {
      if (onBuyNow) onBuyNow(buildSelectedProduct(), quantity);
      else {
        onAddToCart && onAddToCart(buildSelectedProduct(), quantity);
        onNavigate && onNavigate('checkout');
      }
    } else {
      handleCartAction();
    }
  };

  // Swipe handlers for mobile image gallery
  const handleTouchStart = (e) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && activeImage < mediaList.length - 1) {
      setActiveImage(activeImage + 1);
    } else if (isRightSwipe && activeImage > 0) {
      setActiveImage(activeImage - 1);
    }
  };

  return (
    <div className="detail-page">
      {onBack && (
        <button type="button" className="detail-back-btn" onClick={onBack}>
          <FiArrowLeft />
          <span>Back to Shop</span>
        </button>
      )}

      <div className="detail-crumbs">
        {onBack ? (
          <button type="button" className="detail-crumbs__link" onClick={onBack}>
            Shop
          </button>
        ) : (
          <span>Shop</span>
        )}
      </div>

      <div className="detail-top">
        {/* Gallery Grouping Block */}
        <div className="detail-gallery">
          <div 
            className="detail-gallery__main"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {mediaList[activeImage]?.type === 'video' ? (
              <video 
                src={mediaList[activeImage].url} 
                controls 
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} 
              />
            ) : (
              <img src={mediaList[activeImage]?.url} alt={`${resolved.name} view ${activeImage + 1}`} />
            )}

              {mediaList.length > 1 && (
                <div className="detail-gallery__dots" style={{ position: 'absolute', bottom: '16px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 10 }}>
                  {mediaList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Go to media ${idx + 1}`}
                      onClick={() => setActiveImage(idx)}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: activeImage === idx ? '#C89438' : 'rgba(255,255,255,0.7)',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'background 0.3s, transform 0.3s',
                        transform: activeImage === idx ? 'scale(1.2)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

          {/* Under-Image Thumbnail strip */}
          {mediaList.length > 1 && (
            <div className="detail-gallery__thumbs">
              {mediaList.map((media, idx) => (
                <button
                   key={idx}
                   type="button"
                   className={
                     "detail-gallery__thumb" + (idx === activeImage ? " is-active" : "")
                   }
                   onClick={() => setActiveImage(idx)}
                   aria-label={`View media ${idx + 1}`}
                >
                  {media.type === 'video' ? (
                    <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline preload="metadata" />
                  ) : (
                    <img src={media.url} alt="" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Block */}
        <div className="detail-info">
          <div className="detail-info__head">
            <h1>{resolved.name}</h1>
            <button
              type="button"
              className={"detail-info__wishlist" + (isWishlisted ? " is-active" : "")}
              onClick={() => onToggleWishlist && onToggleWishlist(product)}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <FiHeart />
            </button>
          </div>

          {/* SKU and Stock details block */}
          <div className="detail-info__sku-stock">
            <span className={`detail-stock-status ${requiresVariantSelection ? 'low-stock' : isAvailable ? (resolved.stockCount <= 10 ? 'low-stock' : 'in-stock') : 'out-of-stock'}`}>
              {requiresVariantSelection
                ? 'Choose a variant to view stock'
                : isAvailable
                ? (resolved.stockCount <= 10 ? `Only ${resolved.stockCount} left in stock` : `In Stock (${resolved.stockCount} units)`)
                : 'Out of Stock'}
            </span>
          </div>

          <div className="detail-info__price">
            {resolved.oldPrice && (
              <span className="detail-info__price-old">{formatPrice(resolved.oldPrice)}</span>
            )}
            <span className="detail-info__price-now">{formatPrice(resolved.price)}</span>
            
            {(resolved.promotionSource || (resolved.dealActive && resolved.activePromo)) ? (
              <span className="detail-info__discount-badge" style={{ backgroundColor: '#e63946', color: '#fff', border: 'none' }}>
                {resolved.promotionSource
                  ? `${resolved.promotionSource === 'Offer Banner' ? (resolved.promotionLabel || resolved.activePromo?.data?.discountTag || 'Offer') : 'Deal of the Day'} | ${resolved.promotionDiscountType === 'FLAT' ? `₹${resolved.promotionDiscountValue} OFF` : `${resolved.oldPrice ? Math.round(((resolved.oldPrice - resolved.price) / resolved.oldPrice) * 100) : 0}% OFF`}`
                  : resolved.activePromo.type === 'banner' && resolved.activePromo.data.discountTag 
                  ? `${resolved.activePromo.data.discountTag} | ${resolved.activePromo.data.discountType === 'FLAT' ? '₹' + resolved.activePromo.data.discountValue + ' OFF' : (resolved.activePromo.data.discountValue || resolved.activePromo.data.discountPercentage) + '% OFF'}`
                  : (resolved.activePromo.data.discountType === 'FLAT' 
                      ? `₹${resolved.activePromo.data.discountValue} OFF` 
                      : `${resolved.activePromo.data.discountValue || resolved.activePromo.data.discountPercentage}% OFF`)}
              </span>
            ) : resolved.oldPrice && resolved.oldPrice > resolved.price ? (
              <span className="detail-info__discount-badge">
                SAVE {Math.round(((resolved.oldPrice - resolved.price) / resolved.oldPrice) * 100)}%
              </span>
            ) : null}
          </div>
          <p className="detail-info__tax-note">Inclusive of all taxes</p>

          {availableCoupons.length > 0 && (
            <section className="detail-coupons" aria-label="Available coupons">
              <div className="detail-coupons__heading">
                <span>Available coupons</span>
                <small>Apply at checkout</small>
              </div>
              <div className="detail-coupons__list">
                {availableCoupons.map(coupon => {
                  const isHighlighted = String(coupon.code || '').toUpperCase() === String(highlightedCouponCode || '').toUpperCase();
                  return (
                  <button
                    type="button"
                    key={coupon.id || coupon.code}
                    ref={isHighlighted ? highlightedCouponRef : null}
                    className={`detail-coupon${isHighlighted ? ' is-highlighted' : ''}`}
                    onClick={() => copyCouponCode(coupon.code)}
                    title={`Copy ${coupon.code}`}
                  >
                    <strong>{coupon.code}</strong>
                    <span>{coupon.description || (coupon.type === 'flat' ? `₹${coupon.discountValue} off` : `${coupon.discountValue}% off`)}</span>
                  </button>
                  );
                })}
              </div>
            </section>
          )}

          <p className="detail-info__description">{resolved.description}</p>

          {/* Action configurations */}
          <div className="detail-info__quantity-row">
            <span className="detail-info__quantity-label">Quantity</span>
            <div className="detail-qty-picker">
              <button 
                type="button" 
                onClick={() => updateQuantity(selectedQuantity - 1)} 
                disabled={selectedQuantity <= 1 || !isAvailable || requiresVariantSelection}
              >
                -
              </button>
              <span>{isAvailable ? selectedQuantity : 0}</span>
              <button 
                type="button" 
                onClick={() => updateQuantity(selectedQuantity + 1)}
                disabled={selectedQuantity >= resolved.stockCount || !isAvailable || requiresVariantSelection}
              >
                +
              </button>
            </div>
          </div>

          <div className="detail-info__actions-container">
            {!isAvailable && !requiresVariantSelection ? (
              <>
                <button
                  type="button"
                  className="btn-action btn-prebook"
                  onClick={() => onBuyNow && onBuyNow({ ...buildSelectedProduct(), isPreorder: true }, 1)}
                >
                  Pre-book Now
                </button>
                <button
                  type="button"
                  className="btn-action btn-add-to-wishlist"
                  onClick={() => onToggleWishlist && onToggleWishlist(product)}
                  style={isWishlisted ? { background: '#2d5a1b', color: '#ffffff', borderColor: '#2d5a1b' } : {}}
                >
                  {isWishlisted ? "Remove Wishlist" : "Add to Wishlist"}
                </button>
              </>
            ) : <>
            <button 
              type="button" 
              className="btn-action btn-add-to-cart"
              onClick={handleCartAction}
              disabled={!isAvailable && !requiresVariantSelection}
            >
              {!isAvailable && !requiresVariantSelection ? "Sold Out" : getCartButtonText()}
            </button>
            <button 
              type="button" 
              className="btn-action btn-add-to-wishlist"
              onClick={() => onToggleWishlist && onToggleWishlist(product)}
              style={isWishlisted ? { background: '#2d5a1b', color: '#ffffff', borderColor: '#2d5a1b' } : {}}
            >
              {isWishlisted ? "Remove Wishlist" : "Add to Wishlist"}
            </button>
            <button 
              type="button" 
              className="btn-action btn-buy-now"
              onClick={() => {
                if (requiresVariantSelection) {
                  setVariantPickerAction('buy');
                  return;
                }
                if (onBuyNow) {
                  onBuyNow(buildSelectedProduct(), quantity);
                } else {
                  if (onAddToCart) {
                    onAddToCart(buildSelectedProduct(), quantity);
                  }
                  onNavigate && onNavigate("checkout");
                }
              }}
              disabled={!isAvailable && !requiresVariantSelection}
            >
              {!isAvailable && !requiresVariantSelection ? "Sold Out" : "Buy It Now"}
            </button>
            </>}
          </div>

          <div className="detail-info__categories" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            {product.category && (
              <div>
                <span className="label">Categories:</span>
                <span className="value"> {product.category}</span>
              </div>
            )}
            {(product.brand || product.raw?.brand?.name || product.raw?.Brand?.name) && (
              <div>
                <span className="label">Brand:</span>
                <span className="value"> {product.brand || product.raw?.brand?.name || product.raw?.Brand?.name}</span>
              </div>
            )}
          </div>
        </div>

        {variantPickerAction && createPortal(
          <div className="detail-variant-modal-backdrop" role="presentation" onMouseDown={() => setVariantPickerAction(null)}>
            <section className="detail-variant-modal" role="dialog" aria-modal="true" aria-labelledby="detail-variant-modal-title" onMouseDown={event => event.stopPropagation()}>
              <button type="button" className="detail-variant-modal-close" aria-label="Close variant selector" onClick={() => setVariantPickerAction(null)}>×</button>
              <div className="detail-variant-modal-product">
                {product.thumb && <img src={product.thumb} alt="" />}
                <div>
                  <p>Choose options</p>
                  <h3 id="detail-variant-modal-title">{product.name}</h3>
                </div>
              </div>

              {Object.keys(variantGroups).map(type => {
                const activeVal = selectedAttributes[type];
                const activeVar = (product?.variants || []).find(variant => variant.variantType === type && variant.variantValue === activeVal);
                const capacities = activeVar ? parseCapacityOptions(activeVar.subOptions) : [];
                return (
                  <div key={type} className="detail-variant-modal-section">
                    <span>{type}</span>
                    <div className="detail-variant-modal-options">
                      {variantGroups[type].map(value => {
                        const option = (product?.variants || []).find(variant => variant.variantType === type && variant.variantValue === value);
                        const unavailable = Number(option?.stock || 0) <= 0;
                        return <button type="button" key={value} disabled={unavailable} className={selectedAttributes[type] === value ? 'is-selected' : ''} onClick={() => handleSelectAttribute(type, value)}>{value}{unavailable ? ' · Out of stock' : ''}</button>;
                      })}
                    </div>
                    {capacities.length > 0 && (
                      <div className="detail-variant-modal-capacity">
                        <span>Capacity</span>
                        <div className="detail-variant-modal-options">
                          {capacities.map(capacity => <button type="button" key={capacity.value} className={selectedCapacity === capacity.value ? 'is-selected' : ''} onClick={() => { setSelectedCapacity(capacity.value); setActiveImage(0); }}>{capacity.value}</button>)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="detail-variant-modal-actions">
                <button type="button" className="detail-variant-modal-add" disabled={requiresVariantSelection || !isAvailable} onClick={() => completeVariantSelection('cart')}>
                  Add to Cart
                </button>
                <button type="button" className="detail-variant-modal-buy" disabled={requiresVariantSelection || !isAvailable} onClick={() => completeVariantSelection('buy')}>
                  Buy Now
                </button>
                <button type="button" className="detail-variant-modal-wishlist" onClick={() => onToggleWishlist && onToggleWishlist(product)}>
                  {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                </button>
              </div>
            </section>
          </div>, document.body
        )}
      </div>

      {/* ─── Description / Specifications / Reviews Tabs ─── */}
      <div className="detail-tabs-section">
        <div className="detail-tabs-nav">
          {['description', 'specifications', 'reviews'].map(tab => (
            <button
              key={tab}
              type="button"
              className={`detail-tab-btn ${activeTab === tab ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'description' && 'Description'}
              {tab === 'specifications' && 'Specifications'}
              {tab === 'reviews' && `Reviews (${reviews.length})`}
            </button>
          ))}
        </div>

        <div className="detail-tab-content">
          {activeTab === 'description' && (
            <div className="detail-tab-pane">
              {resolved.description ? (
                <p className="detail-tab-description-text">{resolved.description}</p>
              ) : (
                <p className="detail-tab-empty">No description available.</p>
              )}
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="detail-tab-pane">
              {product.specifications && product.specifications.length > 0 ? (
                <table className="detail-specs-table">
                  <tbody>
                    {product.specifications.map((spec, i) => (
                      <tr key={i}>
                        <td className="spec-label">{spec.heading || `Spec ${i + 1}`}</td>
                        <td className="spec-value">{spec.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="detail-tab-empty">No specifications available for this product.</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="detail-tab-pane">
              {reviews.length === 0 ? (
                <p className="detail-tab-empty">No reviews yet. Be the first to share your experience!</p>
              ) : (() => {
                const averageRating = reviews.length > 0
                  ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
                  : 0;

                const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
                  const count = reviews.filter(r => r.rating === stars).length;
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return { stars, count, pct };
                });

                return (
                  <div className="reviews-section-layout">
                    {/* Left Column: Premium Summary Dashboard Card */}
                    <div className="reviews-summary-card">
                      <div className="reviews-summary__avg-box">
                        <span className="reviews-summary__avg-num">{averageRating}</span>
                        <div className="reviews-summary__stars-wrap">
                          {renderStars(Math.round(Number(averageRating)))}
                        </div>
                        <span className="reviews-summary__count">Based on {reviews.length} Review{reviews.length > 1 ? 's' : ''}</span>
                      </div>

                      <div className="reviews-summary__divider" />

                      <div className="reviews-summary__distribution">
                        {ratingDistribution.map(dist => (
                          <div className="dist-row" key={dist.stars}>
                            <span className="dist-label">{dist.stars} Star</span>
                            <div className="dist-bar-bg">
                              <div className="dist-bar-fill" style={{ width: `${dist.pct}%` }} />
                            </div>
                            <span className="dist-count">{dist.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Premium Timeline Reviews List */}
                    <div className="reviews-timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {reviews.slice(reviewPage * 2, (reviewPage + 1) * 2).map(review => {
                        const hasImages = (() => {
                          try {
                            const imgs = JSON.parse(review.images);
                            return Array.isArray(imgs) && imgs.length > 0;
                          } catch { return false; }
                        })();
                        
                        const imgs = hasImages ? JSON.parse(review.images) : [];
                        const authorName = review.customerInfo?.name || 'Verified Customer';
                        const initials = authorName.charAt(0).toUpperCase();

                        return (
                          <div className="timeline-review-card" key={review.id}>
                            <div className="timeline-review-card__header">
                              <div className="timeline-review-card__user">
                                <div className="timeline-review-card__avatar">{initials}</div>
                                <div className="timeline-review-card__meta">
                                  <span className="timeline-review-card__name">{authorName}</span>
                                  <span className="timeline-review-card__date">
                                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                              <div className="timeline-review-card__rating">
                                {renderStars(review.rating)}
                              </div>
                            </div>

                            <div className="timeline-review-card__body">
                              <p className="timeline-review-card__text">“{review.feedback}”</p>
                              
                              {hasImages && (
                                <div className="timeline-review-card__attachments">
                                  {imgs.map((img, i) => (
                                    <div className="timeline-review-card__img-wrap" key={i}>
                                      <a href={`${IMG}/${img}`} target="_blank" rel="noopener noreferrer">
                                        <img src={`${IMG}/${img}`} alt="Review attachment" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {reviews.length > 2 && (
                        <div className="reviews-pagination" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setReviewPage(prev => Math.max(0, prev - 1))}
                            disabled={reviewPage === 0}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: reviewPage === 0 ? 'not-allowed' : 'pointer', opacity: reviewPage === 0 ? 0.4 : 1 }}
                          >
                            <FiChevronLeft size={16} />
                          </button>
                          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>
                            {reviewPage + 1} / {Math.ceil(reviews.length / 2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReviewPage(prev => Math.min(Math.ceil(reviews.length / 2) - 1, prev + 1))}
                            disabled={reviewPage >= Math.ceil(reviews.length / 2) - 1}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #ccc', background: '#fff', cursor: reviewPage >= Math.ceil(reviews.length / 2) - 1 ? 'not-allowed' : 'pointer', opacity: reviewPage >= Math.ceil(reviews.length / 2) - 1 ? 0.4 : 1 }}
                          >
                            <FiChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Related Section Grid */}
      <div className="related-section">
        <h2>Related Products</h2>
        {displayRelated.length > 0 ? (
          <div className="related-grid">
            {displayRelated.map((item) => {
              const relatedInCart = cart.some((cartItem) => cartItem.id === item.id);
              const relatedWishlisted = wishlist.some((wishItem) => wishItem.id === item.id);

              const badgeText =
                item.dealActive && item.activePromo
                  ? (item.activePromo.type === 'banner' && item.activePromo.data.discountTag 
                      ? `${item.activePromo.data.discountTag} | ${item.activePromo.data.discountType === 'FLAT' ? '₹' + item.activePromo.data.discountValue + ' OFF' : (item.activePromo.data.discountValue || item.activePromo.data.discountPercentage) + '% OFF'}`
                      : (item.activePromo.data.discountType === 'FLAT' 
                          ? `₹${item.activePromo.data.discountValue} OFF` 
                          : `${item.activePromo.data.discountValue || item.activePromo.data.discountPercentage}% OFF`))
                  : item.oldPrice
                  ? `-${Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)}%`
                  : null;

              return (
                <ProductCard
                  key={item.id}
                  product={item}
                  badge={badgeText}
                  onProductClick={onProductClick}
                  onAddToCart={onAddToCart}
                  onAddToWishlist={onToggleWishlist}
                  isInCart={relatedInCart}
                  isWishlisted={relatedWishlisted}
                  onViewCart={() => onNavigate && onNavigate("cart")}
                />
              );
            })}
          </div>
        ) : (
          <div className="related-empty-box">
            <p className="related-empty-msg">There are no related products in this category.</p>
            <button
              type="button"
              className="related-view-all-btn"
              onClick={() => onNavigate && onNavigate("shop")}
            >
              View All Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
