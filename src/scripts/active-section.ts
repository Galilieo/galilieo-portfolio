import type { Cleanup } from './theme';

/** 根据首页阅读位置更新导航 active，并使用 rAF 限制滚动计算频率。 */
export function initActiveSection(): Cleanup {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.site-nav a'));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
  if (links.length === 0) return () => {};

  const currentPath = window.location.pathname;
  const sectionLinks = new Map<string, HTMLAnchorElement>();
  const homeLink = links.find((link) => {
    const url = new URL(link.href, window.location.href);
    return url.pathname === '/' && !url.hash;
  });

  links.forEach((link) => {
    const url = new URL(link.href, window.location.href);
    const sectionId = url.hash.slice(1);
    if (sectionId && (url.pathname === '/' || url.pathname === currentPath)) {
      sectionLinks.set(sectionId, link);
    }
  });

  const setActive = (activeLink?: HTMLAnchorElement) => {
    links.forEach((link) => link.classList.toggle('is-active', link === activeLink));
  };

  let frame = 0;
  const update = () => {
    if (currentPath !== '/' || sections.length === 0) {
      const routeLink = links.find(
        (link) => new URL(link.href, window.location.href).pathname === currentPath,
      );
      setActive(routeLink);
      frame = 0;
      return;
    }

    const readingLine = window.scrollY + window.innerHeight * 0.32;
    let currentSection = sections[0];
    sections.forEach((section) => {
      if (section.offsetTop <= readingLine) currentSection = section;
    });
    const activeLink =
      currentSection?.id === 'top'
        ? homeLink
        : currentSection
          ? sectionLinks.get(currentSection.id)
          : homeLink;
    setActive(activeLink);
    frame = 0;
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  update();

  return () => {
    window.removeEventListener('scroll', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
