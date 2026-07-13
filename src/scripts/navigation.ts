import type { Cleanup } from './theme';

/** 初始化移动端菜单、Header 滚动态和相关无障碍属性。 */
export function initNavigation(): Cleanup {
  const header = document.querySelector<HTMLElement>('.site-header');
  const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const siteNav = document.querySelector<HTMLElement>('.site-nav');
  if (!header || !menuToggle || !siteNav) return () => {};
  const navLinks = Array.from(siteNav.querySelectorAll<HTMLAnchorElement>('a'));
  const mobileViewport = window.matchMedia('(max-width: 920px)');
  let focusFrame = 0;

  const syncAvailability = () => {
    const closedOnMobile = mobileViewport.matches && !siteNav.classList.contains('is-open');
    siteNav.inert = closedOnMobile;
    navLinks.forEach((link) => {
      if (closedOnMobile) link.tabIndex = -1;
      else link.removeAttribute('tabindex');
    });
  };

  const closeMenu = () => {
    if (focusFrame) {
      cancelAnimationFrame(focusFrame);
      focusFrame = 0;
    }
    header.classList.remove('menu-open');
    siteNav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航');
    syncAvailability();
  };

  const onToggle = (event: MouseEvent) => {
    const willOpen = !siteNav.classList.contains('is-open');
    header.classList.toggle('menu-open', willOpen);
    siteNav.classList.toggle('is-open', willOpen);
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    menuToggle.setAttribute('aria-label', willOpen ? '关闭导航' : '打开导航');
    syncAvailability();
    if (willOpen && event.detail === 0) {
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        navLinks[0]?.focus();
      });
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !siteNav.classList.contains('is-open')) return;
    closeMenu();
    menuToggle.focus();
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

  const onViewportChange = () => closeMenu();

  navLinks.forEach((link) => link.addEventListener('click', closeMenu));
  menuToggle.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('scroll', updateHeader, { passive: true });
  mobileViewport.addEventListener('change', onViewportChange);
  updateHeader();
  syncAvailability();

  return () => {
    closeMenu();
    navLinks.forEach((link) => link.removeEventListener('click', closeMenu));
    menuToggle.removeEventListener('click', onToggle);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('scroll', updateHeader);
    mobileViewport.removeEventListener('change', onViewportChange);
    siteNav.inert = false;
    navLinks.forEach((link) => link.removeAttribute('tabindex'));
  };
}
