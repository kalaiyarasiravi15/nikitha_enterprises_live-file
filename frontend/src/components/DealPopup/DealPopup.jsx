import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiTimeLine, RiCoupon3Line, RiArrowLeftSLine, RiArrowRightSLine, RiFileCopyLine, RiCheckLine } from 'react-icons/ri';
import './DealPopup.css';
import { IMG } from '../../config';

const DealPopup = ({ deals = [], banners = [], coupons = [], onNavigate, onProductClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. Build the queue on mount/update
  useEffect(() => {
    const hasShown = sessionStorage.getItem('at_promos_popup_shown');
    if (hasShown) return;

    const newQueue = [];
    deals.forEach(d => {
      if (d.isActive) newQueue.push({ type: 'deal', data: d });
    });
    banners.forEach(b => {
      if (b.isActive) newQueue.push({ type: 'banner', data: b });
    });

    if (newQueue.length > 0) {
      setQueue(newQueue);
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('at_promos_popup_shown', 'true');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [deals, banners, coupons]);

  // 2. Timer for current item if applicable
  useEffect(() => {
    if (!isOpen || queue.length === 0) return;

    const currentItem = queue[currentIndex];
    const expiry = currentItem?.data?.expiryDate || currentItem?.data?.endDate;

    if (!expiry) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const difference = new Date(expiry) - new Date();
      if (difference <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}h : ${minutes
          .toString()
          .padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen, queue, currentIndex]);

  if (!isOpen || queue.length === 0 || currentIndex >= queue.length) return null;

  const currentItem = queue[currentIndex];
  const { type, data } = currentItem;

  const handleClose = () => setIsOpen(false);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : queue.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < queue.length - 1 ? prev + 1 : 0));
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = () => {
    setIsOpen(false);

    const targetProdId = data.productId || data.productIdToLink || data.targetProductId;
    if (targetProdId && onProductClick) {
      onProductClick(Number(targetProdId));
      return;
    }

    const link = data.buttonLink || data.link || '';
    if (link) {
      const cleanLink = link.replace(/^\//, '');
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

  const dealImg = data.image ? (data.image.startsWith('http') ? data.image : `${IMG}/${data.image}`) : '';

  return (
    <div className="dp-overlay" onClick={handleClose}>
      <div className="dp-modal" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button className="dp-close" onClick={handleClose} aria-label="Close">
          <RiCloseLine />
        </button>

        {/* Navigation Arrows */}
        {queue.length > 1 && (
          <>
            <button className="dp-nav-btn dp-nav-prev" onClick={handlePrev} aria-label="Previous Offer">
              <RiArrowLeftSLine />
            </button>
            <button className="dp-nav-btn dp-nav-next" onClick={handleNext} aria-label="Next Offer">
              <RiArrowRightSLine />
            </button>
          </>
        )}

        {/* Deal or Banner Render */}
        <div className="dp-layout">
          <div className="dp-image-section">
            {dealImg ? <img src={dealImg} alt={data.title} className="dp-banner" /> : <div className="dp-banner-placeholder" />}
            <div className="dp-discount-badge">
              <span className="dp-badge-title">{type === 'deal' ? 'DEAL' : 'OFFER'}</span>
              <span className="dp-badge-val">
                {data.discountType === 'FLAT' ? `FLAT ₹${data.discountValue}` : `${data.discountValue}% OFF`}
              </span>
            </div>
          </div>

          <div className="dp-content-section">
            <span className="dp-tag">{type === 'deal' ? 'DEAL OF THE DAY' : 'SPECIAL OFFER'}</span>
            <h2 className="dp-title serif-heading">{data.title}</h2>
            <p className="dp-desc">{data.description || data.subtitle || 'Limited-time offer — shop before it ends!'}</p>

            {timeLeft && timeLeft !== 'Expired' && (
              <div className="dp-timer-wrapper">
                <span className="dp-timer-label">
                  <RiTimeLine /> Offer Ends In:
                </span>
                <div className="dp-countdown font-mono">{timeLeft}</div>
              </div>
            )}

            <button className="dp-btn-action ripple-btn" onClick={handleAction}>
              {data.buttonText || 'SHOP NOW'}
            </button>
          </div>
        </div>

        {/* Slide Indicators Dots */}
        {queue.length > 1 && (
          <div className="dp-dots-bar">
            {queue.map((item, idx) => (
              <button
                key={idx}
                className={`dp-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Offer ${idx + 1}`}
              />
            ))}
            <span className="dp-counter-text">{currentIndex + 1} / {queue.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealPopup;
