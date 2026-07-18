import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, describe, test } from 'node:test';
import sharp from 'sharp';

import { parseFrontmatter } from '../../scripts/lib/blog-frontmatter.mjs';
import { createBlogStudioServer, MAX_BODY_SIZE } from '../../scripts/lib/blog-studio-server.mjs';
import { findStudioLeaks } from '../../scripts/check-studio-isolation.mjs';

const root = join(tmpdir(), `galilieo-studio-server-${randomUUID()}`);
const blogDirectory = join(root, 'src', 'content', 'blog');
const coversDirectory = join(root, 'src', 'assets', 'images', 'covers');
const profileDirectory = join(root, 'src', 'assets', 'images', 'profile');
const toolsDirectory = join(root, 'tools', 'blog-studio');
const scriptsDirectory = join(root, 'scripts');
let server;
let base;
let cookie;
const previewOrigin = 'http://localhost:4999';

const draft = `---
title: '草稿'
description: '草稿摘要。'
category: '工程笔记'
tags:
  - '测试'
draft: true
featured: false
order: 1
homepageState: '草稿'
---

草稿正文。
`;

const mdx = `---
title: 'MDX'
description: '只读内容。'
category: '工程笔记'
tags:
  - 'MDX'
draft: true
featured: false
order: 9
homepageState: '草稿'
---

MDX
`;

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.method && options.method !== 'GET') headers.set('Origin', base);
  if (cookie) headers.set('Cookie', cookie);
  return fetch(`${base}${path}`, { ...options, headers });
}

async function json(path, options = {}) {
  const response = await request(path, options);
  const data = await response.json();
  return { data, response };
}

async function createArticle(slug, title = '新文章') {
  return json('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      title,
      description: '新文章摘要。',
      category: '工程笔记',
      tags: ['测试'],
    }),
  });
}

before(async () => {
  mkdirSync(blogDirectory, { recursive: true });
  mkdirSync(coversDirectory, { recursive: true });
  mkdirSync(profileDirectory, { recursive: true });
  mkdirSync(toolsDirectory, { recursive: true });
  mkdirSync(scriptsDirectory, { recursive: true });
  writeFileSync(join(blogDirectory, 'draft.md'), draft);
  writeFileSync(join(blogDirectory, 'component.mdx'), mdx);
  // Create minimal cover fixture files
  for (const key of ['alley', 'balcony', 'bloom', 'orbit', 'window']) {
    writeFileSync(join(coversDirectory, `scene-${key}.webp`), Buffer.from('fixture-cover'));
  }
  writeFileSync(join(profileDirectory, 'galilieo-avatar.webp'), Buffer.from('fixture-avatar'));
  writeFileSync(
    join(toolsDirectory, 'index.html'),
    '<!doctype html><p data-blog-studio>Studio</p>',
  );
  writeFileSync(join(toolsDirectory, 'studio.css'), 'body{}');
  writeFileSync(join(toolsDirectory, 'studio.js'), '');
  writeFileSync(join(scriptsDirectory, 'verify.mjs'), "console.log('fixture verify passed');\n");

  server = createBlogStudioServer({
    logger: { error() {}, log() {} },
    port: 0,
    previewOrigin,
    repoRoot: root,
    verifyTimeout: 10_000,
  });
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  const session = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { Origin: base },
  });
  cookie = session.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
      server.closeAllConnections();
    });
  }
  await delay(100);
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

describe('Studio HTTP security boundary', () => {
  test('serves only whitelisted local UI assets with security headers', async () => {
    const response = await request('/');
    assert.equal(response.status, 200);
    const csp = response.headers.get('content-security-policy');
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, new RegExp(`frame-src ${previewOrigin.replaceAll('.', '\\.')}`));
    assert.doesNotMatch(csp, /127\.0\.0\.1:4321/);
    assert.equal(response.headers.get('access-control-allow-origin'), null);

    const avatar = await request('/avatar.webp');
    assert.equal(avatar.status, 200);
    assert.equal(avatar.headers.get('content-type'), 'image/webp');

    const denied = await request('/../package.json');
    assert.equal(denied.status, 404);
  });

  test('requires exact same-origin session for writes', async () => {
    const savedCookie = cookie;
    cookie = null;
    const unauthenticated = await createArticle('blocked');
    cookie = savedCookie;
    assert.equal(unauthenticated.response.status, 401);

    const evil = await fetch(`${base}/api/session`, {
      method: 'POST',
      headers: { Origin: `${base}.evil.example` },
    });
    assert.equal(evil.status, 403);
  });

  test('does not expose delete or arbitrary command endpoints', async () => {
    assert.equal((await request('/api/articles/draft', { method: 'DELETE' })).status, 405);
    assert.equal((await request('/api/command', { method: 'POST' })).status, 405);
  });
});

