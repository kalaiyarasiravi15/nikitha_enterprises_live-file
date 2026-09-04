import React from 'react';
import './OfferBanners.css';
import { IMG } from '../../config';

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="gifting-card-svg">
      <rect x="3" y="9" width="18" height="12" rx="2" ry="2"/>
      <line x1="12" y1="21" x2="12" y2="9"/>
      <line x1="3" y1="13" x2="21" y2="13"/>
      <path d="M12 9a3 3 0 1 0-3-3 3 3 0 1 0 6 0 3 3 0 1 0-3 3z"/>
    </svg>
  );
}

export default function OfferBanners({ banners = [], onNavigate, onProductClick }) {
  if (!Array.isArray(banners) || banners.length === 0) {
    return null;
  }

  const handleBannerClick = (b) => {
    const targetProdId = b.productId || b.productIdToLink || b.targetProductId;
    if (targetProdId && onProductClick) {
      onProductClick(Number(targetProdId));
      return;
    }

    if (b.link) {
      const cleanLink = b.link.replace(/^\//, '');
      if (cleanLink.startsWith('product/') || cleanLink.startsWith('shopdetail/')) {
        const prodId = cleanLink.split('/').pop();
        if (prodId && onProductClick) {
          onProductClick(Number(prodId));
          return;
        }
      }
      if (onNavigate) {
        onNavigate(cleanLink || 'shop');
        return;
      }
    }

    if (onNavigate) {
      onNavigate('shop');
    } else if (onProductClick) {
      onProductClick('shop');
    }
  };

  return (
    <section className="offer-banners-container">
      <div className="offer-banners-grid" style={{ gridTemplateColumns: banners.length === 1 ? '1fr' : '1fr 1fr' }}>
        {banners.map((b, i) => {
          const isGifting = i % 2 !== 0;
          const bgThemeClass = isGifting ? 'card-gifting' : 'card-healthy-cooking';
          const tagClass = isGifting ? 'tag-gifting' : 'tag-cooking';
          const bannerImg = b.image.startsWith('http') ? b.image : `${IMG}/${b.image}`;

          return (
            <div 
              key={b.id || b._id} 
              className={`hs-offer-card ${bgThemeClass}`}
              onClick={() => handleBannerClick(b)}
              style={{ cursor: 'pointer' }}
              data-aos="fade-up" 
              data-aos-delay={i * 120} 
              data-aos-duration="600"
            >
              <span className={`hs-offer-tag ${tagClass}`}>{b.discountTag || 'Offer'}</span>
              
              {isGifting ? (
                <div className="hs-offer-left flex-row-layout">
                  <div className="hs-offer-icon-col">
                    <GiftIcon />
                  </div>
                  <div className="hs-offer-text-col">
                    <h3 className="hs-offer-title serif-heading">{b.title}</h3>
                    <p className="hs-offer-desc">{b.subtitle}</p>
                    <button
                      className="hs-offer-btn btn-explore-gifts"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick(b);
                      }}
                    >
                      {b.buttonText || 'SHOP NOW'} &nbsp;&rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div className="hs-offer-left">
                  <h3 className="hs-offer-title serif-heading">{b.title}</h3>
                  <p className="hs-offer-desc">{b.subtitle}</p>
                  <button
                    className="hs-offer-btn btn-shop-cookware"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBannerClick(b);
                    }}
                  >
                    {b.buttonText || 'SHOP NOW'} &nbsp;&rarr;
                  </button>
                </div>
              )}

              <div className="hs-offer-right">
                <img
                  src={bannerImg}
                  alt={b.title}
                  className="hs-offer-img"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
