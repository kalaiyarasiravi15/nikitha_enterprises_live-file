import { useEffect, useRef } from 'react';
import './Animation.css';

/* ─────────────────────────────────────────────
   AnimatedPageTitle
   Splits text into letter-by-letter animated spans
───────────────────────────────────────────── */
export function AnimatedPageTitle({ text, as: Tag = 'h1', className = '' }) {
  return (
    <Tag className={`animated-page-title ${className}`} aria-label={text}>
      {text.split('').map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="animated-page-title__letter"
          style={{ '--char-index': index }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
    </Tag>
  );
}

/* ─────────────────────────────────────────────
   ScrollReveal
   Wraps children in an intersection-observer reveal div.
   direction: 'up' | 'down' | 'left' | 'right' | 'zoom' | 'scale'
───────────────────────────────────────────── */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  threshold = 0.12,
  once = true,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible');
          if (once) observer.disconnect();
        } else if (!once) {
          element.classList.remove('is-visible');
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once, threshold]);

  const dirClass = {
    up:    'scroll-reveal--up',
    down:  'scroll-reveal--down',
    left:  'scroll-reveal--left',
    right: 'scroll-reveal--right',
    zoom:  'scroll-reveal--zoom',
    scale: 'scroll-reveal--scale',
  }[direction] || 'scroll-reveal--up';

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${dirClass} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   useScrollReveal
   Hook version: attach to any ref you already have.
   Returns a ref; add class 'sr-target' to the element.
───────────────────────────────────────────── */
export function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: options.threshold || 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [options.threshold]);

  return ref;
}

/* ─────────────────────────────────────────────
   addRipple
   Call this on button onClick to spawn a ripple.
   Usage: <button onClick={(e) => addRipple(e)} className="ripple-btn">
───────────────────────────────────────────── */
export function addRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;
  const rect = btn.getBoundingClientRect();

  circle.style.cssText = `
    width: ${diameter}px;
    height: ${diameter}px;
    left: ${e.clientX - rect.left - radius}px;
    top: ${e.clientY - rect.top - radius}px;
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: rippleEffect 0.6s linear;
    background-color: rgba(255,255,255,0.32);
    pointer-events: none;
  `;

  const existing = btn.querySelector('.ripple-wave');
  if (existing) existing.remove();

  circle.classList.add('ripple-wave');
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 700);
}

/* ─────────────────────────────────────────────
   useSectionReveal
   Attaches scroll-reveal to multiple section elements
   by querying a parent selector.
───────────────────────────────────────────── */
export function useSectionReveal(containerSelector = '[data-reveal]') {
  useEffect(() => {
    const elements = document.querySelectorAll(containerSelector);
    if (!elements.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [containerSelector]);
}