describe('article API', () => {
  test('lists source files and marks MDX read-only', async () => {
    const { data, response } = await json('/api/articles');
    assert.equal(response.status, 200);
    assert.equal(data.articles.length, 2);
    assert.equal(data.articles.find(({ slug }) => slug === 'component').editable, false);
    assert.deepEqual(data.categories, ['工程笔记']);
    assert.equal(data.nextOrder, 10);
    assert.equal(data.previewOrigin, previewOrigin);
  });

  test('creates a schema-valid draft with the next order', async () => {
    const { data, response } = await createArticle('new-draft');
    assert.equal(response.status, 201);
    assert.equal(data.draft, true);
    assert.equal(data.order, 10);
    assert.equal(
      parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')).title,
      '新文章',
    );
  });

  test('rejects invalid slug, incomplete metadata and duplicate files', async () => {
    assert.equal((await createArticle('../escape')).response.status, 400);
    assert.equal(
      (
        await json('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: 'incomplete', title: 'Incomplete' }),
        })
      ).response.status,
      422,
    );
    assert.equal((await createArticle('new-draft')).response.status, 409);
  });

  test('prevents duplicate order and refuses to rewrite MDX', async () => {
    const update = {
      ...parseFrontmatter(readFileSync(join(blogDirectory, 'draft.md'), 'utf8')),
      order: 10,
    };
    const conflict = await json('/api/articles/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    assert.equal(conflict.response.status, 422);
    assert.match(conflict.data.errors[0].message, /new-draft/);

    const mdxUpdate = await json('/api/articles/component', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    assert.equal(mdxUpdate.response.status, 403);
  });

  test('enforces request size while keeping the server responsive', async () => {
    const oversized = await request('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(MAX_BODY_SIZE + 1) }),
    });
    assert.equal(oversized.status, 413);
    assert.equal((await request('/api/articles')).status, 200);
  });

  test('uploads a validated WebP cover and updates frontmatter', async () => {
    const image = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: '#8aa4d8' },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append('cover', new Blob([image], { type: 'image/png' }), 'cover.png');

    const response = await request('/api/articles/new-draft/cover', { method: 'POST', body: form });
    assert.equal(response.status, 200);
    const cover = join(root, 'src', 'assets', 'images', 'blog', 'new-draft', 'cover.webp');
    assert.equal(existsSync(cover), true);
    assert.equal((await sharp(readFileSync(cover)).metadata()).width, 1600);
    assert.match(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8'), /cover\.webp/);
  });

  test('runs only the fixed repository verification script', async () => {
    const { data, response } = await json('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'should be ignored' }),
    });
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.match(data.stdout, /fixture verify passed/);
  });
});

