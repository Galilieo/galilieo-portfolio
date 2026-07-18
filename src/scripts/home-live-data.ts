import type { Cleanup } from './theme';
import { initHomeEnvironment } from './home-environment';
import { initGitHubActivity } from './home-github-activity';

/** 初始化首页外部公开数据，并在 Astro 页面切换时中止未完成请求。 */
export function initHomeLiveData(): Cleanup {
  const cleanups: Cleanup[] = [];
  const githubCard = document.querySelector<HTMLElement>('[data-github-activity]');
  const environment = document.querySelector<HTMLElement>('[data-home-environment]');
  if (githubCard) cleanups.push(initGitHubActivity(githubCard));
  if (environment) cleanups.push(initHomeEnvironment(environment));
  return () => cleanups.reverse().forEach((dispose) => dispose());
}
