import React, { useEffect, useRef, useState } from "react";
import "./About.css";
import { FaInstagram } from "react-icons/fa";
import { FaTrophy, FaTag, FaTruck, FaUsers } from "react-icons/fa";
import axios from "axios";
import { API, IMG } from "../../config";

// About-page uploads are stored by the API as /uploads/<file>.  Resolve only
// those values to the API host; public-site assets such as /about_banner4.jpg
// must stay on the storefront host.
function resolveAboutImage(value, fallback = "") {
  if (!value || /^\{.*\}$/.test(value)) return fallback;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;

  const normalized = value.replace(/^\/?uploads\//, "");
  if (normalized !== value) {
    return `${IMG.replace(/\/$/, "")}/${normalized}`;
  }

  return value;
}

/* ── Split a string into individual letter spans ── */
function AnimatedHeading({ text, className = "" }) {
  return (
    <h2 className={`anim-heading ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="anim-heading__letter"
          style={{ animationDelay: `${i * 0.045}s` }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </h2>
  );
}

/* ── Intersection-observer wrapper ── */
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Stats ── */


/* ── Why Choose Us — Zigzag ── */
// const WHY_US = [
//   {
//     icon: <FaTrophy />,
//     step: "Step 01",
//     title: "Trusted Quality",
//     desc: "Every product we stock is carefully selected for durability, safety, and performance — so you always get the best for your kitchen.",
//     side: "left",
//   },
//   {
//     icon: <FaTag />,
//     step: "Step 02",
//     title: "Affordable Prices",
//     desc: "We believe a well-equipped kitchen should not cost a fortune. Our pricing is honest, competitive, and fair for every budget.",
//     side: "right",
//   },
//   {
//     icon: <FaTruck />,
//     step: "Step 03",
//     title: "Fast Delivery",
//     desc: "Orders are dispatched promptly across Tamil Nadu and beyond. We ensure your kitchen essentials reach you safely and on time.",
//     side: "left",
//   },
//   {
//     icon: <FaUsers />,
//     step: "Step 04",
//     title: "Customer First",
//     desc: "From browsing to after-sales support, our team is always ready to help you find exactly what you need with a smile.",
//     side: "right",
//   },
// ];

/* ── Instagram images ── */


/* ── FAQ data ── */


/* ── FAQ accordion row (hover to reveal answer) ── */
function FaqRow({ item, index, openIndex, setOpenIndex }) {
  const isOpen = openIndex === index;
  return (
    <div
      className={`faq-row${isOpen ? " faq-row--open" : ""}`}
      onMouseEnter={() => setOpenIndex(index)}
      onMouseLeave={() => setOpenIndex(null)}
    >
      <div className="faq-row__head">
        <span className="faq-row__num">{String(index + 1).padStart(2, "0")}</span>
        <h3 className="faq-row__question">{item.q}</h3>
        <span className="faq-row__icon" aria-hidden="true">
          <span className="faq-row__icon-line faq-row__icon-line--h" />
          <span className="faq-row__icon-line faq-row__icon-line--v" />
        </span>
      </div>
      <div className="faq-row__body">
        <p>{item.a}</p>
      </div>
    </div>
  );
}

export default function About() {
  const trackRef  = useRef(null);
  const animRef   = useRef(null);
  const pausedRef = useRef(false);
  const posRef    = useRef(0);
  const [instaHovered, setInstaHovered] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);

  const [aboutData, setAboutData] = useState({
    heroImage: '/herobanner.png',
    storySubtitle: '{aboutData.storySubtitle}',
    storyParagraphs: 'Anyra\'s Trove was founded with a single, heartfelt purpose — to make every Indian kitchen a place of joy, efficiency, and pride. Based in Srivilliputhur, Tamil Nadu, we began as a small local store driven by a passion for quality kitchenware and a deep understanding of what home cooks and professional chefs truly need.\n\nOver the years, we have grown into a trusted name for households across the region. From sturdy cookware that withstands daily use to elegant tableware for special occasions, every product in our store is chosen with care — ensuring it meets the highest standards of quality and value.\n\nToday, Anyra\'s Trove is more than a store — it is a destination where kitchens come to life.',
    storyImage: '{aboutData.storyImage}',
    stats: [
      { value: '15+', label: 'Years of Experience' },
      { value: '5000+', label: 'Happy Customers' },
      { value: '500+', label: 'Products Available' },
      { value: '6', label: 'Product Categories' },
    ],
    missionSubtitle: '{aboutData.missionSubtitle}',
    missionParagraphs: 'At Anyra\'s Trove, our mission is simple — to equip every kitchen with the tools it deserves, at a price every family can afford. We believe that cooking is an act of love, and the right tools make that experience better, faster, and more enjoyable.\n\nWe source our products from reliable manufacturers and carefully vet each item for safety, durability, and everyday practicality. Whether you are setting up your first home or upgrading your existing kitchen, we have everything — from cookware and appliances to storage solutions and servingware — all under one roof.\n\nOur commitment is to be your most trusted kitchen partner, not just for a purchase, but for a lifetime.',
    missionImage: '{aboutData.missionImage}',
    storeIntro: 'Step into Anyra\'s Trove and discover a thoughtfully arranged space where every section is dedicated to a category of kitchen essentials. From the gleaming cookware aisle to the neatly stacked storage solutions, our store is designed to make your shopping experience easy, enjoyable, and inspiring.',
    storeGrid: [
      { image: '/about_banner4.jpg', title: 'Cookware', desc: 'Premium cookware crafted for everyday Indian cooking.' },
      { image: '/about_banner7.jpg', title: 'Kitchen Tools', desc: 'Precision tools designed to simplify every cooking task.' },
      { image: '/about_banner9.jpg', title: 'Servingware', desc: 'Elegant serving pieces for every occasion at home.' },
      { image: '/about_banner13.jpg', title: 'Storage Solutions', desc: 'Smart storage that keeps your kitchen clean and organised.' }
    ],
    faqIntro: 'Everything you need to know about shopping for kitchenware and accessories with Anyra\'s Trove. Hover over a question to see the answer.',
    faqs: [
      { q: 'What kind of kitchen products do you sell?', a: 'We stock everything for the modern Indian kitchen — cookware, kitchen tools, storage containers, servingware, appliances, and daily-use accessories, all under one roof.' },
      { q: 'Do you offer home delivery?', a: 'Yes. We deliver across Srivilliputhur and surrounding areas in Tamil Nadu, with orders dispatched promptly so your kitchen essentials reach you safely and on time.' },
      { q: 'Can I pay cash on delivery?', a: 'Absolutely. We offer cash on delivery along with other convenient payment options, so you can choose whatever works best for you.' },
      { q: 'What if a product arrives damaged or defective?', a: 'If anything arrives damaged or faulty, just reach out to our team within 48 hours of delivery and we\'ll arrange a replacement or exchange at no extra cost.' },
      { q: 'Do you offer bulk or wholesale pricing?', a: 'Yes, we offer special pricing for bulk orders — perfect for hostels, restaurants, caterers, and resellers. Contact us directly to discuss your requirements.' },
      { q: 'Can I visit the store before buying?', a: 'Of course! Our store in Srivilliputhur is open for walk-ins so you can see, touch, and compare products in person before making a decision.' }
    ],
    faqImage: '/about_banner10.jpg',
    instaImages: [
      '/about_banner2.jpg', '/about_banner3.jpg', '/about_banner4.jpg', '/about_banner5.jpg', '/about_banner6.jpg',
      '/about_banner7.jpg', '/about_banner8.jpg', '/about_banner9.jpg', '/about_banner10.jpg', '{aboutData.missionImage}'
    ]
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/settings`);
        if (res.data && res.data.success && res.data.data.ABOUT_PAGE_DATA) {
          try {
            const parsed = JSON.parse(res.data.data.ABOUT_PAGE_DATA);
            setAboutData(prev => ({ ...prev, ...parsed }));
          } catch (e) { console.error('Error parsing ABOUT_PAGE_DATA', e); }
        }
      } catch (err) {
        console.error('Failed to load about settings.', err);
      }
    };
    fetchSettings();
  }, []);


  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const SPEED = 0.6;
    const step = () => {
      if (!pausedRef.current) {
        posRef.current += SPEED;
        const halfW = track.scrollWidth / 2;
        if (posRef.current >= halfW) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleInstaEnter = () => { pausedRef.current = true;  setInstaHovered(true); };
  const handleInstaLeave = () => { pausedRef.current = false; setInstaHovered(false); };

  return (
    <div className="about-page">

      {/* ══ HERO ══ */}
      <div className="page-hero" style={{ backgroundImage: `url('${resolveAboutImage(aboutData.heroImage, '/herobanner.png')}')` }}>
        <div className="page-hero__overlay" />
        <div className="page-hero__content">
          <h1 className="hero-title">
            {"About Us".split("").map((ch, i) => (
              <span key={i} className="hero-title__letter" style={{ animationDelay: `${i * 0.06}s` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="page-hero__crumb-sep">›</span>
            <span className="is-active">About</span>
          </nav>
        </div>
      </div>

      {/* ══ OUR STORY ══ */}
      <section className="about-section about-section--story">
        <div className="about-section-container">
          <div className="about-split alt-layout-story">
            <Reveal className="about-split__content" delay={0}>
              <AnimatedHeading text="Our Story" />
              <div className="about-split__meta">
                <span className="about-line-decor" />
                <span className="about-split__subtitle">{aboutData.storySubtitle}</span>
              </div>
              {aboutData.storyParagraphs.split("\n").map((p, i) => p.trim() && <p key={i}>{p}</p>)}
            </Reveal>

            <Reveal delay={150}>
              <div className="about-split__image-container zoom-img">
                <img src={resolveAboutImage(aboutData.storyImage, '/about_banner2.jpg')} alt="Anyra's Trove Store" className="about-split__image" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ STATS BANNER ══ */}
      <section className="about-section about-section--stats">
        <div className="about-section-container">
          <Reveal delay={0}>
            <div className="about-stats">
              {aboutData.stats.map((s, i) => (
                <div className="about-stat" key={i}>
                  <span className="about-stat__value">{s.value}</span>
                  <span className="about-stat__label">{s.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ OUR MISSION ══ */}
      <section className="about-section about-section--mission">
        <div className="about-section-container">
          <div className="about-split alt-layout-identity">
            <Reveal className="about-split__content" delay={0}>
              <AnimatedHeading text="Our Mission" />
              <div className="about-split__meta">
                <span className="about-line-decor" />
                <span className="about-split__subtitle">{aboutData.missionSubtitle}</span>
              </div>
              {aboutData.missionParagraphs.split("\n").map((p, i) => p.trim() && <p key={i}>{p}</p>)}
            </Reveal>

            <Reveal delay={150}>
              <div className="about-split__image-container zoom-img">
                <img src={resolveAboutImage(aboutData.missionImage, '/about_banner3.jpg')} alt="Our Mission at Anyra's Trove" className="about-split__image" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ WHY CHOOSE US — ZIGZAG ══ */}
      {/* <section className="about-section about-section--why-us">
        <div className="about-section-container">
          <div className="why-us-section">

            <Reveal className="why-us-header" delay={0}>
              <AnimatedHeading text="Why Choose Us" className="store-heading" />
              <div className="insta-heading-line" style={{ margin: "12px auto 0" }} />
              <p className="why-us-subtext">
                Thousands of families in Tamil Nadu trust Anyra's Trove for their
                kitchen needs. Here is why we stand apart.
              </p>
            </Reveal>

            <div className="zz-wrap">
              <div className="zz-center-line" />
              {WHY_US.map((item, i) => (
                <Reveal key={i} delay={i * 110}>
                  <div className={`zz-row${item.side === "right" ? " zz-row--right" : ""}`}>
                    <div className="zz-card">
                      <div className="zz-card-inner">
                        <div className="zz-icon-box">{item.icon}</div>
                        <div className="zz-text">
                          <span className="zz-step">{item.step}</span>
                          <h3 className="zz-title">{item.title}</h3>
                          <p className="zz-desc">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                    <div className="zz-mid">
                      <div className="zz-dot">{String(i + 1).padStart(2, "0")}</div>
                    </div>
                    <div className="zz-spacer" />
                  </div>
                </Reveal>
              ))}
            </div>

          </div>
        </div>
      </section> */}

      {/* ══ INSIDE OUR STORE ══ */}
      <section className="about-section about-section--store">
        <div className="about-section-container">
          <div className="world-store-section">
            <Reveal className="world-store-header" delay={0}>
              <AnimatedHeading text="Inside Our Store" className="store-heading" />
              <p>{aboutData.storeIntro}</p>
            </Reveal>

            <div className="world-store-grid">
              {aboutData.storeGrid && aboutData.storeGrid[0] && (
                <Reveal delay={0}>
                  <div className="store-img-card block-full-height store-hover-card">
                    <img src={resolveAboutImage(aboutData.storeGrid[0].image, '/about_banner4.jpg')} alt="Store view" />
                    <div className="store-hover-overlay">
                      <div className="store-hover-overlay__content">
                        <h3 className="store-hover-overlay__title">{aboutData.storeGrid[0].title}</h3>
                        <p className="store-hover-overlay__desc">{aboutData.storeGrid[0].desc}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )}

              <div className="store-grid-col grid-right-panel">
                <div className="store-img-row flex-top-row">
                  {aboutData.storeGrid && aboutData.storeGrid[1] && (
                    <Reveal delay={80} className="block-half-width">
                      <div className="store-img-card store-hover-card" style={{ height: "100%" }}>
                        <img src={resolveAboutImage(aboutData.storeGrid[1].image, '/about_banner7.jpg')} alt="Store view" />
                        <div className="store-hover-overlay">
                          <div className="store-hover-overlay__content">
                            <h3 className="store-hover-overlay__title">{aboutData.storeGrid[1].title}</h3>
                            <p className="store-hover-overlay__desc">{aboutData.storeGrid[1].desc}</p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  )}
                  {aboutData.storeGrid && aboutData.storeGrid[2] && (
                    <Reveal delay={160} className="block-half-width">
                      <div className="store-img-card store-hover-card" style={{ height: "100%" }}>
                        <img src={resolveAboutImage(aboutData.storeGrid[2].image, '/about_banner9.jpg')} alt="Store view" />
                        <div className="store-hover-overlay">
                          <div className="store-hover-overlay__content">
                            <h3 className="store-hover-overlay__title">{aboutData.storeGrid[2].title}</h3>
                            <p className="store-hover-overlay__desc">{aboutData.storeGrid[2].desc}</p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  )}
                </div>
                {aboutData.storeGrid && aboutData.storeGrid[3] && (
                  <Reveal delay={240} className="flex-bottom-row">
                    <div className="store-img-card store-hover-card" style={{ height: "100%" }}>
                      <img src={resolveAboutImage(aboutData.storeGrid[3].image, '/about_banner13.jpg')} alt="Store view" />
                      <div className="store-hover-overlay">
                        <div className="store-hover-overlay__content">
                          <h3 className="store-hover-overlay__title">{aboutData.storeGrid[3].title}</h3>
                          <p className="store-hover-overlay__desc">{aboutData.storeGrid[3].desc}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FREQUENTLY ASKED QUESTIONS ══ */}
      <section className="about-section about-section--faq">
        <div className="about-section-container">
          <div className="faq-split">

            <Reveal className="faq-split__content" delay={0}>
              <div className="about-split__meta">
                <span className="about-line-decor" />
                <span className="about-split__subtitle">GOT QUESTIONS? WE'VE GOT ANSWERS</span>
              </div>
              <AnimatedHeading text="Frequently Asked Questions" className="faq-heading" />
              <p className="faq-split__intro">
                Everything you need to know about shopping for kitchenware and
                accessories with Anyra's Trove. Hover over a question to
                see the answer.
              </p>

              <div className="faq-list">
                {aboutData.faqs.map((item, i) => (
                  <FaqRow
                    key={i}
                    item={item}
                    index={i}
                    openIndex={faqOpenIndex}
                    setOpenIndex={setFaqOpenIndex}
                  />
                ))}
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="faq-split__image-container zoom-img">
                <img
                  src={resolveAboutImage(aboutData.faqImage, '/about_banner10.jpg')}
                  alt="Kitchen accessories at Anyra's Trove"
                  className="faq-split__image"
                />
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* ══ INSTAGRAM SECTION ══ */}
      <section className="instagram-section">
        <div className="about-section-container" style={{ paddingBottom: 0 }}>
          <Reveal className="instagram-section__heading" delay={0}>
            <span className="instagram-section__eyebrow">
              <FaInstagram className="eyebrow-icon" /> @anyrastrove
            </span>
            <AnimatedHeading text="Follow Us On Instagram" className="insta-heading" />
            <div className="insta-heading-line" />
          </Reveal>
        </div>

        <div
          className="instagram-strip"
          onMouseEnter={handleInstaEnter}
          onMouseLeave={handleInstaLeave}
        >
          <div className="instagram-strip__track" ref={trackRef}>
            {aboutData.instaImages.map((src, i) => (
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-strip__item"
                key={i}
              >
                <img src={resolveAboutImage(src, '/about_banner2.jpg')} alt={`Instagram post ${(i % 5) + 1}`} />
                <div className="instagram-strip__item-overlay">
                  <FaInstagram className="insta-cell-icon" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