describe('cover gallery', () => {
  test('returns available scene-*.webp covers with keys and thumbnail URLs', async () => {
    const { data, response } = await json('/api/covers');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(data.covers));
    assert.ok(data.covers.length >= 1);
    for (const cover of data.covers) {
      assert.ok(typeof cover.key === 'string' && cover.key.length > 0);
      assert.ok(
        typeof cover.thumbnail === 'string' &&
          cover.thumbnail.startsWith('/api/covers/thumbnails/'),
      );
      assert.ok(typeof cover.position === 'string');
    }
    // All known keys should be present
    const keys = data.covers.map((c) => c.key);
    for (const expected of ['alley', 'balcony', 'bloom', 'orbit', 'window']) {
      assert.ok(keys.includes(expected), `missing cover key: ${expected}`);
    }
  });

  test('serves thumbnail WebP with correct content type', async () => {
    const response = await request('/api/covers/thumbnails/alley');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=3600');
  });

  test('returns 404 for unknown thumbnail key', async () => {
    assert.equal((await request('/api/covers/thumbnails/nonexistent')).status, 404);
    assert.equal((await request('/api/covers/thumbnails/not-a-key')).status, 404);
  });

  test('preserves an uploaded custom cover when an article update omits cover', async () => {
    const before = parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8'));
    assert.match(before.cover, /assets\/images\/blog\/new-draft\/cover\.webp$/);
    const input = { ...before, title: '保留专属封面的更新' };
    delete input.cover;

    const { data, response } = await json('/api/articles/new-draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    assert.equal(response.status, 200);
    assert.equal(data.cover, before.cover);
    assert.equal(
      parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')).cover,
      before.cover,
    );
  });

  test('selects a valid gallery cover key via PUT', async () => {
    const { data, response } = await json('/api/articles/new-draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')),
        cover: 'bloom',
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(data.cover, '../../assets/images/covers/scene-bloom.webp');

    // Frontmatter keeps Astro image() compatible by storing the approved relative path.
    const saved = parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8'));
    assert.equal(saved.cover, '../../assets/images/covers/scene-bloom.webp');
  });

  test('restores auto cover when cover is set to "auto"', async () => {
    const { data, response } = await json('/api/articles/new-draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')),
        cover: 'auto',
      }),
    });
    assert.equal(response.status, 200);
    // auto means no explicit cover field in frontmatter
    assert.equal(data.cover, undefined);

    const saved = parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8'));
    assert.equal(saved.cover, undefined);
  });

  test('rejects arbitrary cover paths (not a known key)', async () => {
    const arbitrary = await json('/api/articles/new-draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')),
        cover: '../../assets/images/evil.png',
      }),
    });
    assert.equal(arbitrary.response.status, 422);
    assert.ok(
      arbitrary.data.errors[0].message.includes('封面') ||
        arbitrary.data.errors[0].message.includes('cover'),
    );
  });

  test('rejects cover paths containing slash or dot segments', async () => {
    const pathTraversal = await json('/api/articles/new-draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')),
        cover: '../secret.webp',
      }),
    });
    assert.equal(pathTraversal.response.status, 422);

    const absolute = await json('/api/articles/new-draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...parseFrontmatter(readFileSync(join(blogDirectory, 'new-draft.md'), 'utf8')),
        cover: '/etc/passwd',
      }),
    });
    assert.equal(absolute.response.status, 422);
  });
});

describe('taxonomy authoring validation', () => {
  test('allows a new category and returns it as a future candidate', async () => {
    const input = {
      slug: 'test-cat',
      title: 'Test Category',
      description: 'Test.',
      category: '随机新分类',
      tags: ['测试'],
    };
    const { data, response } = await json('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 201);
    assert.equal(data.category, '随机新分类');

    const listing = await json('/api/articles');
    assert.ok(listing.data.categories.includes('随机新分类'));
  });

  test('allows a new tag and returns it as a future candidate', async () => {
    const input = {
      slug: 'test-tag',
      title: 'Test Tag',
      description: 'Test.',
      category: '工程笔记',
      tags: ['不存在的新标签'],
    };
    const { data, response } = await json('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(data.tags, ['不存在的新标签']);

    const listing = await json('/api/articles');
    assert.ok(listing.data.tags.includes('不存在的新标签'));
  });

  test('rejects malformed or duplicate taxonomy values', async () => {
    const cases = [
      { slug: 'long-category', category: '分'.repeat(41), tags: ['测试'], field: 'category' },
      { slug: 'control-tag', category: '工程笔记', tags: ['坏\n标签'], field: 'tags' },
      { slug: 'duplicate-tag', category: '工程笔记', tags: ['测试', '测试'], field: 'tags' },
    ];

    for (const item of cases) {
      const { data, response } = await json('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: item.slug,
          title: 'Invalid Taxonomy',
          description: 'Test.',
          category: item.category,
          tags: item.tags,
        }),
      });
      assert.equal(response.status, 422);
      assert.ok(data.errors.some(({ field }) => field === item.field));
    }
  });

  test('allows valid category and tags from known sets', async () => {
    const input = {
      slug: 'valid-tax',
      title: 'Valid Taxonomy',
      description: 'Test.',
      category: '工程笔记',
      tags: ['测试'],
    };
    const { data, response } = await json('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 201);
    assert.equal(data.category, '工程笔记');
    assert.deepEqual(data.tags, ['测试']);
  });
});

describe('production isolation scan', () => {
  test('finds admin routes and raw Markdown but ignores normal static pages', () => {
    const dist = join(root, 'fixture-dist');
    mkdirSync(join(dist, 'blog'), { recursive: true });
    writeFileSync(join(dist, 'blog', 'index.html'), '<p>Public blog</p>');
    assert.deepEqual(findStudioLeaks(dist), []);

    mkdirSync(join(dist, 'studio'), { recursive: true });
    writeFileSync(join(dist, 'studio', 'index.html'), '<p>Studio</p>');
    writeFileSync(join(dist, 'source.md'), '# leaked');
    assert.deepEqual(new Set(findStudioLeaks(dist)), new Set(['source.md', 'studio']));
  });
});
