import type { Cleanup } from './theme';

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
}

interface GitHubCache {
  savedAt: number;
  events: GitHubEvent[];
}

export interface GitHubActivityCell {
  date: string;
  count: number;
  level: number;
}

export interface GitHubActivitySnapshot {
  cells: GitHubActivityCell[];
  eventCount: number;
  eventCountLabel: string;
  eventSummary: string;
  activeDayCount: number;
  latestRepository?: string;
}

const GITHUB_CACHE_KEY = 'galilieo:github-events:v1';
const GITHUB_CACHE_TTL = 30 * 60 * 1000;
const GITHUB_DAYS = 30;
const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateKey(date: Date) {
  return shanghaiDateFormatter.format(date);
}

function isGitHubEvent(value: unknown): value is GitHubEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<GitHubEvent>;
  return (
    typeof event.id === 'string' &&
    typeof event.type === 'string' &&
    typeof event.created_at === 'string'
  );
}

export function parseGitHubEvents(payload: unknown): GitHubEvent[] | undefined {
  return Array.isArray(payload) ? payload.filter(isGitHubEvent) : undefined;
}

export function isGitHubCacheFresh(savedAt: number, now = Date.now()) {
  return now - savedAt < GITHUB_CACHE_TTL;
}

export function createGitHubActivitySnapshot(
  events: GitHubEvent[],
  now = new Date(),
): GitHubActivitySnapshot {
  const todayKey = dateKey(now);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - (GITHUB_DAYS - 1));
  const startKey = start.toISOString().slice(0, 10);

  const eventsInWindow = events.filter((event) => {
    const createdAt = new Date(event.created_at);
    if (Number.isNaN(createdAt.getTime())) return false;
    const key = dateKey(createdAt);
    return key >= startKey && key <= todayKey;
  });
  const dailyCounts = new Map<string, number>();
  for (const event of eventsInWindow) {
    const key = dateKey(new Date(event.created_at));
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  }

  const counts = Array.from({ length: GITHUB_DAYS }, (_, dayIndex) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + dayIndex);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: dailyCounts.get(key) ?? 0 };
  });
  const peak = Math.max(1, ...counts.map(({ count }) => count));
  const cells = counts.map(({ date, count }) => ({
    date,
    count,
    level: count === 0 ? 0 : Math.max(1, Math.ceil((count / peak) * 4)),
  }));
  const eventCount = eventsInWindow.length;
  const eventCountLabel = eventCount >= 100 ? '100+' : String(eventCount);

  return {
    cells,
    eventCount,
    eventCountLabel,
    eventSummary: eventCount >= 100 ? `至少 ${eventCountLabel}` : eventCountLabel,
    activeDayCount: cells.filter(({ count }) => count > 0).length,
    latestRepository: eventsInWindow
      .find((event) => event.repo?.name)
      ?.repo?.name?.split('/')
      .pop(),
  };
}

function readGitHubCache(): GitHubCache | undefined {
  try {
    const raw = localStorage.getItem(GITHUB_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<GitHubCache>;
    const events = parseGitHubEvents(parsed.events);
    if (typeof parsed.savedAt !== 'number' || !events) return undefined;
    return { savedAt: parsed.savedAt, events };
  } catch {
    return undefined;
  }
}

function writeGitHubCache(events: GitHubEvent[]) {
  try {
    localStorage.setItem(
      GITHUB_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), events } satisfies GitHubCache),
    );
  } catch {
    // 存储不可用时仍可展示本次请求结果。
  }
}

function renderGitHubActivity(card: HTMLElement, events: GitHubEvent[], cached = false) {
  const grid = card.querySelector<HTMLElement>('[data-github-grid]');
  const summary = card.querySelector<HTMLElement>('[data-github-summary]');
  const total = card.querySelector<HTMLElement>('[data-github-total]');
  const activeDays = card.querySelector<HTMLElement>('[data-github-active-days]');
  const repository = card.querySelector<HTMLElement>('[data-github-repository]');
  const status = card.querySelector<HTMLElement>('[data-github-status]');
  if (!grid || !summary || !total || !activeDays || !repository || !status) return;

  const snapshot = createGitHubActivitySnapshot(events);
  const fragment = document.createDocumentFragment();
  for (const cellData of snapshot.cells) {
    const cell = document.createElement('span');
    cell.dataset.githubCell = '';
    cell.dataset.level = String(cellData.level);
    cell.title = `${cellData.date} · ${cellData.count} 条公开事件`;
    fragment.append(cell);
  }

  grid.replaceChildren(fragment);
  grid.classList.add('is-loaded');
  grid.setAttribute('aria-label', `最近 30 天 GitHub 公开活动，共 ${snapshot.eventCount} 条`);
  total.textContent = snapshot.eventCountLabel;
  activeDays.textContent = String(snapshot.activeDayCount);
  repository.textContent = snapshot.latestRepository ?? '暂无公开仓库';
  status.textContent = cached ? 'Cached' : 'Live';
  summary.textContent = snapshot.eventCount
    ? `最近 30 天 ${snapshot.eventSummary} 条公开事件${cached ? ' · 本地缓存' : ''}`
    : '最近 30 天暂无公开活动';
  card.dataset.state = 'loaded';
}

export function initGitHubActivity(card: HTMLElement): Cleanup {
  const username = card.dataset.githubUser;
  const summary = card.querySelector<HTMLElement>('[data-github-summary]');
  const status = card.querySelector<HTMLElement>('[data-github-status]');
  if (!username || !summary || !status) return () => undefined;

  const cached = readGitHubCache();
  if (cached) renderGitHubActivity(card, cached.events, true);
  if (cached && isGitHubCacheFresh(cached.savedAt)) return () => undefined;

  card.dataset.state = 'loading';
  if (!cached) {
    summary.textContent = '正在同步最近 30 天公开事件…';
    status.textContent = 'Syncing';
  }

  const controller = new AbortController();
  fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const events = parseGitHubEvents(await response.json());
      if (!events) throw new Error('GitHub API payload is not an array');
      return events;
    })
    .then((events) => {
      writeGitHubCache(events);
      renderGitHubActivity(card, events);
    })
    .catch((error: unknown) => {
      if (controller.signal.aborted || cached) return;
      card.dataset.state = 'error';
      summary.textContent = '公开活动暂不可用，仍可访问 GitHub';
      status.textContent = 'Offline';
      console.warn('[home] GitHub activity unavailable', error);
    });

  return () => controller.abort();
}
