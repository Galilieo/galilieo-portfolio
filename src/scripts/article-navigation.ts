import type { Cleanup } from './theme';

function initSectionObserver(
  targets: HTMLElement[],
  links: HTMLAnchorElement[],
  targetId: (target: HTMLElement) => string,
): Cleanup {
  if (targets.length === 0 || links.length === 0 || !('IntersectionObserver' in window)) {
    return () => {};
  }

  const update = () => {
    const marker = window.innerHeight * 0.28;
    let current = targets[0];
    for (const target of targets) {
      if (target.getBoundingClientRect().top <= marker) current = target;
      else break;
    }
    const currentId = targetId(current);

    links.forEach((link) => {
      const linkId = (link.getAttribute('href') ?? '').replace(/^.*#/, '');
      const isCurrent = linkId === currentId;
      link.classList.toggle('is-current', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(update, {
    rootMargin: '-18% 0px -68% 0px',
    threshold: [0, 1],
  });
  targets.forEach((target) => observer.observe(target));
  update();

  return () => {
    observer.disconnect();
    links.forEach((link) => {
      link.classList.remove('is-current');
      link.removeAttribute('aria-current');
    });
  };
}

function initCategoryObserver(): Cleanup {
  const page = document.querySelector<HTMLElement>('.interior-page--blog');
  if (!page) return () => {};
  const links = Array.from(page.querySelectorAll<HTMLAnchorElement>('[data-category-link]'));
  let cleanupObserver: Cleanup = () => {};

  const resetObserver = () => {
    cleanupObserver();
    const sections = Array.from(
      page.querySelectorAll<HTMLElement>('[data-blog-category-section]'),
    ).filter((section) => !section.hidden);
    cleanupObserver = initSectionObserver(sections, links, (section) => section.id);
  };

  resetObserver();
  document.addEventListener('blog:filter-change', resetObserver);

  return () => {
    document.removeEventListener('blog:filter-change', resetObserver);
    cleanupObserver();
  };
}

function initHeadingObserver(): Cleanup {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-reading-toc-link]'));
  const targetIds = new Set(
    links.map((link) => (link.getAttribute('href') ?? '').replace(/^#/, '')).filter(Boolean),
  );
  const headings = Array.from(
    document.querySelectorAll<HTMLElement>('.prose h2[id], .prose h3[id]'),
  ).filter((heading) => targetIds.has(heading.id));
  return initSectionObserver(headings, links, (heading) => heading.id);
}

/** 增强桌面分类与文章章节的当前位置；服务端链接不依赖本模块。 */
export function initArticleNavigation(): Cleanup {
  const cleanups = [initCategoryObserver(), initHeadingObserver()];
  return () => cleanups.reverse().forEach((dispose) => dispose());
}
