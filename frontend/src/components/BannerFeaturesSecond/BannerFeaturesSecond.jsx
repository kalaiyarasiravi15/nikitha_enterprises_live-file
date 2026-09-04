import React from 'react';
import './BannerFeaturesSecond.css';

export default function BannerFeaturesSecond() {
  const features = [
    {
      icon: (
        <svg className="feature-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Leaf / Sprout */}
          <path d="M12 21v-5M12 16c0-4 3-7 7-7 0 4-3 7-7 7z" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 16c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6z" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Healthy Cooking",
      subtitle: "Retains nutrients and is naturally non-toxic."
    },
    {
      icon: (
        <svg className="feature-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shield */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Durable & Long Lasting",
      subtitle: "Built to last for generations with proper care."
    },
    {
      icon: (
        <svg className="feature-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Fire / Heat */}
          <path d="M12 2c0 0-4 3-4 8s2.5 7 2.5 7 1-1.5 1-2.5 1.5 1.5 1.5 1.5.5-2.5.5-3.5 1-1.5 1.5-1.5S17 14 17 17s-2.5 5-5 5c-3 0-6-3-6-6s3.5-8 3.5-8" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Even Heat Distribution",
      subtitle: "Cooks food evenly and enhances taste."
    },
    {
      icon: (
        <svg className="feature-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Lotus */}
          <path d="M12 21s3-3 5-7.5S19 6 19 6c0 0-3.5 2-6 5.5C10.5 8 7 6 7 6c0 0 1 3 3 7.5S12 21 12 21z" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 21s6-1 8-6-4-6-4-6-2.5 2.5-4 6" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 21s-6-1-8-6 4-6 4-6 2.5 2.5 4 6" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Traditional & Authentic",
      subtitle: "Our heritage, your healthy tomorrow."
    },
    {
      icon: (
        <svg className="feature-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Sparkles / Timeless Beauty */}
          <path d="M12 2v6M9 5h6" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19 9v4M17 11h4" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 13v6M3 16h6" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Timeless Beauty",
      subtitle: "Elegant shine that adds grace to your kitchen."
    },
    {
      icon: (
        <svg className="feature-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Sustainable / Hands Heart */}
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 15h14" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 18h10" stroke="#2d5a1b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Sustainable Choice",
      subtitle: "Eco-friendly and 100% recyclable."
    }
  ];

  return (
    <section className="banner-features-second">
      <div className="features-second-container">
        <div className="features-second-grid">
          {features.map((f, i) => (
            <div
              className="feature-second-item"
              key={i}
              data-aos="fade-up"
              data-aos-delay={i * 80}
              data-aos-duration="550"
            >
              <div className="feature-second-icon">
                {f.icon}
              </div>
              <div className="feature-second-text">
                <span className="feature-second-title">{f.title}</span>
                <span className="feature-second-subtitle">{f.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
