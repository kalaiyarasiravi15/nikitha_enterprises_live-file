import React from "react";
import "./Cart.css";
import { addRipple } from "../../components/Animation/Animation";

export default function Cart({ cart = [], onUpdateCartQuantity, onRemoveFromCart, onNavigate, onProductClick }) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  const formatPrice = (value) => {
    return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  };

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

  return (
    <div className="cart-page fade-in-up-page">
      {/* Page Hero Header - Consistent design */}
      <div className="page-hero" style={{ backgroundImage: `url('/herobanner.png')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">{renderAnimatedTitle("Shopping Cart")}</h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">Cart</span>
          </nav>
        </div>
      </div>

      <div className="cart-body">
        {cart.length === 0 ? (
          <div className="cart-empty">
            <p>Your shopping cart is currently empty.</p>
            <button className="btn-continue-shop" onClick={() => onNavigate && onNavigate("shop")}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Left side: Cart Items table */}
            <div className="cart-items-panel">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.cartItemId || item.id}>
                      <td className="td-product">
                        <img src={item.thumb} alt={item.name} className="cart-item-img" />
                        <div>
                          <span className="cart-item-name">{item.name}</span>
                          {item.bookingLabel && <span className="cart-offer-pill" style={{ marginLeft: 8 }}>{item.bookingLabel}</span>}
                          {item.offerLabel && <span className="cart-offer-pill">{item.offerLabel} {item.offerDiscountType === 'FLAT' ? `• ₹${item.offerDiscountValue} OFF` : item.offerPercent ? `• ${item.offerPercent}% OFF` : ''}</span>}
                          {Array.isArray(item.variants) && item.variants.some(v => v.variantType && v.variantValue) && !item.variantId && (
                            <button className="cart-select-variant" onClick={() => onProductClick && onProductClick(item.id)}>
                              Choose required variant
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="td-price">{formatPrice(item.price)}</td>
                      <td className="td-quantity">
                        <div className="qty-picker">
                          <button
                            onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(item.cartItemId || item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(item.cartItemId || item.id, item.quantity + 1)}
                            disabled={!item.isPreorder && Number(item.stockLeft || 0) <= item.quantity}
                            title={!item.isPreorder && Number(item.stockLeft || 0) <= item.quantity ? 'Maximum available stock reached' : 'Increase quantity'}
                          >+</button>
                        </div>
                      </td>
                      <td className="td-subtotal">{formatPrice(item.price * item.quantity)}</td>
                      <td className="td-remove">
                        <button
                          className="cart-remove-btn"
                          onClick={() => onRemoveFromCart && onRemoveFromCart(item.cartItemId || item.id)}
                          title="Remove item"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right side: Summary panel */}
            <div className="cart-summary-panel">
            <h2>Order Summary</h2>
            <div className="summary-row total-row">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

              <button className="btn-checkout ripple-btn" onClick={(e) => { addRipple(e); onNavigate && onNavigate("checkout"); }}>
                Proceed to Checkout
              </button>
              <button className="btn-shop-more" onClick={() => onNavigate && onNavigate("shop")}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
