import { useEffect, useRef, useState } from 'react';

/**
 * Reveal-on-scroll. Returns [ref, visible].
 * Pair with the .reveal / .reveal-visible classes in App.css.
 *
 *   const [ref, visible] = useReveal();
 *   <div ref={ref} className={`reveal ${visible ? 'reveal-visible' : ''}`}>...</div>
 */
export const useReveal = ({ threshold = 0.15, rootMargin = '0px 0px -10% 0px', once = true } = {}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, visible];
};
