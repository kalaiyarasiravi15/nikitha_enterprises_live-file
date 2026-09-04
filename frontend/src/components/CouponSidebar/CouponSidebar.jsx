import React, { useState } from 'react';
import { RiCoupon3Line, RiCloseLine, RiFileCopyLine, RiCheckLine } from 'react-icons/ri';
import './CouponSidebar.css';
import { toast } from 'react-toastify';
import { IMG } from '../../config';

const CouponSidebar = ({ coupons = [], onNavigate, onProductClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  if (!coupons || coupons.length === 0) return null;

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleCopyCode = (id, code) => {
    if (!code) return;
    sessionStorage.setItem('at_pending_coupon_code', code);
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedId(id);
    toast.success(`Coupon ${code} copied!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShopNow = (coupon) => {
    setIsOpen(false);
    if (coupon.code) {
      sessionStorage.setItem('at_pending_coupon_code', coupon.code);
      navigator.clipboard?.writeText(coupon.code).catch(() => {});
    }
    
    // If it's a product-specific coupon
    const targetProdId = coupon.productId || coupon.productIdToLink || coupon.targetProductId;
    if (targetProdId && onProductClick) {
      onProductClick(Number(targetProdId), { couponCode: coupon.code });
      return;
    }

    if (onNavigate) {
      onNavigate('shop');
    }
  };

  const productImage = (coupon) => {
    const image = coupon.product?.mainImage;
    return image ? (image.startsWith('http') ? image : `${IMG}/${image.replace(/^\/+/, '')}`) : '';
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        className={`coupon-toggle-btn ${isOpen ? 'hidden' : ''}`} 
        onClick={toggleSidebar}
        aria-label="View Coupons"
      >
        <span className="coupon-toggle-text">Available Coupons</span>
      </button>

      {/* Overlay */}
      {isOpen && <div className="coupon-sidebar-overlay" onClick={toggleSidebar}></div>}

      {/* Sidebar Panel */}
      <div className={`coupon-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="coupon-sidebar-header">
          <div className="coupon-sidebar-title">
            <RiCoupon3Line />
            <h3>Available Coupons</h3>
          </div>
          <button className="coupon-close-btn" onClick={toggleSidebar} aria-label="Close Coupons">
            <RiCloseLine />
          </button>
        </div>

        <div className="coupon-sidebar-body">
          {coupons.map((coupon, idx) => (
            <div key={coupon.id || idx} className="coupon-card">
              {coupon.targetType === 'PRODUCT' && coupon.product && (
                <div className="coupon-product-link">
                  {productImage(coupon) ? <img src={productImage(coupon)} alt="" /> : <span>Product</span>}
                  <strong>{coupon.product.name}</strong>
                </div>
              )}
              <div className="coupon-card-top">
                <span className="coupon-discount-badge">
                  {coupon.type === 'flat' ? `FLAT ₹${coupon.discountValue} OFF` : `${coupon.discountValue}% OFF`}
                </span>
                <div className="coupon-code-box">
                  <strong>{coupon.code}</strong>
                  <button 
                    className="coupon-copy-btn"
                    onClick={() => handleCopyCode(coupon.id || idx, coupon.code)}
                    title="Copy Code"
                  >
                    {copiedId === (coupon.id || idx) ? <RiCheckLine className="copied-icon" /> : <RiFileCopyLine />}
                  </button>
                </div>
              </div>
              <p className="coupon-desc">
                {coupon.description || 'Use this code at checkout to get an instant discount!'}
              </p>
              <button 
                className="coupon-shop-btn"
                onClick={() => handleShopNow(coupon)}
              >
                {coupon.targetType === 'PRODUCT' ? 'BUY NOW' : 'SHOP NOW'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CouponSidebar;
