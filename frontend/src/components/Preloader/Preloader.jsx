import { useEffect, useState } from 'react';
import './Preloader.css';
import logoImage from '../../assets/logo.jpg';

export default function Preloader({ onComplete }) {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Show splash for 1.6 seconds then trigger fade-out
    const timer = setTimeout(() => {
      setFadingOut(true);
      const hideTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 500); // 500ms fade-out transition
      return () => clearTimeout(hideTimer);
    }, 1600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`preloader-overlay ${fadingOut ? 'fade-out' : ''}`}>
      <div className="preloader-content">
        {/* Official Logo Branding */}
        <div className="preloader-logo-wrap">
          <img src="/logo_pattern.png" alt="Anyra's Trove Logo" className="preloader-logo-pattern" />
          <div className="preloader-logo-text">
            <span className="preloader-logo-title">ANYRA&apos;S TROVE</span>
            <span className="preloader-logo-tagline">PEOPLE FIRST</span>
            <span className="preloader-logo-brand-mark">BY NIKITHA ENTERPRISES</span>
          </div>
        </div>

        {/* Welcome Message */}
        <p className="preloader-welcome-msg">
          Handcrafted Pure Brassware &amp; Healthy Living
        </p>

        {/* Animated Progress Bar */}
        <div className="preloader-progress-bar">
          <div className="preloader-progress-fill" />
        </div>
      </div>
    </div>
  );
}
