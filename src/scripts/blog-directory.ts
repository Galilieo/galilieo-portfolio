import type { Cleanup } from './theme';

const FILTER_CHANGE_EVENT = 'blog:filter-change';

function tagsFor(entry: HTMLElement): string[] {
  try {
    return JSON.parse(entry.dataset.articleTags ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** 在完整服务端 Category 内容上增强 Tags 统一结果流。 */
export function initBlogDirectory(): Cleanup {
  const root = document.querySelector<HTMLElement>('[data-blog-directory]');
  const navigation = root?.querySelector<HTMLElement>('[data-blog-directory-navigation]');
  const categoryGroups = root?.querySelector<HTMLElement>('[data-blog-category-groups]');
  const tagResults = root?.querySelector<HTMLElement>('[data-blog-tag-results]');
  const tagHeading = tagResults?.querySelector<HTMLElement>('[data-blog-tag-results-heading]');
  const tagGrid = tagResults?.querySelector<HTMLElement>('[data-blog-tag-results-grid]');
  if (!root || !navigation || !categoryGroups || !tagResults || !tagHeading || !tagGrid) {
    return () => {};
  }

  const tabs = [...navigation.querySelectorAll<HTMLButtonElement>('[data-blog-directory-tab]')];
  const panels = [...navigation.querySelectorAll<HTMLElement>('[data-blog-directory-panel]')];
  const tagButtons = [...navigation.querySelectorAll<HTMLButtonElement>('[data-blog-tag-filter]')];
  const tagEntries = [...tagGrid.querySelectorAll<HTMLElement>('[data-blog-entry]')];
  const headingLabel = tagHeading.querySelector<HTMLElement>('p');
  const headingTitle = tagHeading.querySelector<HTMLElement>('h2');
  const headingCount = tagHeading.querySelector<HTMLElement>('[data-blog-tag-results-count]');
  const status = navigation.querySelector<HTMLElement>('[data-blog-filter-status]');
  const originalStatus = status?.textContent?.trim() ?? '';
  const controller = new AbortController();
  let selectedTag = '';

  const announce = (tag: string, count: number) => {
    if (headingLabel) headingLabel.textContent = tag ? 'TAG' : 'TAG INDEX';
    if (headingTitle) headingTitle.textContent = tag || '全部文章';
    if (headingCount) headingCount.textContent = `${String(count).padStart(2, '0')} articles`;
    if (status) {
      status.textContent = tag
        ? `Tag · ${tag} · ${String(count).padStart(2, '0')} articles`
        : `TAG INDEX · 全部文章 · ${String(count).padStart(2, '0')} articles`;
    }
  };

  const showTag = (tag: string) => {
    selectedTag = tag;
    let visible = 0;
    tagEntries.forEach((entry) => {
      const matches = !tag || tagsFor(entry).includes(tag);
      entry.hidden = !matches;
      if (matches) visible += 1;
    });
    tagButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String((button.dataset.blogTagFilter ?? '') === tag));
    });
    announce(tag, visible);
    document.dispatchEvent(new CustomEvent(FILTER_CHANGE_EVENT));
  };

  const setMode = (mode: 'category' | 'tags', focus = false) => {
    tabs.forEach((tab) => {
      const selected = tab.dataset.blogDirectoryTab === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.blogDirectoryPanel !== mode;
    });

    const tagsMode = mode === 'tags';
    root.dataset.blogDirectoryMode = mode;
    categoryGroups.hidden = tagsMode;
    tagResults.hidden = !tagsMode;
    if (tagsMode) showTag('');
    else {
      selectedTag = '';
      tagEntries.forEach((entry) => { entry.hidden = false; });
      tagButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(!(button.dataset.blogTagFilter ?? '')));
      });
      if (status) status.textContent = originalStatus;
      document.dispatchEvent(new CustomEvent(FILTER_CHANGE_EVENT));
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener(
      'click',
      () => setMode(tab.dataset.blogDirectoryTab === 'tags' ? 'tags' : 'category'),
      { signal: controller.signal },
    );
    tab.addEventListener(
      'keydown',
      (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(index + offset + tabs.length) % tabs.length];
        setMode(next.dataset.blogDirectoryTab === 'tags' ? 'tags' : 'category', true);
      },
      { signal: controller.signal },
    );
  });

  tagButtons.forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const tag = button.dataset.blogTagFilter ?? '';
        showTag(tag === selectedTag ? '' : tag);
      },
      { signal: controller.signal },
    );
  });

  setMode('category');

  return () => {
    controller.abort();
    delete root.dataset.blogDirectoryMode;
    categoryGroups.hidden = false;
    tagResults.hidden = true;
    tagEntries.forEach((entry) => { entry.hidden = false; });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.blogDirectoryPanel !== 'category';
    });
    tabs.forEach((tab, index) => {
      tab.setAttribute('aria-selected', String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
    });
    tagButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(!(button.dataset.blogTagFilter ?? '')));
    });
    if (status) status.textContent = originalStatus;
  };
}
