import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Footer.css';
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiFacebook,
  FiInstagram,
  FiTwitter,
  FiChevronRight
} from 'react-icons/fi';

function FloralLogo({ size = 46, iconColor = "#C89438" }) {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="footer-logo-mark"
      aria-hidden="true"
      style={{ marginRight: '10px' }}
    >
      <path
        d="M 100,24 L 125,48 L 156,48 L 156,75 L 176,100 L 156,125 L 156,156 L 125,156 L 100,176 L 75,156 L 44,156 L 44,125 L 24,100 L 44,75 L 44,48 L 75,48 Z"
        fill="none"
        stroke={iconColor}
        strokeWidth="7.5"
        strokeLinejoin="miter"
      />
      <circle cx="100" cy="100" r="13" fill={iconColor} />
      <g fill={iconColor}>
        {petals.map(deg => (
          <path
            key={deg}
            d="M 100,52 C 88,66 88,80 100,87 C 112,80 112,66 100,52 Z"
            transform={`rotate(${deg}, 100, 100)`}
          />
        ))}
      </g>
      <g fill={iconColor}>
        <circle cx="68" cy="20" r="6" />
        <circle cx="132" cy="20" r="6" />
        <circle cx="180" cy="68" r="6" />
        <circle cx="180" cy="132" r="6" />
        <circle cx="132" cy="180" r="6" />
        <circle cx="68" cy="180" r="6" />
        <circle cx="20" cy="132" r="6" />
        <circle cx="20" cy="68" r="6" />
      </g>
    </svg>
  );
}

export default function Footer({ onNavigate }) {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setSubscribing(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/newsletter/subscribe`, { email });
      if (res.data.success) {
        toast.success(res.data.message);
        setEmail('');
        setSubscribed(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="footer">
      {/* Newsletter Section */}
      <div className="newsletter-section">
        <div className="newsletter-content">
          <div className="newsletter-text">
            <h3>Stay in the loop</h3>
            <p>Get early access to offers, new arrivals, and seasonal updates straight to your inbox.</p>
          </div>
          <div className="newsletter-form-wrap">
            {subscribed ? (
              <div className="newsletter-success">
                Thanks — you’re subscribed.
              </div>
            ) : (
              <form className="newsletter-form" onSubmit={handleSubscribe}>
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={subscribing}>
                  {subscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="footer-main">
        <div className="footer-grid">

          {/* Brand/About Column with EXACT Navbar Logo design */}
          <div className="footer-col brand-col">
            <div className="footer-logo-wrap">
              <div className="footer-logo">
                <img src="/logo_pattern.png" alt="Anyra's Trove Logo" className="footer-logo-mark" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
                <div className="footer-logo-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <span className="footer-logo-title" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '1.8px', color: '#476C1B', textTransform: 'uppercase', lineHeight: 1 }}>ANYRA&apos;S TROVE</span>
                  <span className="footer-logo-tagline" style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '4.5px', color: '#C89438', textTransform: 'uppercase', marginTop: '2px', marginBottom: '2px' }}>PEOPLE FIRST</span>
                  <span className="footer-logo-brand-mark" style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.54rem', fontWeight: 600, color: '#555555', letterSpacing: '1.2px', textTransform: 'uppercase' }}>BY NIKITHA ENTERPRISES</span>
                </div>
              </div>
            </div>
            <p className="brand-desc">
              Elevating your culinary experiences with high-performance kitchenware engineered for modern homes and commercial masters.
            </p>
            <div className="social-links">
              <a href="https://www.instagram.com/anyras_trove?igsh=anJkanUzaXRncXJp" target="_blank" rel="noreferrer" aria-label="Instagram"><FiInstagram /></a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer-col">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li><a href="#home" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('home'); }}><FiChevronRight className="link-arrow" /> Home</a></li>
              <li><a href="#shop" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('shop'); }}><FiChevronRight className="link-arrow" /> Shop</a></li>
              <li><a href="#collections" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('collection'); }}><FiChevronRight className="link-arrow" /> Collections</a></li>
              <li><a href="#pooja" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('poojaGifting'); }}><FiChevronRight className="link-arrow" /> Pooja & Gifting</a></li>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('about'); }}><FiChevronRight className="link-arrow" /> About Us</a></li>
              <li><a href="#contact" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('contact'); }}><FiChevronRight className="link-arrow" /> Contact Us</a></li>
            </ul>
          </div>

          {/* Customer Service Column */}
          <div className="footer-col">
            <h3>Customer Care</h3>
            <ul className="footer-links">
              <li><a href="#privacy" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('privacy'); }}><FiChevronRight className="link-arrow" /> Privacy Policy</a></li>
              <li><a href="#return" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('return'); }}><FiChevronRight className="link-arrow" /> Return & Shipping Policy</a></li>
              <li><a href="#shipping" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('shipping'); }}><FiChevronRight className="link-arrow" /> Shipping Policy</a></li>
            </ul>
          </div>

          {/* Contact Details Column */}
          <div className="footer-col info-col">
            <h3>Contact Us</h3>
            <ul className="contact-info">
              <li>
                <FiMapPin className="info-icon" />
                <span>NO 11, 1st main road, ATR layout, Murgeshpallya, Bangalore 560017</span>
              </li>
              <li>
                <FiPhone className="info-icon" />
                <a href="tel:+919620439696">+91 96204 39696</a>
              </li>
              <li>
                <svg className="info-icon" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 413.9c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 334.3l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path></svg>
                <a href="https://wa.me/919620439696" target="_blank" rel="noreferrer">WhatsApp Us</a>
              </li>
              <li>
                <FiMail className="info-icon" />
                <a href="mailto:nikitha9320@gmail.com">nikitha9320@gmail.com</a>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Section: Copyright, Payments & Credits */}
      <div className="footer-bottom">
        <div className="bottom-container">
          <p className="copyright">
            &copy; {currentYear} ANYRA'S TROVE. All Rights Reserved.
          </p>

          {/* Developer Credit */}
          <p className="developers-credit">
            Developed by <a href="https://saitechnosolutions.com/" target="_blank" rel="noreferrer">Sai Techno Solutions</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
