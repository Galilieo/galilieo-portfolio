import type { Cleanup } from './theme';

interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
}

interface GitHubCache {
  savedAt: number;
  events: GitHubEvent[];
}

interface EnvironmentCache {
  savedAt: number;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

interface WeatherCurrent {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  weather_code: number;
}

interface WeatherCache {
  savedAt: number;
  current: WeatherCurrent;
}

const GITHUB_CACHE_KEY = 'galilieo:github-events:v1';
const GITHUB_CACHE_TTL = 30 * 60 * 1000;
const GITHUB_DAYS = 30;
const ENVIRONMENT_CACHE_KEY = 'galilieo:environment:v1';
const ENVIRONMENT_CACHE_TTL = 24 * 60 * 60 * 1000;
const WEATHER_CACHE_PREFIX = 'galilieo:weather:v1';
const WEATHER_CACHE_TTL = 15 * 60 * 1000;
const IP_LOCATION_URL = 'https://ipwho.is/';
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

function readGitHubCache(): GitHubCache | undefined {
  try {
    const raw = localStorage.getItem(GITHUB_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<GitHubCache>;
    if (typeof parsed.savedAt !== 'number' || !Array.isArray(parsed.events)) return undefined;
    return { savedAt: parsed.savedAt, events: parsed.events.filter(isGitHubEvent) };
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

  const dailyCounts = new Map<string, number>();
  events.forEach((event) => {
    const createdAt = new Date(event.created_at);
    if (isNaN(createdAt.getTime())) return;
    const key = dateKey(createdAt);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  });

  const today = new Date(`${dateKey(new Date())}T00:00:00Z`);
  const start = new Date(today.getTime());
  start.setUTCDate(today.getUTCDate() - (GITHUB_DAYS - 1));
  const countsInWindow: number[] = [];

  for (let dayIndex = 0; dayIndex < GITHUB_DAYS; dayIndex += 1) {
    const day = new Date(start.getTime());
    day.setUTCDate(start.getUTCDate() + dayIndex);
    countsInWindow.push(dailyCounts.get(day.toISOString().slice(0, 10)) ?? 0);
  }

  const peak = Math.max(1, ...countsInWindow);
  const fragment = document.createDocumentFragment();
  let activeDayCount = 0;

  countsInWindow.forEach((count, dayIndex) => {
    const day = new Date(start.getTime());
    day.setUTCDate(start.getUTCDate() + dayIndex);
    const dayKey = day.toISOString().slice(0, 10);
    const level = count === 0 ? 0 : Math.max(1, Math.ceil((count / peak) * 4));
    if (count > 0) activeDayCount += 1;

    const cell = document.createElement('span');
    cell.dataset.githubCell = '';
    cell.dataset.level = String(level);
    cell.title = `${dayKey} · ${count} 条公开事件`;
    fragment.append(cell);
  });

  grid.replaceChildren(fragment);
  grid.classList.add('is-loaded');
  grid.setAttribute('aria-label', `最近 30 天 GitHub 公开活动，共 ${events.length} 条`);
  const latestRepository = events[0]?.repo?.name?.split('/').pop();
  const eventCountLabel = events.length >= 100 ? '100+' : String(events.length);
  const eventSummary = events.length >= 100 ? `至少 ${eventCountLabel}` : eventCountLabel;
  total.textContent = eventCountLabel;
  activeDays.textContent = String(activeDayCount);
  repository.textContent = latestRepository ?? '暂无公开仓库';
  status.textContent = cached ? 'Cached' : 'Live';
  summary.textContent = events.length
    ? `最近 30 天 ${eventSummary} 条公开事件${cached ? ' · 本地缓存' : ''}`
    : '最近 30 天暂无公开活动';
  card.dataset.state = 'loaded';
}

function initGitHubActivity(card: HTMLElement): Cleanup {
  const username = card.dataset.githubUser;
  const summary = card.querySelector<HTMLElement>('[data-github-summary]');
  const status = card.querySelector<HTMLElement>('[data-github-status]');
  if (!username || !summary || !status) return () => undefined;

  const cached = readGitHubCache();
  if (cached) renderGitHubActivity(card, cached.events, true);
  if (cached && Date.now() - cached.savedAt < GITHUB_CACHE_TTL) return () => undefined;

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
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error('GitHub API payload is not an array');
      return payload.filter(isGitHubEvent);
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

function weatherDescription(code: number) {
  if (code === 0) return '晴';
  if (code === 1) return '晴间多云';
  if (code === 2) return '多云';
  if (code === 3) return '阴';
  if (code === 45 || code === 48) return '有雾';
  if (code >= 51 && code <= 57) return '毛毛雨';
  if (code >= 61 && code <= 67) return '有雨';
  if (code >= 71 && code <= 77) return '有雪';
  if (code >= 80 && code <= 82) return '阵雨';
  if (code >= 85 && code <= 86) return '阵雪';
  if (code >= 95) return '雷雨';
  return '天气变化';
}

function isEnvironmentCache(value: unknown): value is EnvironmentCache {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<EnvironmentCache>;
  return (
    typeof item.savedAt === 'number' &&
    typeof item.city === 'string' &&
    typeof item.countryCode === 'string' &&
    typeof item.latitude === 'number' &&
    typeof item.longitude === 'number' &&
    typeof item.timeZone === 'string'
  );
}

function readEnvironmentCache() {
  try {
    const raw = localStorage.getItem(ENVIRONMENT_CACHE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isEnvironmentCache(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeEnvironmentCache(environment: EnvironmentCache) {
  try {
    localStorage.setItem(ENVIRONMENT_CACHE_KEY, JSON.stringify(environment));
  } catch {
    // 粗略位置缓存不可用时仅影响下次加载速度。
  }
}

function isWeatherCurrent(value: unknown): value is WeatherCurrent {
  if (!value || typeof value !== 'object') return false;
  const current = value as Partial<WeatherCurrent>;
  return (
    typeof current.time === 'string' &&
    typeof current.temperature_2m === 'number' &&
    typeof current.apparent_temperature === 'number' &&
    typeof current.weather_code === 'number'
  );
}

function weatherCacheKey(latitude: number, longitude: number) {
  return `${WEATHER_CACHE_PREFIX}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

function readWeatherCache(latitude: number, longitude: number): WeatherCache | undefined {
  try {
    const raw = localStorage.getItem(weatherCacheKey(latitude, longitude));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<WeatherCache>;
    if (typeof parsed.savedAt !== 'number' || !isWeatherCurrent(parsed.current)) return undefined;
    return { savedAt: parsed.savedAt, current: parsed.current };
  } catch {
    return undefined;
  }
}

function writeWeatherCache(latitude: number, longitude: number, current: WeatherCurrent) {
  try {
    localStorage.setItem(
      weatherCacheKey(latitude, longitude),
      JSON.stringify({ savedAt: Date.now(), current } satisfies WeatherCache),
    );
  } catch {
    // 天气缓存不可用时仍展示本次结果。
  }
}

function applyTimeZone(status: HTMLElement, timeZone: string, label: string) {
  const timeLabel = status.querySelector<HTMLElement>('[data-home-time-label]');
  if (timeLabel) timeLabel.textContent = label;
  document.dispatchEvent(new CustomEvent('site:time-zone-change', { detail: timeZone }));
}

function renderEnvironment(status: HTMLElement, environment: EnvironmentCache) {
  const location = status.querySelector<HTMLElement>('[data-home-location]');
  if (location) location.textContent = `${environment.city}, ${environment.countryCode}`;
  applyTimeZone(status, environment.timeZone, 'Local time');
  status.dataset.state = 'loaded';
}

function renderWeather(weather: HTMLElement, current: WeatherCurrent, cached = false) {
  const summary = weather.querySelector<HTMLElement>('[data-weather-summary]');
  const updated = weather.querySelector<HTMLTimeElement>('[data-weather-updated]');
  if (!summary || !updated) return;
  const temperature = Math.round(current.temperature_2m);
  const apparent = Math.round(current.apparent_temperature);
  summary.textContent = `${weatherDescription(current.weather_code)} · ${temperature}°C · 体感 ${apparent}°C${cached ? ' · 缓存' : ''}`;
  summary.title = `天气数据更新时间 ${current.time}`;
  updated.dateTime = current.time;
  weather.dataset.state = 'loaded';
}

function initEnvironment(status: HTMLElement): Cleanup {
  const weather = status.querySelector<HTMLElement>('[data-home-weather]');
  const weatherSummary = weather?.querySelector<HTMLElement>('[data-weather-summary]');
  if (!weather || !weatherSummary) return () => undefined;

  const defaultLatitude = Number(status.dataset.defaultLatitude);
  const defaultLongitude = Number(status.dataset.defaultLongitude);
  const defaultTimeZone = status.dataset.defaultTimeZone ?? 'Asia/Shanghai';
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (browserTimeZone) applyTimeZone(status, browserTimeZone, 'Local time');
  weather.dataset.state = 'loading';
  weatherSummary.textContent = '天气加载中…';

  let disposed = false;
  let weatherController: AbortController | undefined;
  const locationController = new AbortController();
  const locationTimeout = window.setTimeout(() => locationController.abort(), 3500);

  const startWeather = (latitude: number, longitude: number, timeZone: string) => {
    if (disposed) return;
    const cached = readWeatherCache(latitude, longitude);
    if (cached) renderWeather(weather, cached.current, true);
    if (cached && Date.now() - cached.savedAt < WEATHER_CACHE_TTL) return;

    weatherController?.abort();
    weatherController = new AbortController();
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toFixed(2));
    url.searchParams.set('longitude', longitude.toFixed(2));
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code');
    url.searchParams.set('timezone', timeZone);

    fetch(url, { signal: weatherController.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Weather API ${response.status}`);
        const payload = (await response.json()) as { current?: unknown };
        if (!isWeatherCurrent(payload.current)) throw new Error('Weather payload is invalid');
        return payload.current;
      })
      .then((current) => {
        if (disposed) return;
        writeWeatherCache(latitude, longitude, current);
        renderWeather(weather, current);
      })
      .catch((error: unknown) => {
        if (disposed || weatherController?.signal.aborted || cached) return;
        weather.dataset.state = 'error';
        weatherSummary.textContent = '天气暂不可用';
        console.warn('[home] Weather unavailable', error);
      });
  };

  const fallback = () => {
    status.dataset.state = 'fallback';
    startWeather(defaultLatitude, defaultLongitude, defaultTimeZone);
  };

  const cachedEnvironment = readEnvironmentCache();
  if (cachedEnvironment) {
    renderEnvironment(status, cachedEnvironment);
    startWeather(
      cachedEnvironment.latitude,
      cachedEnvironment.longitude,
      cachedEnvironment.timeZone,
    );
  }
  if (cachedEnvironment && Date.now() - cachedEnvironment.savedAt < ENVIRONMENT_CACHE_TTL) {
    window.clearTimeout(locationTimeout);
    locationController.abort();
    return () => {
      disposed = true;
      weatherController?.abort();
    };
  }

  fetch(IP_LOCATION_URL, { signal: locationController.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`IP location API ${response.status}`);
      const payload = (await response.json()) as {
        success?: boolean;
        city?: unknown;
        country_code?: unknown;
        latitude?: unknown;
        longitude?: unknown;
        timezone?: { id?: unknown };
      };
      if (
        payload.success !== true ||
        typeof payload.city !== 'string' ||
        typeof payload.country_code !== 'string' ||
        typeof payload.latitude !== 'number' ||
        typeof payload.longitude !== 'number' ||
        typeof payload.timezone?.id !== 'string'
      ) {
        throw new Error('IP location payload is invalid');
      }
      return {
        savedAt: Date.now(),
        city: payload.city,
        countryCode: payload.country_code,
        latitude: Math.round(payload.latitude * 100) / 100,
        longitude: Math.round(payload.longitude * 100) / 100,
        timeZone: payload.timezone.id,
      } satisfies EnvironmentCache;
    })
    .then((environment) => {
      if (disposed) return;
      window.clearTimeout(locationTimeout);
      writeEnvironmentCache(environment);
      renderEnvironment(status, environment);
      startWeather(environment.latitude, environment.longitude, environment.timeZone);
    })
    .catch((error: unknown) => {
      if (disposed || cachedEnvironment) return;
      fallback();
      console.warn('[home] IP location unavailable; using Shanghai fallback', error);
    });

  return () => {
    disposed = true;
    window.clearTimeout(locationTimeout);
    locationController.abort();
    weatherController?.abort();
  };
}

/** 初始化首页外部公开数据，并在 Astro 页面切换时中止未完成请求。 */
export function initHomeLiveData(): Cleanup {
  const cleanups: Cleanup[] = [];
  const githubCard = document.querySelector<HTMLElement>('[data-github-activity]');
  const environment = document.querySelector<HTMLElement>('[data-home-environment]');
  if (githubCard) cleanups.push(initGitHubActivity(githubCard));
  if (environment) cleanups.push(initEnvironment(environment));
  return () => cleanups.reverse().forEach((dispose) => dispose());
}
