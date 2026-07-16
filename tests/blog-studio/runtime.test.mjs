import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:net';
import http from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { findAvailablePort, resolveAstroPreview, startAstroDev } from '../../scripts/lib/blog-studio-runtime.mjs';

describe('findAvailablePort', () => {
  test('returns a port number at or above the start port', async () => {
    const port = await findAvailablePort(4310);
    assert.equal(typeof port, 'number');
    assert.ok(port >= 4310);
    assert.ok(port <= 65535);
  });

  test('skips ports already in use', async () => {
    // Find a free port to block first
    const probe = createServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const blockedPort = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));

    const blocker = createServer();
    await new Promise((resolve) => blocker.listen(blockedPort, '127.0.0.1', resolve));
    try {
      const port = await findAvailablePort(blockedPort);
      assert.ok(port > blockedPort, `expected port > ${blockedPort}, got ${port}`);
    } finally {
      await new Promise((resolve) => blocker.close(resolve));
    }
  });
});

describe('resolveAstroPreview', () => {
  test('returns null when no .astro/dev.json exists', async () => {
    const dir = join(tmpdir(), `galilieo-runtime-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      const origin = await resolveAstroPreview(dir);
      assert.equal(origin, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns origin when dev.json has a reachable loopback Astro server', async () => {
    const dir = join(tmpdir(), `galilieo-runtime-${Date.now()}`);
    mkdirSync(join(dir, '.astro'), { recursive: true });

    // Start a dummy HTTP server on a loopback port to simulate Astro dev
    const probe = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html></html>');
    });
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const astroPort = probe.address().port;
    const astroOrigin = `http://127.0.0.1:${astroPort}`;

    writeFileSync(join(dir, '.astro', 'dev.json'), JSON.stringify({
      port: astroPort,
      url: astroOrigin,
    }));

    try {
      const origin = await resolveAstroPreview(dir);
      assert.equal(origin, astroOrigin);
    } finally {
      await new Promise((resolve) => probe.close(resolve));
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns null when dev.json URL is non-loopback', async () => {
    const dir = join(tmpdir(), `galilieo-runtime-${Date.now()}`);
    mkdirSync(join(dir, '.astro'), { recursive: true });
    writeFileSync(join(dir, '.astro', 'dev.json'), JSON.stringify({
      port: 4321,
      url: 'http://192.168.1.1:4321',
    }));
    try {
      const origin = await resolveAstroPreview(dir);
      assert.equal(origin, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns null when dev.json server is unreachable', async () => {
    const dir = join(tmpdir(), `galilieo-runtime-${Date.now()}`);
    mkdirSync(join(dir, '.astro'), { recursive: true });
    writeFileSync(join(dir, '.astro', 'dev.json'), JSON.stringify({
      port: 19999,
      url: 'http://127.0.0.1:19999',
    }));
    try {
      const origin = await resolveAstroPreview(dir);
      assert.equal(origin, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('accepts localhost as loopback hostname', async () => {
    const dir = join(tmpdir(), `galilieo-runtime-${Date.now()}`);
    mkdirSync(join(dir, '.astro'), { recursive: true });

    const probe = http.createServer((_req, res) => {
      res.writeHead(200);
      res.end('ok');
    });
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const astroPort = probe.address().port;

    writeFileSync(join(dir, '.astro', 'dev.json'), JSON.stringify({
      port: astroPort,
      url: `http://localhost:${astroPort}`,
    }));

    try {
      const origin = await resolveAstroPreview(dir);
      assert.equal(origin, `http://localhost:${astroPort}`);
    } finally {
      await new Promise((resolve) => probe.close(resolve));
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('startAstroDev', () => {
  test('starts Astro dev on a loopback port and returns process + origin', async () => {
    const repoRoot = join(tmpdir(), `galilieo-runtime-astro-${Date.now()}`);
    const cliDirectory = join(repoRoot, 'node_modules', 'astro', 'bin');
    mkdirSync(cliDirectory, { recursive: true });
    writeFileSync(join(cliDirectory, 'astro.mjs'), `
      import http from 'node:http';
      const host = process.argv[process.argv.indexOf('--host') + 1];
      const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
      const server = http.createServer((_request, response) => response.end('preview'));
      server.listen(port, host);
      process.on('SIGTERM', () => server.close(() => process.exit(0)));
    `);

    let result = null;
    try {
      result = await startAstroDev(repoRoot);
      assert.ok(result.process, 'should return a child process');
      assert.match(result.origin, /^http:\/\/127\.0\.0\.1:\d+$/);
      const response = await fetch(result.origin);
      assert.equal(await response.text(), 'preview');
    } finally {
      if (result?.process.exitCode === null) {
        result.process.kill('SIGTERM');
        await once(result.process, 'close');
      }
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('Studio launcher lifecycle', () => {
  test('cleans up a preview process when startup fails after Astro launches', () => {
    const launcher = readFileSync(join(process.cwd(), 'scripts', 'blog-studio.mjs'), 'utf8');
    assert.match(launcher, /catch \(error\) \{\s*startedPreview\?\.process\.kill\('SIGTERM'\)/);
  });
});
