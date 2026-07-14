import type { Cleanup } from './theme';

const TAB_SELECTOR = '[data-archive-tab]';
const PANEL_SELECTOR = '[data-archive-panel]';

export function initArchiveTimeline(): Cleanup {
  const root = document.querySelector<HTMLElement>('[data-archive-timeline]');
  if (!root) return () => undefined;

  const tabs = root.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR);
  const panels = root.querySelectorAll<HTMLElement>(PANEL_SELECTOR);
  if (tabs.length < 2 || panels.length < 2) return () => undefined;

  const getRequestedView = () => {
    const view = new URL(window.location.href).searchParams.get('view');
    return view === 'personal' ? 'personal' : 'blog';
  };

  const activate = (view: string, updateUrl = true) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.archiveTab === view;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.dataset.archivePanel === view;
      panel.toggleAttribute('data-active', active);
      panel.hidden = !active;
    });

    if (!updateUrl) return;
    const url = new URL(window.location.href);
    if (view === 'blog') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const onClick = (event: Event) => {
    const tab = event.currentTarget as HTMLButtonElement;
    activate(tab.dataset.archiveTab ?? 'blog');
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const currentTab = event.currentTarget as HTMLButtonElement;
    const currentIndex = Number(currentTab.dataset.archiveTabIndex ?? 0);
    let nextIndex: number;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    activate(nextTab.dataset.archiveTab ?? 'blog');
  };

  tabs.forEach((tab, index) => {
    tab.dataset.archiveTabIndex = String(index);
    tab.addEventListener('click', onClick);
    tab.addEventListener('keydown', onKeyDown);
  });

  activate(getRequestedView(), false);

  return () => {
    tabs.forEach((tab) => {
      tab.removeEventListener('click', onClick);
      tab.removeEventListener('keydown', onKeyDown);
    });
  };
}
