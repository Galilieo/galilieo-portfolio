export type Cleanup = () => void;

/** 初始化明暗主题并同步按钮、theme-color 与本地记忆。 */
export function initTheme(): Cleanup {
  const root = document.documentElement;
  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  const readSavedTheme = (): 'light' | 'dark' | null => {
    try {
      const value = localStorage.getItem('galilieo-theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  };

  const syncControls = () => {
    const isDark = root.dataset.theme === 'dark';
    toggle?.setAttribute('aria-pressed', String(isDark));
    toggle?.setAttribute('aria-label', isDark ? '切换至浅色模式' : '切换至深色模式');
    themeColor?.setAttribute('content', isDark ? '#191b1a' : '#f5f1e9');
  };

  const savedTheme = readSavedTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = savedTheme ?? (prefersDark ? 'dark' : 'light');
  syncControls();

  const onToggle = () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('galilieo-theme', root.dataset.theme);
    } catch {
      // 禁用存储时仍允许本次页面切换主题。
    }
    syncControls();
    window.dispatchEvent(new CustomEvent('galilieo:theme-change'));
  };

  toggle?.addEventListener('click', onToggle);

  return () => {
    toggle?.removeEventListener('click', onToggle);
  };
}
