import React from 'react';
import './BannerFeatures.css';
import { FaLeaf, FaHeart, FaShieldAlt, FaAward } from 'react-icons/fa';

export default function BannerFeatures() {
  const features = [
    {
      icon: <FaLeaf />,
      title: "100% Pure Brass",
      subtitle: "No Coating, No Plating"
    },
    {
      icon: <FaAward />,
      title: "Handcrafted",
      subtitle: "By Skilled Artisans"
    },
    {
      icon: <FaHeart />,
      title: "Ayurveda Friendly",
      subtitle: "Healthy & Non Toxic"
    },
    {
      icon: <FaShieldAlt />,
      title: "Made in India",
      subtitle: "Proudly Indian Brand"
    }
  ];

  // Triplicate list for continuous smooth horizontal sliding row
  const slidingFeatures = [...features, ...features, ...features];

  return (
    <div className="banner-features-container">
      <div className="banner-features-track">
        {slidingFeatures.map((f, i) => (
          <div className="feature-item" key={i}>
            <div className="feature-icon-wrap">
              {f.icon}
            </div>
            <div className="feature-text-wrap">
              <span className="feature-title">{f.title}</span>
              <p className="feature-subtitle">{f.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
