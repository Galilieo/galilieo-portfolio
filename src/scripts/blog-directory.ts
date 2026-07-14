import type { Cleanup } from './theme';

const FILTER_CHANGE_EVENT = 'blog:filter-change';

function readTags(entry: HTMLElement): string[] {
  try {
    return JSON.parse(entry.dataset.articleTags ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** 增强博客 Category / Tags 双目录；服务端始终输出全部文章。 */
export function initBlogDirectory(): Cleanup {
  const root = document.querySelector<HTMLElement>('[data-blog-directory]');
  const navigation = root?.querySelector<HTMLElement>('[data-blog-directory-navigation]');
  if (!root || !navigation) return () => {};

  const tabs = Array.from(
    navigation.querySelectorAll<HTMLButtonElement>('[data-blog-directory-tab]'),
  );
  const panels = Array.from(
    navigation.querySelectorAll<HTMLElement>('[data-blog-directory-panel]'),
  );
  const tagButtons = Array.from(
    navigation.querySelectorAll<HTMLButtonElement>('[data-blog-tag-filter]'),
  );
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-blog-category-section]'));
  const status = navigation.querySelector<HTMLElement>('[data-blog-filter-status]');
  const controller = new AbortController();
  let selectedTag = '';

  const announce = (visibleCount: number) => {
    if (!status) return;
    status.textContent = selectedTag
      ? `Tag「${selectedTag}」· ${String(visibleCount).padStart(2, '0')} 篇文章`
      : `共 ${String(visibleCount).padStart(2, '0')} 篇公开文章`;
  };

  const applyTag = (tag: string) => {
    selectedTag = tag;
    let totalVisible = 0;

    sections.forEach((section) => {
      const entries = Array.from(section.querySelectorAll<HTMLElement>('[data-blog-entry]'));
      let sectionVisible = 0;

      entries.forEach((entry) => {
        const matches = !selectedTag || readTags(entry).includes(selectedTag);
        entry.hidden = !matches;
        if (matches) sectionVisible += 1;
      });

      section.hidden = sectionVisible === 0;
      totalVisible += sectionVisible;
      const count = section.querySelector<HTMLElement>('[data-blog-category-visible-count]');
      if (count) count.textContent = `${String(sectionVisible).padStart(2, '0')} articles`;
    });

    tagButtons.forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String((button.dataset.blogTagFilter ?? '') === selectedTag),
      );
    });
    announce(totalVisible);
    document.dispatchEvent(new CustomEvent(FILTER_CHANGE_EVENT));
  };

  const setMode = (mode: string, focus = false) => {
    tabs.forEach((tab) => {
      const selected = tab.dataset.blogDirectoryTab === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.blogDirectoryPanel !== mode;
    });
    if (mode === 'category' && selectedTag) applyTag('');
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setMode(tab.dataset.blogDirectoryTab ?? 'category'), {
      signal: controller.signal,
    });
    tab.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + offset + tabs.length) % tabs.length];
        setMode(next.dataset.blogDirectoryTab ?? 'category', true);
      },
      { signal: controller.signal },
    );
  });

  tagButtons.forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const tag = button.dataset.blogTagFilter ?? '';
        applyTag(tag === selectedTag ? '' : tag);
      },
      { signal: controller.signal },
    );
  });

  setMode('category');
  applyTag('');

  return () => {
    controller.abort();
    selectedTag = '';
    sections.forEach((section) => {
      section.hidden = false;
      section.querySelectorAll<HTMLElement>('[data-blog-entry]').forEach((entry) => {
        entry.hidden = false;
      });
      const count = section.querySelector<HTMLElement>('[data-blog-category-visible-count]');
      if (count) {
        const original = Number(section.dataset.categoryCount ?? 0);
        count.textContent = `${String(original).padStart(2, '0')} articles`;
      }
    });
    tabs.forEach((tab, index) => {
      tab.setAttribute('aria-selected', String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
    });
    tagButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(!button.dataset.blogTagFilter));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.blogDirectoryPanel !== 'category';
    });
  };
}
