import { initActiveSection } from './active-section';
import { initIslandEffects } from './island-effects';
import { initNavigation } from './navigation';
import { initReveal } from './reveal';
import { initTheme, type Cleanup } from './theme';

let cleanupPage: Cleanup | undefined;

/** 统一初始化当前 Astro 页面，并返回所有客户端行为的清理函数。 */
function initPage(): Cleanup {
  cleanupPage?.();

  const cleanups: Cleanup[] = [
    initTheme(),
    initNavigation(),
    initReveal(),
    initActiveSection(),
    initIslandEffects(),
  ];

  const readyFrame = requestAnimationFrame(() => {
    document.body.classList.add('is-ready');
  });

  const cleanup = () => {
    cancelAnimationFrame(readyFrame);
    cleanups.reverse().forEach((dispose) => dispose());
  };

  cleanupPage = cleanup;
  return cleanup;
}

function disposePage() {
  cleanupPage?.();
  cleanupPage = undefined;
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('astro:before-swap', disposePage);

// 没有启用页面转场或脚本在 page-load 之后执行时，仍保证当前页面完成初始化。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage, { once: true });
} else {
  initPage();
}
