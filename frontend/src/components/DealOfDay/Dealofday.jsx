import { useState, useEffect, useRef } from "react";
import "./Dealofday.css";
import { addRipple } from "../Animation/Animation";
import { API, IMG } from "../../config";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

function useCountdown(targetDate) {
  const calc = () => {
    if (!targetDate) return { h: "00", m: "00", s: "00" };
    const diff = Math.max(0, new Date(targetDate) - Date.now());
    return {
      h: String(Math.floor(diff / 3600000)).padStart(2, "0"),
      m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
      s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return time;
}

function DealSlide({ deal, onProductClick, isActive }) {
  const targetTime = new Date(deal.expiryDate);
  const { h, m, s } = useCountdown(targetTime);

  const productName = deal.title;
  const productDesc = deal.description;
  const discountText = deal.discountType === 'FLAT'
    ? `Get FLAT ₹${deal.discountValue} OFF Today!`
    : (deal.discountValue || deal.discountPercentage)
      ? `Get ${deal.discountValue || deal.discountPercentage}% OFF Today!`
      : "";
  const productImg = deal.image 
    ? (deal.image.startsWith('http') || deal.image.startsWith('/') ? deal.image : `${IMG}/${deal.image}`) 
    : "/goldenproduct.png";
  const btnText = deal.buttonText || "Shop Now";

  const handleCtaClick = (e) => {
    e && e.stopPropagation && e.stopPropagation();
    addRipple(e);

    // 1. Check if admin linked a specific product ID
    const targetProdId = deal.productId || deal.productIdToLink || deal.targetProductId;
    if (targetProdId) {
      if (onProductClick) {
        onProductClick(targetProdId);
        return;
      }
    }

    // 2. Check buttonLink
    if (deal && deal.buttonLink) {
      if (deal.buttonLink.startsWith("http")) {
        window.open(deal.buttonLink, "_blank");
        return;
      }
      const cleanLink = deal.buttonLink.replace(/^\//, "");
      if (cleanLink.startsWith("product/") || cleanLink.startsWith("shopdetail/")) {
        const prodId = cleanLink.split("/").pop();
        if (prodId && onProductClick) {
          onProductClick(prodId);
          return;
        }
      }
      if (cleanLink && cleanLink !== "shop") {
        if (onProductClick) {
          onProductClick(cleanLink);
          return;
        }
      }
    }

    // 3. Fallback: navigate to shop page
    if (onProductClick) {
      onProductClick("shop");
    }
  };

  return (
    <div className={`dotd-slide ${isActive ? 'active' : ''}`}>
      <div className="dotd-inner">
        {/* ── LEFT GRID COLUMN (Content Slide-In) ── */}
        <div className="dotd-left" data-reveal>
          <div className="dotd-heading-row">
            <div className="dotd-accent-line" />
            <h2 className="dotd-heading">DEALS OF THE DAY</h2>
          </div>

          <h3 className="dotd-product-name" onClick={handleCtaClick} style={{ cursor: 'pointer' }}>{productName}</h3>
          {discountText && <p className="dotd-discount-text" style={{ color: "var(--accent)", fontWeight: "bold", fontSize: "14px", marginTop: "-12px", marginBottom: "12px" }}>{discountText}</p>}

          <p className="dotd-desc">{productDesc}</p>

          <div className="dotd-countdown-wrap">
            <p className="dotd-expires-label">DEAL ENDS IN :</p>
            <div className="dotd-countdown">
              <div className="dotd-unit">
                <span className="dotd-digit" key={h}>{h}</span>
                <span className="dotd-unit-label">Hours</span>
              </div>
              <span className="dotd-colon">:</span>
              <div className="dotd-unit">
                <span className="dotd-digit" key={m}>{m}</span>
                <span className="dotd-unit-label">Mins</span>
              </div>
              <span className="dotd-colon">:</span>
              <div className="dotd-unit">
                <span className="dotd-digit" key={s}>{s}</span>
                <span className="dotd-unit-label">Secs</span>
              </div>
            </div>
          </div>

          <button className="dotd-cta ripple-btn" onClick={handleCtaClick}>
            <span>{btnText}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>

        {/* ── RIGHT GRID COLUMN (Image Slide-In) ── */}
        <div className="dotd-right" data-reveal>
          <div className="dotd-accent-line dotd-accent-line--right" />
          <div className="dotd-img-frame" onClick={handleCtaClick} style={{ cursor: 'pointer' }}>
            <span className="dotd-image-offer-badge">
              {deal.discountType === 'FLAT'
                ? `DEAL • ₹${deal.discountValue} OFF`
                : `DEAL • ${deal.discountValue || deal.discountPercentage || 0}% OFF`}
            </span>
            <img
              src={productImg}
              alt={productName}
              className="dotd-img"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealOfTheDay({ deals: propDeals, onProductClick }) {
  const [deals, setDeals] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (propDeals && propDeals.length > 0) {
      setDeals(propDeals);
    } else {
      fetch(`${API}/deals/active`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const dealsArray = Array.isArray(data) ? data : (data ? [data] : []);
          setDeals(dealsArray.filter(d => d && d.expiryDate && new Date(d.expiryDate) > new Date()));
        })
        .catch(err => {
          console.error("Error loading active deals:", err);
          setDeals([]);
        });
    }
  }, [propDeals]);

  // Auto-slide effect
  useEffect(() => {
    if (deals.length <= 1) return;
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }, 5000); // 5 seconds
    return () => clearInterval(intervalId);
  }, [deals.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? deals.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % deals.length);
  };

  const sectionRef = useRef(null);

  if (!deals || deals.length === 0) return null;

  return (
    <section className="dotd-section" ref={sectionRef}>
      <div className="dotd-bg" />
      <div className="dotd-overlay" />

      <div className="dotd-card" data-reveal>
        <div 
          className="dotd-slider-container" 
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {deals.map((deal, idx) => (
            <DealSlide 
              key={deal.id || idx} 
              deal={deal} 
              onProductClick={onProductClick} 
              isActive={idx === currentIndex}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        {deals.length > 1 && (
          <>
            <button className="dotd-nav-btn prev" onClick={handlePrev}>
              <FiChevronLeft size={24} />
            </button>
            <button className="dotd-nav-btn next" onClick={handleNext}>
              <FiChevronRight size={24} />
            </button>
            <div className="dotd-dots">
              {deals.map((_, idx) => (
                <span 
                  key={idx} 
                  className={`dotd-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
