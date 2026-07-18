import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';

import {
  atomicSave,
  listBlogFiles,
  nextOrder,
  parseFrontmatter,
  serializeFrontmatter,
  validateBlogFrontmatter,
  validateSlug,
} from '../../scripts/lib/blog-frontmatter.mjs';

const temporaryRoot = join(tmpdir(), `galilieo-frontmatter-${randomUUID()}`);
mkdirSync(temporaryRoot, { recursive: true });
after(() => rmSync(temporaryRoot, { recursive: true, force: true }));

const draft = `---
title: 'It''s 一篇草稿'
description: '用于测试往返。'
category: '工程笔记'
tags:
  - 'Astro'
  - '测试'
draft: true
featured: false
order: 0
homepageState: '草稿'
---

第一段。

## 标题
`;

const published = {
  title: '公开文章',
  description: '公开摘要。',
  publishedAt: '2026-07-15',
  category: '前端与移动端',
  tags: ['Astro'],
  draft: false,
  featured: true,
  readingTime: 5,
  order: 8,
  homepageState: '已发布',
  body: '正文。\n',
};

describe('frontmatter parsing and serialization', () => {
  test('parses quoted strings, arrays, booleans, zero and body', () => {
    const data = parseFrontmatter(draft);
    assert.equal(data.title, "It's 一篇草稿");
    assert.deepEqual(data.tags, ['Astro', '测试']);
    assert.equal(data.draft, true);
    assert.equal(data.featured, false);
    assert.equal(data.order, 0);
    assert.equal(data.body, '第一段。\n\n## 标题\n');
  });

  test('is stable across repeated parse/serialize cycles', () => {
    const once = serializeFrontmatter(parseFrontmatter(draft));
    const twice = serializeFrontmatter(parseFrontmatter(once));
    assert.equal(twice, once);
    assert.equal(parseFrontmatter(twice).body, '第一段。\n\n## 标题\n');
  });

  test('preserves supported optional fields in canonical order', () => {
    const output = serializeFrontmatter({
      ...published,
      updatedAt: '2026-07',
      cover: '../../assets/images/blog/test/cover.webp',
    });
    const reparsed = parseFrontmatter(output);
    assert.equal(reparsed.cover, '../../assets/images/blog/test/cover.webp');
    assert.ok(output.indexOf('publishedAt') < output.indexOf('updatedAt'));
  });

  test('rejects a genuinely missing closing delimiter', () => {
    assert.throws(() => parseFrontmatter("---\ntitle: '未闭合'\n"), /closing/);
  });

  test('rejects unsupported YAML syntax instead of silently deleting it', () => {
    assert.throws(
      () => parseFrontmatter("---\ntitle: 'A'\n  invalid\n---\n"),
      /unsupported syntax/,
    );
  });

  test('refuses to serialize unknown fields', () => {
    assert.throws(
      () => serializeFrontmatter({ ...published, futureField: 'value' }),
      /unsupported fields/,
    );
  });
});

describe('content validation', () => {
  test('accepts a valid draft and valid public article', () => {
    assert.deepEqual(validateBlogFrontmatter(parseFrontmatter(draft)), []);
    assert.deepEqual(validateBlogFrontmatter(published), []);
  });

  test('requires all schema fields and at least one tag', () => {
    const errors = validateBlogFrontmatter({ ...published, title: '', tags: [] });
    assert.deepEqual(new Set(errors.map(({ field }) => field)), new Set(['title', 'tags']));
  });

  test('requires publishedAt and published homepage state for public articles', () => {
    const errors = validateBlogFrontmatter({
      ...published,
      publishedAt: undefined,
      homepageState: '草稿',
    });
    assert.ok(errors.some(({ field }) => field === 'publishedAt'));
    assert.ok(errors.some(({ field }) => field === 'homepageState'));
  });

  test('matches the project date formats', () => {
    for (const value of ['2026', '2026-07', '2026-07-15']) {
      assert.deepEqual(validateBlogFrontmatter({ ...published, publishedAt: value }), []);
    }
    assert.ok(validateBlogFrontmatter({ ...published, publishedAt: '2026/07/15' }).length > 0);
  });

  test('requires nonnegative integer order and positive readingTime', () => {
    const errors = validateBlogFrontmatter({ ...published, order: -1, readingTime: 0 });
    assert.ok(errors.some(({ field }) => field === 'order'));
    assert.ok(errors.some(({ field }) => field === 'readingTime'));
  });
});

describe('slug and order helpers', () => {
  test('accepts only flat lowercase alphanumeric slugs with single hyphens', () => {
    assert.equal(validateSlug('astro-content-7'), null);
    for (const slug of ['', 'Uppercase', '中文', '../escape', 'a--b', '-a', 'a-', 'a.md']) {
      assert.ok(validateSlug(slug));
    }
  });

  test('returns max order plus one', () => {
    assert.equal(nextOrder([]), 0);
    assert.equal(nextOrder([2, 8, 3]), 9);
  });
});

describe('file operations', () => {
  test('atomically creates and replaces text without leftovers', async () => {
    const path = join(temporaryRoot, 'article.md');
    await atomicSave(path, 'first');
    await atomicSave(path, 'second');
    assert.equal(readFileSync(path, 'utf8'), 'second');
    assert.deepEqual(
      readdirSync(temporaryRoot).filter((name) => name.startsWith('.blog-studio-')),
      [],
    );
  });

  test('writes binary cover data', async () => {
    const path = join(temporaryRoot, 'cover.webp');
    const data = Buffer.from([0, 1, 2, 255]);
    await atomicSave(path, data);
    assert.deepEqual(readFileSync(path), data);
  });

  test('lists Markdown and marks nested or MDX content as non-flat', () => {
    const blog = join(temporaryRoot, 'blog');
    const nested = join(blog, 'nested');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(blog, 'flat.md'), draft);
    writeFileSync(join(nested, 'component.mdx'), draft);
    const files = listBlogFiles(blog);
    assert.equal(files.length, 2);
    assert.equal(files.find(({ slug }) => slug === 'flat').isNested, false);
    assert.equal(files.find(({ slug }) => slug === 'nested/component').isMdx, true);
  });

  test('does not create a target when its parent path is a file', async () => {
    const blocker = join(temporaryRoot, 'blocker');
    writeFileSync(blocker, 'not a directory');
    await assert.rejects(() => atomicSave(join(blocker, 'article.md'), 'bad'));
    assert.equal(existsSync(join(blocker, 'article.md')), false);
  });
});
