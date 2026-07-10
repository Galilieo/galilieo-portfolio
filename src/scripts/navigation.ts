import type { Cleanup } from './theme';

/** 初始化移动端菜单、Header 滚动态和相关无障碍属性。 */
export function initNavigation(): Cleanup {
  const header = document.querySelector<HTMLElement>('.site-header');
  const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const siteNav = document.querySelector<HTMLElement>('.site-nav');
  if (!header || !menuToggle || !siteNav) return () => {};

  const closeMenu = () => {
    header.classList.remove('menu-open');
    siteNav.classList.remove('is-open');
    siteNav.style.removeProperty('clip-path');
    siteNav.style.removeProperty('pointer-events');
    siteNav.style.removeProperty('transform');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航');
  };

  const onToggle = () => {
    const willOpen = !siteNav.classList.contains('is-open');
    header.classList.toggle('menu-open', willOpen);
    siteNav.classList.toggle('is-open', willOpen);
    if (willOpen) {
      siteNav.style.clipPath = 'inset(0)';
      siteNav.style.pointerEvents = 'auto';
      siteNav.style.transform = 'translateY(0)';
    } else {
      siteNav.style.removeProperty('clip-path');
      siteNav.style.removeProperty('pointer-events');
      siteNav.style.removeProperty('transform');
    }
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    menuToggle.setAttribute('aria-label', willOpen ? '关闭导航' : '打开导航');
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeMenu();
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!header.classList.contains('menu-open') || header.contains(target)) return;
    closeMenu();
  };

  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 16);
  };

  const navLinks = Array.from(siteNav.querySelectorAll<HTMLAnchorElement>('a'));
  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  menuToggle.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  return () => {
    closeMenu();
    navLinks.forEach((link) => link.removeEventListener('click', closeMenu));
    menuToggle.removeEventListener('click', onToggle);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('scroll', updateHeader);
  };
}
