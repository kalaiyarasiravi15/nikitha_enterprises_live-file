import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const toggle = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('at_language', lang);
  };

  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn ${current === 'en' ? 'active' : ''}`}
        onClick={() => toggle('en')}
      >
        EN
      </button>
      <span className="lang-divider">|</span>
      <button
        className={`lang-btn ${current === 'ta' ? 'active' : ''}`}
        onClick={() => toggle('ta')}
      >
        தமிழ்
      </button>
    </div>
  );
}
