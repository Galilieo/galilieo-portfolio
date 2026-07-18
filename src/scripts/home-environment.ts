import type { Cleanup } from './theme';

export interface EnvironmentCache {
  savedAt: number;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface WeatherCurrent {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  weather_code: number;
}

interface WeatherCache {
  savedAt: number;
  current: WeatherCurrent;
}

const ENVIRONMENT_CACHE_KEY = 'galilieo:environment:v1';
const ENVIRONMENT_CACHE_TTL = 24 * 60 * 60 * 1000;
const WEATHER_CACHE_PREFIX = 'galilieo:weather:v1';
const WEATHER_CACHE_TTL = 15 * 60 * 1000;
const IP_LOCATION_URL = 'https://ipwho.is/';

export function weatherDescription(code: number) {
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

export function parseEnvironmentPayload(payload: unknown, savedAt = Date.now()) {
  if (!payload || typeof payload !== 'object') return undefined;
  const item = payload as {
    success?: boolean;
    city?: unknown;
    country_code?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    timezone?: { id?: unknown };
  };
  if (
    item.success !== true ||
    typeof item.city !== 'string' ||
    typeof item.country_code !== 'string' ||
    typeof item.latitude !== 'number' ||
    typeof item.longitude !== 'number' ||
    typeof item.timezone?.id !== 'string'
  ) {
    return undefined;
  }

  return {
    savedAt,
    city: item.city,
    countryCode: item.country_code,
    latitude: Math.round(item.latitude * 100) / 100,
    longitude: Math.round(item.longitude * 100) / 100,
    timeZone: item.timezone.id,
  } satisfies EnvironmentCache;
}

export function parseWeatherPayload(payload: unknown): WeatherCurrent | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const current = (payload as { current?: unknown }).current;
  return isWeatherCurrent(current) ? current : undefined;
}

export function weatherCacheKey(latitude: number, longitude: number) {
  return `${WEATHER_CACHE_PREFIX}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

export function isEnvironmentCacheFresh(savedAt: number, now = Date.now()) {
  return now - savedAt < ENVIRONMENT_CACHE_TTL;
}

export function isWeatherCacheFresh(savedAt: number, now = Date.now()) {
  return now - savedAt < WEATHER_CACHE_TTL;
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

export function initHomeEnvironment(status: HTMLElement): Cleanup {
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
    if (cached && isWeatherCacheFresh(cached.savedAt)) return;

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
        const current = parseWeatherPayload(await response.json());
        if (!current) throw new Error('Weather payload is invalid');
        return current;
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
  if (cachedEnvironment && isEnvironmentCacheFresh(cachedEnvironment.savedAt)) {
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
      const environment = parseEnvironmentPayload(await response.json());
      if (!environment) throw new Error('IP location payload is invalid');
      return environment;
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
