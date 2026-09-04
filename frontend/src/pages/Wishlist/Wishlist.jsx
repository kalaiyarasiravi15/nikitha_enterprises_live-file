import React from "react";
import "./Wishlist.css";
import { FiShoppingCart } from "react-icons/fi";

export default function Wishlist({ wishlist = [], cart = [], onRemoveFromWishlist, onAddToCart, onNavigate }) {
  
  const renderAnimatedTitle = (title) => {
    return title.split("").map((char, idx) => (
      <span 
        key={idx} 
        className="hero-title__letter" 
        style={{ animationDelay: `${idx * 0.06}s` }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  const formatPrice = (value) => {
    return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="wishlist-page">
      {/* Page Hero Header */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">{renderAnimatedTitle("My Wishlist")}</h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Wishlist</span>
          </nav>
        </div>
      </div>

      <div className="wishlist-body">
        {wishlist.length === 0 ? (
          <div className="wishlist-empty">
            <p>Your wishlist is currently empty.</p>
            <button className="btn-continue-shop" onClick={() => onNavigate && onNavigate("shop")}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map((item, index) => {
              const inCart = cart.some((cartItem) => cartItem.id === item.id);

              return (
                <div 
                  className="wishlist-card" 
                  key={item.id} 
                  style={{ "--index": index }}
                  data-reveal
                >
                  <div className="wishlist-img-wrap">
                    <img src={item.thumb} alt={item.name} className="wishlist-img" />
                    <button 
                      className="wishlist-remove" 
                      onClick={() => onRemoveFromWishlist && onRemoveFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="wishlist-info">
                    <h3 className="wishlist-name" title={item.name}>{item.name}</h3>
                    <div className="wishlist-price-row">
                      <span className="wishlist-price">{formatPrice(item.price)}</span>
                      {item.oldPrice && (
                        <span className="wishlist-old-price">{formatPrice(item.oldPrice)}</span>
                      )}
                    </div>
                    {/* Re-added description element */}
                    {item.description && (
                      <p className="wishlist-desc" title={item.description}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="wishlist-actions">
                    <button 
                      className={"btn-add-cart" + (inCart ? " is-active" : "")}
                      onClick={() => inCart ? onNavigate && onNavigate("cart") : onAddToCart && onAddToCart(item)}
                    >
                      <FiShoppingCart />
                      <span>{inCart ? "View" : "Add"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}