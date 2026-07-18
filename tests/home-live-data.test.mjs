import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const githubModule = await import('../src/scripts/home-github-activity.ts').catch(() => undefined);
const environmentModule = await import('../src/scripts/home-environment.ts').catch(() => undefined);

describe('Home Live Data rules', () => {
  test('provides focused GitHub and environment Modules', () => {
    assert.equal(typeof githubModule?.createGitHubActivitySnapshot, 'function');
    assert.equal(typeof githubModule?.parseGitHubEvents, 'function');
    assert.equal(typeof environmentModule?.parseEnvironmentPayload, 'function');
    assert.equal(typeof environmentModule?.parseWeatherPayload, 'function');
  });

  test('summarizes only the latest 30 Shanghai calendar days', () => {
    assert.ok(githubModule, 'GitHub activity Module is missing');
    const events = [
      {
        id: '1',
        type: 'PushEvent',
        created_at: '2026-07-18T01:00:00Z',
        repo: { name: 'g/recent' },
      },
      {
        id: '2',
        type: 'PushEvent',
        created_at: '2026-07-18T02:00:00Z',
        repo: { name: 'g/second' },
      },
      { id: '3', type: 'IssuesEvent', created_at: '2026-07-17T02:00:00Z' },
      { id: 'old', type: 'PushEvent', created_at: '2026-06-18T00:00:00Z', repo: { name: 'g/old' } },
    ];

    const snapshot = githubModule.createGitHubActivitySnapshot(
      events,
      new Date('2026-07-18T12:00:00+08:00'),
    );

    assert.equal(snapshot.cells.length, 30);
    assert.equal(snapshot.eventCount, 3);
    assert.equal(snapshot.eventCountLabel, '3');
    assert.equal(snapshot.activeDayCount, 2);
    assert.equal(snapshot.latestRepository, 'recent');
    assert.deepEqual(
      snapshot.cells.slice(-2).map(({ count, level }) => ({ count, level })),
      [
        { count: 1, level: 2 },
        { count: 2, level: 4 },
      ],
    );
  });

  test('filters invalid events and keeps the bounded-feed 100+ disclosure', () => {
    assert.ok(githubModule, 'GitHub activity Module is missing');
    const validEvents = Array.from({ length: 100 }, (_, index) => ({
      id: String(index),
      type: 'PushEvent',
      created_at: '2026-07-18T01:00:00Z',
    }));
    const parsed = githubModule.parseGitHubEvents([...validEvents, null, { id: 'invalid' }]);
    const snapshot = githubModule.createGitHubActivitySnapshot(
      parsed,
      new Date('2026-07-18T12:00:00+08:00'),
    );

    assert.equal(parsed.length, 100);
    assert.equal(snapshot.eventCountLabel, '100+');
    assert.equal(snapshot.eventSummary, '至少 100+');
    assert.equal(githubModule.parseGitHubEvents({}), undefined);
  });

  test('applies the existing GitHub cache TTL', () => {
    assert.ok(githubModule, 'GitHub activity Module is missing');
    const now = 2_000_000;
    assert.equal(githubModule.isGitHubCacheFresh(now - 30 * 60 * 1000 + 1, now), true);
    assert.equal(githubModule.isGitHubCacheFresh(now - 30 * 60 * 1000, now), false);
  });

  test('validates and normalizes environment and weather payloads', () => {
    assert.ok(environmentModule, 'environment Module is missing');
    const environment = environmentModule.parseEnvironmentPayload(
      {
        success: true,
        city: 'Shanghai',
        country_code: 'CN',
        latitude: 31.2345,
        longitude: 121.4788,
        timezone: { id: 'Asia/Shanghai' },
      },
      123,
    );
    assert.deepEqual(environment, {
      savedAt: 123,
      city: 'Shanghai',
      countryCode: 'CN',
      latitude: 31.23,
      longitude: 121.48,
      timeZone: 'Asia/Shanghai',
    });
    assert.equal(environmentModule.parseEnvironmentPayload({ success: false }, 123), undefined);

    const weather = environmentModule.parseWeatherPayload({
      current: {
        time: '2026-07-18T12:00',
        temperature_2m: 31.2,
        apparent_temperature: 36.1,
        weather_code: 61,
      },
    });
    assert.equal(weather.weather_code, 61);
    assert.equal(environmentModule.parseWeatherPayload({ current: { time: 1 } }), undefined);
    assert.equal(environmentModule.weatherDescription(61), '有雨');
    assert.equal(environmentModule.weatherDescription(-1), '天气变化');
    assert.equal(
      environmentModule.weatherCacheKey(31.2345, 121.4788),
      'galilieo:weather:v1:31.23:121.48',
    );
  });

  test('applies the existing environment and weather cache TTLs', () => {
    assert.ok(environmentModule, 'environment Module is missing');
    const now = 100_000_000;
    assert.equal(
      environmentModule.isEnvironmentCacheFresh(now - 24 * 60 * 60 * 1000 + 1, now),
      true,
    );
    assert.equal(environmentModule.isEnvironmentCacheFresh(now - 24 * 60 * 60 * 1000, now), false);
    assert.equal(environmentModule.isWeatherCacheFresh(now - 15 * 60 * 1000 + 1, now), true);
    assert.equal(environmentModule.isWeatherCacheFresh(now - 15 * 60 * 1000, now), false);
  });
});
