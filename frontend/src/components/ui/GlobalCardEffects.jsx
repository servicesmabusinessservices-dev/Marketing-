import { useEffect, useRef, useCallback } from 'react';
import './GlobalCardEffects.css';

/**
 * GlobalCardEffects - Simplified card hover effects without GSAP
 * Converted to vanilla CSS transitions (P1 audit fix)
 */

const CARD_SELECTOR = [
  '.card',
  '.stat-card',
  '.jb-step-card',
  '.feature-item',
  '.contact-card',
  '.pipeline-summary-card',
].join(',');

export default function GlobalCardEffects() {
  const cleanupRef = useRef([]);

  const handleCardMouseMove = useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Set CSS custom properties for hover gradient
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  const handleCardMouseEnter = useCallback((e) => {
    e.currentTarget.classList.add('gcfx-hover');
  }, []);

  const handleCardMouseLeave = useCallback((e) => {
    e.currentTarget.classList.remove('gcfx-hover');
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll(CARD_SELECTOR);
    
    cards.forEach((card) => {
      card.addEventListener('mousemove', handleCardMouseMove);
      card.addEventListener('mouseenter', handleCardMouseEnter);
      card.addEventListener('mouseleave', handleCardMouseLeave);
      
      cleanupRef.current.push(() => {
        card.removeEventListener('mousemove', handleCardMouseMove);
        card.removeEventListener('mouseenter', handleCardMouseEnter);
        card.removeEventListener('mouseleave', handleCardMouseLeave);
      });
    });

    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, [handleCardMouseMove, handleCardMouseEnter, handleCardMouseLeave]);

  return null;
}
