import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import './GlobalCardEffects.css';

const PARTICLE_COUNT = 8;
const SPOTLIGHT_RADIUS = 350;
const MOBILE_BREAKPOINT = 768;

const CARD_SELECTOR = [
  '.card',
  '.stat-card',
  '.jb-step-card',
  '.feature-item',
  '.contact-card',
  '.pipeline-summary-card',
].join(',');

const getGlowColor = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--gcfx-glow').trim() || '56, 189, 248';

const getSpotPeak = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gcfx-spot-peak')) || 0.12;

const getRippleAlpha = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gcfx-ripple-alpha')) || 0.3;

const createParticle = (x, y, color) => {
  const el = document.createElement('div');
  el.className = 'gcfx-particle';
  el.style.cssText = `position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(${color},1);box-shadow:0 0 6px rgba(${color},0.6);pointer-events:none;z-index:100;left:${x}px;top:${y}px;`;
  return el;
};

export default function GlobalCardEffects() {
  const spotlightRef = useRef(null);
  const hoveredCardRef = useRef(null);
  const particlesRef = useRef([]);
  const particleTimeoutsRef = useRef([]);

  const clearParticles = useCallback(() => {
    particleTimeoutsRef.current.forEach(clearTimeout);
    particleTimeoutsRef.current = [];
    particlesRef.current.forEach((p) => {
      gsap.killTweensOf(p);
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.25,
        ease: 'back.in(1.7)',
        onComplete: () => p.remove(),
      });
    });
    particlesRef.current = [];
  }, []);

  const spawnParticles = useCallback((card) => {
    const color = getGlowColor();
    const rect = card.getBoundingClientRect();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const tid = setTimeout(() => {
        if (hoveredCardRef.current !== card) return;
        const p = createParticle(
          Math.random() * rect.width,
          Math.random() * rect.height,
          color,
        );
        card.appendChild(p);
        particlesRef.current.push(p);
        gsap.fromTo(
          p,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' },
        );
        gsap.to(p, {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        });
        gsap.to(p, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        });
      }, i * 90);
      particleTimeoutsRef.current.push(tid);
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) return;

    const color = getGlowColor();
    const spotlight = document.createElement('div');
    spotlight.className = 'gcfx-spotlight';
    spotlight.style.cssText = `position:fixed;width:700px;height:700px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(${color},0.12) 0%,rgba(${color},0.06) 20%,rgba(${color},0.03) 35%,rgba(${color},0.01) 55%,transparent 70%);z-index:9999;opacity:0;transform:translate(-50%,-50%);`;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const proximity = SPOTLIGHT_RADIUS * 0.5;
    const fadeDistance = SPOTLIGHT_RADIUS * 0.75;

    const handleMouseMove = (e) => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      const cards = document.querySelectorAll(CARD_SELECTOR);
      let minDist = Infinity;

      cards.forEach((card) => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.max(
          0,
          Math.hypot(e.clientX - cx, e.clientY - cy) -
            Math.max(r.width, r.height) / 2,
        );
        minDist = Math.min(minDist, dist);

        let intensity = 0;
        if (dist <= proximity) intensity = 1;
        else if (dist <= fadeDistance)
          intensity = (fadeDistance - dist) / (fadeDistance - proximity);

        const relX = ((e.clientX - r.left) / r.width) * 100;
        const relY = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--glow-x', `${relX}%`);
        card.style.setProperty('--glow-y', `${relY}%`);
        card.style.setProperty('--glow-intensity', intensity.toString());
        card.style.setProperty('--glow-radius', `${SPOTLIGHT_RADIUS}px`);
      });

      gsap.to(spotlight, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.08,
        ease: 'power2.out',
      });

      const peak = getSpotPeak();
      const targetOpacity =
        minDist <= proximity
          ? peak * 6
          : minDist <= fadeDistance
            ? ((fadeDistance - minDist) / (fadeDistance - proximity)) * peak * 6
            : 0;
      gsap.to(spotlight, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.15 : 0.4,
        ease: 'power2.out',
      });
    };

    const handleMouseOver = (e) => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      const card = e.target.closest(CARD_SELECTOR);
      if (!card || card === hoveredCardRef.current) return;
      hoveredCardRef.current = card;
      clearParticles();
      spawnParticles(card);
    };

    const handleMouseOut = (e) => {
      const card = e.target.closest(CARD_SELECTOR);
      const related = e.relatedTarget?.closest?.(CARD_SELECTOR);
      if (card && card !== related && hoveredCardRef.current === card) {
        hoveredCardRef.current = null;
        clearParticles();
      }
    };

    const handleClick = (e) => {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      const card = e.target.closest(CARD_SELECTOR);
      if (!card) return;
      const color = getGlowColor();
      const alpha = getRippleAlpha();
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const maxDist = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - r.width, y),
        Math.hypot(x, y - r.height),
        Math.hypot(x - r.width, y - r.height),
      );
      const ripple = document.createElement('div');
      ripple.style.cssText = `position:absolute;width:${maxDist * 2}px;height:${maxDist * 2}px;border-radius:50%;background:radial-gradient(circle,rgba(${color},${alpha}) 0%,rgba(${color},${alpha * 0.5}) 30%,transparent 70%);left:${x - maxDist}px;top:${y - maxDist}px;pointer-events:none;z-index:1000;`;
      card.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => ripple.remove() },
      );
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
      clearParticles();
      spotlight.remove();
    };
  }, [clearParticles, spawnParticles]);

  return null;
}
