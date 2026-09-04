import { useEffect, useState, useRef } from 'react';
import { FiGlobe, FiSearch, FiCheck, FiX } from 'react-icons/fi';
import './GoogleTranslate.css';

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'zh-CN', name: 'Chinese', native: '中文' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'si', name: 'Sinhala', native: 'சிங்களம்' },
];

export default function GoogleTranslate() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentLang, setCurrentLang] = useState('en');
  const [languagesList, setLanguagesList] = useState(DEFAULT_LANGUAGES);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (window.googleTranslateScriptLoaded) return;
    window.googleTranslateScriptLoaded = true;

    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: '',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        'google_translate_element'
      );
    };

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    // Extract options from google select once loaded
    const checkTimer = setInterval(() => {
      const select = document.querySelector('select.goog-te-combo');
      if (select && select.options.length > 1) {
        clearInterval(checkTimer);
        const extracted = [];
        for (let i = 0; i < select.options.length; i++) {
          const opt = select.options[i];
          if (opt.value) {
            const defMatch = DEFAULT_LANGUAGES.find(l => l.code === opt.value);
            extracted.push({
              code: opt.value,
              name: opt.text,
              native: defMatch ? defMatch.native : opt.text,
            });
          }
        }
        if (extracted.length > 0) {
          // Put English & Tamil at top
          extracted.sort((a, b) => {
            if (a.code === 'en') return -1;
            if (b.code === 'en') return 1;
            if (a.code === 'ta') return -1;
            if (b.code === 'ta') return 1;
            return a.name.localeCompare(b.name);
          });
          setLanguagesList(extracted);
        }
      }
    }, 500);

    return () => clearInterval(checkTimer);
  }, []);

  // Check saved language cookie
  useEffect(() => {
    const cookies = document.cookie.split(';');
    const gCookie = cookies.find(c => c.trim().startsWith('googtrans='));
    if (gCookie) {
      const parts = gCookie.split('/');
      const code = parts[parts.length - 1];
      if (code) setCurrentLang(code);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (code) => {
    setCurrentLang(code);
    setOpen(false);
    setSearch('');

    // 1. Set Google Translate Cookie
    document.cookie = `googtrans=/en/${code}; path=/`;
    document.cookie = `googtrans=/en/${code}; domain=.${window.location.hostname}; path=/`;

    // 2. Trigger Google Translate combo element
    const googSelect = document.querySelector('select.goog-te-combo');
    if (googSelect) {
      googSelect.value = code;
      googSelect.dispatchEvent(new Event('change'));
    } else {
      // Reload if combo isn't ready
      window.location.reload();
    }
  };

  const filteredLanguages = languagesList.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.native.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeLangObj = languagesList.find(l => l.code === currentLang) || { name: 'English', native: 'English' };

  return (
    <div className="gt-container" ref={dropdownRef}>
      {/* Offscreen google element (Must NOT be display:none so google initializes select element) */}
      <div id="google_translate_element" className="gt-offscreen" />

      {/* Quick Access Bar — Icon Only */}
      <div className="gt-quick-bar">
        <button
          className={`gt-globe-trigger ${open ? 'active' : ''}`}
          onClick={() => setOpen(!open)}
          title="Select Language"
          aria-label="Select Language"
        >
          <FiGlobe size={16} />
        </button>
      </div>

      {/* Searchable Modal / Dropdown */}
      {open && (
        <div className="gt-modal">
          <div className="gt-modal-header">
            <div className="gt-search-box">
              <FiSearch size={14} className="gt-search-icon" />
              <input
                type="text"
                placeholder="Type language (e.g. Tamil, French, Hindi)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && <FiX size={14} className="gt-clear-icon" onClick={() => setSearch('')} />}
            </div>
          </div>

          <div className="gt-lang-list">
            {filteredLanguages.length === 0 ? (
              <div className="gt-no-results">No languages found matching &quot;{search}&quot;</div>
            ) : (
              filteredLanguages.map(l => (
                <button
                  key={l.code}
                  className={`gt-lang-item ${currentLang === l.code ? 'selected' : ''}`}
                  onClick={() => selectLanguage(l.code)}
                >
                  <div className="gt-lang-names">
                    <span className="gt-lang-native">{l.native}</span>
                    <span className="gt-lang-english">({l.name})</span>
                  </div>
                  {currentLang === l.code && <FiCheck size={14} className="gt-check" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
