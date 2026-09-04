import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ProductSliders.css';
import '../Products/Products.css';
import { FiHeart, FiEye } from 'react-icons/fi';
import { API, formatBackendProduct } from '../../config';

function SliderHeading({ title }) {
  return (
    <div className="prod-section-header">
      <span className="prod-header-line prod-header-line-left" />
      <h2 className="prod-section-title">{title}</h2>
      <span className="prod-header-line prod-header-line-right" />
    </div>
  );
}

const getPromotionText = (product) => {
  const percentage = Number(product.discountPercentage || 0);
  const source = product.promotionSource === 'Offer Banner'
    ? (product.promotionLabel || 'OFFER')
    : 'DEAL OF THE DAY';
  return product.promotionDiscountType === 'FLAT'
    ? `${source} | ₹${product.promotionDiscountValue} OFF`
    : `${source} | ${percentage}% OFF`;
};

export function ProductCard({ product, onProductClick, onAddToCart, onBuyNow, onAddToWishlist, isInCart, isWishlisted, onViewCart, badge, style, className, dataReveal, isBuyNow }) {
  if (!product) return null;
  const selectableVariants = Array.isArray(product.variants)
    ? product.variants.filter(variant => variant.variantType && variant.variantValue)
    : [];
  const hasVariants = selectableVariants.length > 0;
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedSubOption, setSelectedSubOption] = useState(null);
  const stockCount = Number(product.stockLeft || 0);
  const isOutOfStock = !product.inStock || stockCount === 0;
  const isLowStock = !isOutOfStock && stockCount <= 10;
  const selectedVariant = selectableVariants.find(variant => String(variant.id) === String(selectedVariantId)) || null;
  const selectedSubOptions = Array.isArray(selectedVariant?.subOptions)
    ? selectedVariant.subOptions.filter(Boolean)
    : [];
  const canAddSelectedVariant = Boolean(selectedVariant)
    && Number(selectedVariant.stock || 0) > 0
    && (!selectedSubOptions.length || Boolean(selectedSubOption));

  const openVariantPicker = () => {
    setSelectedVariantId(null);
    setSelectedSubOption(null);
    setShowVariantPicker(true);
  };

  const addSelectedVariant = () => {
    if (!canAddSelectedVariant) return;
    const selectedProduct = {
      ...product,
      selectedVariantId: selectedVariant.id,
      selectedCapacity: selectedSubOption || null,
      variantId: selectedVariant.id,
      selectedSubOption: selectedSubOption || null,
      price: Number(selectedVariant.salesPrice ?? selectedVariant.mrpPrice ?? product.price),
      oldPrice: Number(selectedVariant.mrpPrice ?? product.oldPrice ?? product.price),
      thumb: selectedVariant.mainImage || product.thumb,
      stockLeft: Number(selectedVariant.stock || 0),
      inStock: Number(selectedVariant.stock || 0) > 0,
    };
    setShowVariantPicker(false);
    if (isBuyNow) onBuyNow && onBuyNow(selectedProduct, 1);
    else onAddToCart && onAddToCart(selectedProduct, 1);
  };

  return (
    <div
      className={`product-card ${className || ''}`}
      onClick={() => onProductClick && onProductClick(product.id)}
      style={style}
      {...(dataReveal ? { 'data-reveal': true } : {})}
    >
      <div className="product-img-wrap">
        {/* Product Badges positioned cleanly inside Image container */}
        {product.promotionSource && (
          <span className="prod-badge" style={{ backgroundColor: '#e63946' }}>{getPromotionText(product)}</span>
        )}
        {!product.promotionSource && !product.dealActive && Number(product.discountPercentage || 0) > 0 && (
          <span className="prod-badge">{product.discountPercentage}% OFF</span>
        )}
        {!product.promotionSource && product.dealActive && product.activePromo ? (
          <span className="prod-badge" style={{ backgroundColor: '#e63946' }}>
            {product.activePromo.type === 'banner' && product.activePromo.data.discountTag
              ? `${product.activePromo.data.discountTag} | ${product.activePromo.data.discountType === 'FLAT' ? '₹' + product.activePromo.data.discountValue + ' OFF' : (product.activePromo.data.discountValue || product.activePromo.data.discountPercentage) + '% OFF'}`
              : (product.activePromo.data.discountType === 'FLAT' 
                  ? `₹${product.activePromo.data.discountValue} OFF` 
                  : `${product.activePromo.data.discountValue || product.activePromo.data.discountPercentage}% OFF`)}
          </span>
        ) : !product.promotionSource && !product.dealActive && !Number(product.discountPercentage || 0) && badge ? (
          <span className="prod-badge">{badge}</span>
        ) : null}

        {/* Wishlist Button inside top-right corner of image */}
        <button
          className={`prod-wish-btn ${isWishlisted ? 'is-wishlisted' : ''}`}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          onClick={(e) => {
            e.stopPropagation();
            onAddToWishlist && onAddToWishlist(product);
          }}
        >
          <FiHeart style={{ fill: isWishlisted ? '#2d5a1b' : 'none' }} />
        </button>

        <img
          src={product.thumb || (product.images && product.images[0])}
          alt={product.name}
          className="product-img"
          loading="lazy"
        />

        <div className="product-overlay">
          <button
            className={`overlay-btn ${isWishlisted ? 'is-active' : ''}`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            onClick={(e) => {
              e.stopPropagation();
              onAddToWishlist && onAddToWishlist(product);
            }}
          >
            <FiHeart style={{ fill: isWishlisted ? '#fff' : 'none' }} />
          </button>
          <button
            className="overlay-btn"
            title="Quick View"
            onClick={(e) => {
              e.stopPropagation();
              onProductClick && onProductClick(product.id);
            }}
          >
            <FiEye />
          </button>
        </div>
      </div>

      <p className="product-name">{product.name}</p>

      <div className={`product-stock-note ${isOutOfStock ? 'out' : isLowStock ? 'low' : 'in'}`}>
        {isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${stockCount} left` : 'In Stock'}
      </div>

      <div className="product-price-container">
        <span className="product-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
        {product.oldPrice && (
          <span className="product-old-price">₹{Number(product.oldPrice).toLocaleString('en-IN')}</span>
        )}
      </div>

      <button
        className="direct-add-to-cart-btn shimmer-btn"
        disabled={isOutOfStock}
        onClick={(e) => {
          e.stopPropagation();
          if (isOutOfStock) return;
          if (hasVariants) return openVariantPicker();
          if (isBuyNow) {
            onBuyNow && onBuyNow(product, 1);
            return;
          }
          isInCart ? onViewCart && onViewCart() : onAddToCart && onAddToCart(product);
        }}
      >
        {isOutOfStock ? 'OUT OF STOCK' : isBuyNow ? 'BUY NOW' : isInCart ? 'VIEW CART' : 'ADD TO CART'}
      </button>

      <div className="prod-stars">
        {'★★★★★'.split('').map((s, i) => (
          <span key={i} style={{ color: i < 4 ? '#FFCC00' : '#dddddd' }}>{s}</span>
        ))}
      </div>

      {showVariantPicker && createPortal(
        <div className="variant-picker-backdrop" role="presentation" onMouseDown={() => setShowVariantPicker(false)}>
          <section className="variant-picker-modal" role="dialog" aria-modal="true" aria-labelledby={`variant-title-${product.id}`} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="variant-picker-close" aria-label="Close options" onClick={() => setShowVariantPicker(false)}>×</button>
            <div className="variant-picker-product">
              {product.thumb && <img src={product.thumb} alt="" />}
              <div>
                <p>Choose options</p>
                <h3 id={`variant-title-${product.id}`}>{product.name}</h3>
              </div>
            </div>

            <div className="variant-picker-section">
              <span className="variant-picker-label">Select {selectableVariants[0]?.variantType || 'variant'}</span>
              <div className="variant-option-grid">
                {selectableVariants.map(variant => {
                  const unavailable = Number(variant.stock || 0) <= 0;
                  return (
                    <button
                      type="button"
                      key={variant.id}
                      disabled={unavailable}
                      className={`variant-option-button${String(selectedVariantId) === String(variant.id) ? ' is-selected' : ''}`}
                      onClick={() => { setSelectedVariantId(variant.id); setSelectedSubOption(null); }}
                    >
                      <strong>{variant.name || variant.variantValue}</strong>
                      <span>{unavailable ? 'Out of stock' : `₹${Number(variant.salesPrice ?? variant.mrpPrice ?? product.price).toLocaleString('en-IN')}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedVariant && selectedSubOptions.length > 0 && (
              <div className="variant-picker-section">
                <span className="variant-picker-label">Select option</span>
                <div className="variant-suboption-grid">
                  {selectedSubOptions.map(option => (
                    <button type="button" key={option} className={`variant-suboption-button${selectedSubOption === option ? ' is-selected' : ''}`} onClick={() => setSelectedSubOption(option)}>{option}</button>
                  ))}
                </div>
              </div>
            )}

            <button type="button" className="variant-picker-add" disabled={!canAddSelectedVariant} onClick={addSelectedVariant}>
              {isBuyNow ? 'Buy Now' : 'Add selected option to cart'}
            </button>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

export function ProductCarousel({ title, products, badge, onProductClick, onAddToCart, onBuyNow, onAddToWishlist, wishlist, cart, onViewCart, onShopClick, isBuyNow }) {
  const isInCart     = (id) => cart.some(item => item.id === id);
  const isWishlisted = (id) => wishlist.some(item => item.id === id);

  if (!products || products.length === 0) return null;

  // Quadruple products array for seamless infinite marquee loop with zero hitch
  const marqueeProducts = [...products, ...products, ...products, ...products];

  return (
    <section className="product-carousel-wrapper">
      <SliderHeading title={title} />
      
      <div className="carousel-container-outer">
        <div className="continuous-marquee-wrapper">
          <div className="continuous-marquee-track">
            {marqueeProducts.map((product, idx) => (
              <ProductCard
                key={`${product.id}-${idx}`}
                product={product}
                badge={badge}
                onProductClick={onProductClick}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                onAddToWishlist={onAddToWishlist}
                isInCart={isInCart(product.id)}
                isWishlisted={isWishlisted(product.id)}
                onViewCart={onViewCart}
                isBuyNow={isBuyNow}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="carousel-view-all-wrap">
        <button className="carousel-view-all-btn" onClick={onShopClick}>
          VIEW ALL PRODUCTS
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
    </section>
  );
}

export default function ProductSliders({ onProductClick, onAddToCart, onBuyNow, onAddToWishlist, wishlist = [], cart = [], onViewCart, onShopClick, isBuyNow }) {
  const [collections, setCollections] = useState({
    bestSellers: [],
    newArrivals: [],
    topRated: []
  });

  useEffect(() => {
    fetch(`${API}/collections/all`)
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        const best = Array.isArray(data.bestSellers) 
          ? data.bestSellers.map(i => formatBackendProduct(i.product)).filter(Boolean) 
          : [];
        const newArr = Array.isArray(data.newArrivals) 
          ? data.newArrivals.map(i => formatBackendProduct(i.product)).filter(Boolean) 
          : [];
        const top = Array.isArray(data.topRated) 
          ? data.topRated.map(i => formatBackendProduct(i.product)).filter(Boolean) 
          : [];
        setCollections({ bestSellers: best, newArrivals: newArr, topRated: top });
      })
      .catch(err => console.error('Error loading slider collections:', err));
  }, []);

  return (
    <div className="home-product-sliders">
      <ProductCarousel
        title="Best Sellers"
        products={collections.bestSellers}
        badge="BESTSELLER"
        onProductClick={onProductClick}
        onAddToCart={onAddToCart}
        onAddToWishlist={onAddToWishlist}
        wishlist={wishlist}
        cart={cart}
        onViewCart={onViewCart}
        onShopClick={onShopClick}
      />
      <ProductCarousel
        title="New Arrivals"
        products={collections.newArrivals}
        badge="NEW ARRIVAL"
        onProductClick={onProductClick}
        onAddToCart={onAddToCart}
        onAddToWishlist={onAddToWishlist}
        wishlist={wishlist}
        cart={cart}
        onViewCart={onViewCart}
        onShopClick={onShopClick}
      />
      <ProductCarousel
        title="Top Rated"
        products={collections.topRated}
        badge="TOP RATED"
        onProductClick={onProductClick}
        onAddToCart={onAddToCart}
        onAddToWishlist={onAddToWishlist}
        wishlist={wishlist}
        cart={cart}
        onViewCart={onViewCart}
        onShopClick={onShopClick}
      />
    </div>
  );
}
