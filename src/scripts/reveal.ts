import type { Cleanup } from './theme';

/** 初始化区块进入视口动画；减少动态效果时直接显示内容。 */
export function initReveal(): Cleanup {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!('IntersectionObserver' in window) || reducedMotion.matches) {
    items.forEach((item) => item.classList.add('is-visible'));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
  );

  items.forEach((item) => observer.observe(item));
  return () => observer.disconnect();
}
