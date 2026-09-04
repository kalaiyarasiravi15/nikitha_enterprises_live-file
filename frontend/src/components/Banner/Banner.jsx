import { useState, useEffect } from 'react'
import './Banner.css'
import { addRipple } from '../Animation/Animation'
import { API, IMG } from '../../config'

function Banner({ onShopClick }) {
  const [current, setCurrent] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [slides, setSlides] = useState([])

  useEffect(() => {
    fetch(`${API}/banners/all`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(b => ({
            bg: b.image.startsWith('http')
              ? b.image
              : b.image.startsWith('/uploads/')
              ? `${IMG.replace('/uploads', '')}${b.image}`
              : b.image.startsWith('uploads/')
              ? `${IMG.replace('/uploads', '')}/${b.image}`
              : `${IMG}/${b.image}`,
            subtitle: b.subtitle || "Anyra's Trove",
            title: b.title || 'Welcome',
            btn: b.buttonText || 'SHOP NOW',
            link: b.link || '',
            overlay: (() => {
              // Cap overlay opacity to 0.45 max — prevents full black screen
              const raw = b.overlay || 'rgba(0,0,0,0.15)';
              const match = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
              if (match) {
                const op = Math.min(parseFloat(match[4] || 1), 0.45);
                return `rgba(${match[1]},${match[2]},${match[3]},${op})`;
              }
              return raw;
            })(),
          }));
          setSlides(mapped);
        } else {
          setSlides([]);
        }
      })
      .catch(err => {
        console.error('Error fetching banners:', err);
        setSlides([]);
      });
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length)
      setAnimKey(prev => prev + 1)
    }, 4000)
    return () => clearInterval(timer)
  }, [slides])

  const prev = () => {
    if (slides.length === 0) return;
    setCurrent(c => (c - 1 + slides.length) % slides.length)
    setAnimKey(k => k + 1)
  }
  const next = () => {
    if (slides.length === 0) return;
    setCurrent(c => (c + 1) % slides.length)
    setAnimKey(k => k + 1)
  }

  if (slides.length === 0) return null;

  const slide = slides[current]

  return (
    <section className="banner">
      {/* Background Slides Layer for seamless image cross-fading */}
      <div className="banner-bg-container">
        {slides.map((s, i) => (
          <div
            key={i}
            className={`banner-bg-slide ${i === current ? 'active' : ''}`}
            style={{ backgroundImage: `url('${s.bg}')` }}
          />
        ))}
      </div>

      {/* Dynamic Overlay Layer */}
      <div className="banner-overlay" style={{ background: slide.overlay }} />



      {/* Text Content Animate Elements */}
      <div className="banner-content" key={animKey}>
        <p className="banner-subtitle">{slide.subtitle}</p>
        <h1 className="banner-title">
          {slide.title.split('\n').map((line, i) => (
            <span key={i} className={`title-line line-${i}`}>
              {line}
            </span>
          ))}
        </h1>
        <button
          className="banner-btn ripple-btn"
          onClick={(e) => {
            addRipple(e);
            if (slide.link) {
              if (slide.link.startsWith('http')) {
                window.open(slide.link, '_blank');
              } else {
                onShopClick && onShopClick(slide.link);
              }
            } else {
              onShopClick && onShopClick();
            }
          }}
        >
          {slide.btn}
        </button>
      </div>



      <div className="banner-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === current ? 'active' : ''}`}
            onClick={() => { setCurrent(i); setAnimKey(k => k + 1) }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

export default Banner;