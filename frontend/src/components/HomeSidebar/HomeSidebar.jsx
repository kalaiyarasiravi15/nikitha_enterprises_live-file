
import './HomeSidebar.css';

/* ── Laurel SVG ──────────────────────────────────── */
function LaurelLeft() {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#FFCC00', width: '32px', height: '42px' }}>
      <path d="M30 70 C10 55, 5 35, 15 20 C20 12, 28 8, 30 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M30 70 C15 58, 8 42, 12 28 C14 20, 22 13, 30 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
      <ellipse cx="18" cy="22" rx="8" ry="5" transform="rotate(-30 18 22)" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <ellipse cx="12" cy="38" rx="8" ry="5" transform="rotate(-20 12 38)" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <ellipse cx="14" cy="54" rx="8" ry="5" transform="rotate(-10 14 54)" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function LaurelRight() {
  return (
    <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#FFCC00', transform: 'scaleX(-1)', width: '32px', height: '42px' }}>
      <path d="M30 70 C10 55, 5 35, 15 20 C20 12, 28 8, 30 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M30 70 C15 58, 8 42, 12 28 C14 20, 22 13, 30 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
      <ellipse cx="18" cy="22" rx="8" ry="5" transform="rotate(-30 18 22)" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <ellipse cx="12" cy="38" rx="8" ry="5" transform="rotate(-20 12 38)" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <ellipse cx="14" cy="54" rx="8" ry="5" transform="rotate(-10 14 54)" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

export default function HomeSidebar({ onNavigate, showNewsletter = true }) {


  return (
    <aside className="hs-wrap">
      {/* ── SECURITY BADGES (4 Columns in a Row) ── */}
      <div className="hs-security">
        <div className="hs-badge-item">
          <div className="hs-badge-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2d5a1b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M12 2a5 5 0 0 0-5 5v4h10V7a5 5 0 0 0-5-5z"/>
            </svg>
          </div>
          <div className="hs-badge-text-wrap">
            <strong>Secure</strong>
            <span>Payment</span>
          </div>
        </div>
        <div className="hs-badge-divider"></div>
        <div className="hs-badge-item">
          <div className="hs-badge-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2d5a1b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </div>
          <div className="hs-badge-text-wrap">
            <strong>Easy Returns</strong>
            <span>7 Days Policy</span>
          </div>
        </div>
        <div className="hs-badge-divider"></div>
        <div className="hs-badge-item">
          <div className="hs-badge-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2d5a1b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div className="hs-badge-text-wrap">
            <strong>Pan India</strong>
            <span>Delivery</span>
          </div>
        </div>
        <div className="hs-badge-divider"></div>
        <div className="hs-badge-item">
          <div className="hs-badge-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2d5a1b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="hs-badge-text-wrap">
            <strong>Customer</strong>
            <span>Support</span>
          </div>
        </div>
      </div>

      {/* ── NEWSLETTER (Mockup style) ── */}
      {/* ── WHY PURE BRASS (Replaced Newsletter) ── */}
      <div className="hs-newsletter" style={{ textAlign: 'left' }}>
        <div className="hs-nl-icon-wrap" style={{ margin: '0 auto 16px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#2d5a1b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="nl-svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <h4 className="hs-nl-title serif-heading" style={{ textAlign: 'center' }}>Why Pure Brass?</h4>
        <p className="hs-nl-desc" style={{ textAlign: 'center', lineHeight: '1.6', fontSize: '13.5px', marginBottom: '16px' }}>
          Cooking in pure brass retains up to <strong>93% of nutrients</strong>, naturally boosts immunity, and adds a rich, traditional flavor to your daily meals.
        </p>
        <ul style={{ paddingLeft: '20px', textAlign: 'left', fontSize: '13px', color: '#475569', margin: '0', lineHeight: '1.8' }}>
          <li>Maintains natural food pH levels</li>
          <li>Handcrafted by traditional artisans</li>
          <li>100% Non-toxic &amp; lead-free guarantee</li>
        </ul>
      </div>

      {/* ── TRUST SECTION ── */}
      <div className="hs-trust">
        <div className="hs-trust-laurel">
          <LaurelLeft />
          <div className="hs-trust-title-wrap">
            <h4 className="hs-trust-title serif-heading">
              Trusted by Thousands<br />Loved for Generations
            </h4>
            <div className="hs-trust-line"></div>
          </div>
          <LaurelRight />
        </div>
        <div className="hs-trust-stars">
          {'★'.repeat(5).split('').map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
        <p className="hs-trust-rating">
          <strong>4.8/5</strong> from 1200+ Happy Customers
        </p>
      </div>
    </aside>
  );
}
