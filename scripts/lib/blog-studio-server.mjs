import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import {
  atomicSave,
  listBlogFiles,
  nextOrder,
  parseFrontmatter,
  serializeFrontmatter,
  validateBlogFrontmatter,
  validateSlug,
} from './blog-frontmatter.mjs';

export const DEFAULT_PORT = 4310;
export const ASTRO_DEV_PORT = 4321;
export const MAX_BODY_SIZE = 1024 * 1024;
export const MAX_COVER_SIZE = 10 * 1024 * 1024;

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
const STATIC_FILES = new Set(['avatar.webp', 'index.html', 'studio.css', 'studio.js']);
const COVER_KEYS = new Set(['alley', 'bloom', 'orbit', 'window', 'balcony']);
const COVER_POSITIONS = {
  alley: 'center 42%',
  balcony: 'center 42%',
  bloom: 'center 45%',
  orbit: 'center',
  window: 'center 40%',
};
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.webp': 'image/webp',
};

function send(res, status, body, headers = {}) {
  if (res.headersSent || res.writableEnded) return;
  const content = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': content.length,
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(content);
}

function sendJson(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
}

function fail(res, status, message, extra = {}) {
  sendJson(res, status, { error: message, ...extra });
}

function readBody(req, limit) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    let oversized = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        oversized = true;
        chunks.length = 0;
      } else if (!oversized) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (oversized) rejectBody(Object.assign(new Error('Payload too large'), { status: 413 }));
      else resolveBody(Buffer.concat(chunks));
    });
    req.on('error', rejectBody);
  });
}

async function readJson(req) {
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
    throw Object.assign(new Error('Expected application/json'), { status: 415 });
  }
  const body = await readBody(req, MAX_BODY_SIZE);
  if (body.length === 0) throw Object.assign(new Error('Request body is empty'), { status: 400 });
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

function loopbackHost(hostHeader) {
  try {
    return LOOPBACK_HOSTS.has(new URL(`http://${hostHeader}`).hostname);
  } catch {
    return false;
  }
}

function normalizePreviewOrigin(value) {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'http:' ||
      !LOOPBACK_HOSTS.has(parsed.hostname) ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error();
    }
    return parsed.origin;
  } catch {
    throw new Error('Blog Studio preview origin must be a loopback HTTP origin');
  }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || !loopbackHost(host)) return false;
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname) && parsed.host === host
    );
  } catch {
    return false;
  }
}

function sessionCookie(req) {
  return (req.headers.cookie ?? '').match(/(?:^|;\s*)studio_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}

function multipartFile(buffer, contentType) {
  const boundary = contentType
    .match(/boundary=(?:"([^"]+)"|([^;]+))/)
    ?.slice(1)
    .find(Boolean)
    ?.trim();
  if (!boundary) throw Object.assign(new Error('Expected multipart/form-data'), { status: 400 });

  const marker = Buffer.from(`--${boundary}`);
  const headerBreak = Buffer.from('\r\n\r\n');
  let cursor = 0;

  while ((cursor = buffer.indexOf(marker, cursor)) >= 0) {
    const headersStart = cursor + marker.length + 2;
    const headersEnd = buffer.indexOf(headerBreak, headersStart);
    if (headersEnd < 0) break;
    const headers = buffer.subarray(headersStart, headersEnd).toString('utf8');
    if (/filename="[^"]*"/i.test(headers)) {
      const dataStart = headersEnd + headerBreak.length;
      const nextBoundary = buffer.indexOf(marker, dataStart);
      if (nextBoundary < 0) break;
      return buffer.subarray(dataStart, Math.max(dataStart, nextBoundary - 2));
    }
    cursor = headersEnd + headerBreak.length;
  }

  throw Object.assign(new Error('No image file found'), { status: 400 });
}

function summarizeArticle(file) {
  const data = parseFrontmatter(readFileSync(file.path, 'utf8'));
  return {
    slug: file.slug,
    title: data.title ?? '',
    description: data.description ?? '',
    category: data.category ?? '',
    tags: data.tags ?? [],
    draft: data.draft !== false,
    featured: data.featured ?? false,
    order: data.order ?? 0,
    homepageState: data.homepageState ?? '',
    publishedAt: data.publishedAt ?? null,
    updatedAt: data.updatedAt ?? null,
    readingTime: data.readingTime ?? null,
    cover: data.cover ?? null,
    isMdx: file.isMdx,
    editable: !file.isMdx && !file.isNested,
    wordCount: String(data.body ?? '').length,
    lineCount: String(data.body ?? '').split('\n').length,
  };
}

function articlePath(blogDirectory, slug) {
  const md = join(blogDirectory, `${slug}.md`);
  const mdx = join(blogDirectory, `${slug}.mdx`);
  if (existsSync(md)) return md;
  if (existsSync(mdx)) return mdx;
  return null;
}

function scanCoverGallery(repoRoot) {
  const coversDir = join(repoRoot, 'src', 'assets', 'images', 'covers');
  const covers = [];
  if (!existsSync(coversDir)) return covers;
  for (const key of COVER_KEYS) {
    const filePath = join(coversDir, `scene-${key}.webp`);
    if (existsSync(filePath)) {
      covers.push({
        key,
        thumbnail: `/api/covers/thumbnails/${key}`,
        position: COVER_POSITIONS[key] || 'center',
      });
    }
  }
  return covers;
}

function validateCover(value) {
  if (value === 'auto' || value === undefined || value === null || value === '')
    return { valid: true, sanitized: undefined };
  if (typeof value !== 'string') return { valid: false, message: 'cover 必须是字符串' };
  // Reject paths: must be a simple key without slashes, dots, or colons
  if (!/^[a-z][a-z0-9]*$/.test(value)) {
    return { valid: false, message: '封面只接受已知图库键或 auto，不接受文件路径' };
  }
  if (!COVER_KEYS.has(value)) {
    return {
      valid: false,
      message: `未知封面键：${value}。可用封面：${[...COVER_KEYS].join(', ')}`,
    };
  }
  return {
    valid: true,
    sanitized: `../../assets/images/covers/scene-${value}.webp`,
  };
}

const TAXONOMY_MAX_LENGTH = 40;

function hasTaxonomyControlCharacters(value) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

function validateTaxonomy(data) {
  const errors = [];
  const category = data.category;
  if (
    typeof category === 'string' &&
    (category.length > TAXONOMY_MAX_LENGTH || hasTaxonomyControlCharacters(category))
  ) {
    errors.push({
      field: 'category',
      message: `分类不能超过 ${TAXONOMY_MAX_LENGTH} 个字符，也不能包含控制字符`,
    });
  }

  if (Array.isArray(data.tags)) {
    if (
      data.tags.some(
        (tag) =>
          typeof tag === 'string' &&
          (tag.length > TAXONOMY_MAX_LENGTH || hasTaxonomyControlCharacters(tag)),
      )
    ) {
      errors.push({
        field: 'tags',
        message: `标签不能超过 ${TAXONOMY_MAX_LENGTH} 个字符，也不能包含控制字符`,
      });
    }
    if (new Set(data.tags).size !== data.tags.length) {
      errors.push({ field: 'tags', message: '标签不能重复' });
    }
  }
  return errors;
}

function orderConflict(blogDirectory, order, currentSlug) {
  for (const file of listBlogFiles(blogDirectory)) {
    if (file.slug === currentSlug) continue;
    try {
      if (parseFrontmatter(readFileSync(file.path, 'utf8')).order === order) return file.slug;
    } catch {
      // Astro check remains the final authority for malformed existing content.
    }
  }
  return null;
}

function validateForSave(data, blogDirectory, currentSlug) {
  const errors = validateBlogFrontmatter(data);
  const conflict = Number.isInteger(data.order)
    ? orderConflict(blogDirectory, data.order, currentSlug)
    : null;
  if (conflict)
    errors.push({ field: 'order', message: `order ${data.order} 已由 ${conflict} 使用` });
  errors.push(...validateTaxonomy(data));
  return errors;
}

function publicArticle(data) {
  const fields = [
    'title',
    'description',
    'publishedAt',
    'updatedAt',
    'category',
    'tags',
    'cover',
    'draft',
    'featured',
    'readingTime',
    'order',
    'homepageState',
    'body',
  ];
  return Object.fromEntries(
    fields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]),
  );
}

export function createBlogStudioServer({
  host = '127.0.0.1',
  logger = console,
  port = DEFAULT_PORT,
  previewOrigin: requestedPreviewOrigin = `http://127.0.0.1:${ASTRO_DEV_PORT}`,
  repoRoot = DEFAULT_ROOT,
  verifyTimeout = 5 * 60 * 1000,
} = {}) {
  if (host !== '127.0.0.1') throw new Error('Blog Studio must bind to 127.0.0.1');
  const previewOrigin = normalizePreviewOrigin(requestedPreviewOrigin);

  const blogDirectory = join(repoRoot, 'src', 'content', 'blog');
  const studioDirectory = join(repoRoot, 'tools', 'blog-studio');
  const sessions = new Map();
  let verification = null;

  function authorized(req) {
    if (!sameOrigin(req)) return false;
    const token = sessionCookie(req);
    const createdAt = token ? sessions.get(token) : undefined;
    if (!createdAt || Date.now() - createdAt > SESSION_MAX_AGE_SECONDS * 1000) {
      if (token) sessions.delete(token);
      return false;
    }
    return true;
  }

  async function listArticles(res) {
    const articles = listBlogFiles(blogDirectory)
      .map((file) => {
        try {
          return summarizeArticle(file);
        } catch (error) {
          return {
            slug: file.slug,
            title: file.slug,
            draft: true,
            editable: false,
            isMdx: file.isMdx,
            parseError: error.message,
          };
        }
      })
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

    const categories = [
      ...new Set(articles.map((article) => article.category).filter(Boolean)),
    ].sort();
    const tags = [...new Set(articles.flatMap((article) => article.tags ?? []))].sort();
    const covers = scanCoverGallery(repoRoot);
    sendJson(res, 200, {
      articles,
      categories,
      tags,
      covers,
      nextOrder: nextOrder(articles.map((article) => article.order).filter(Number.isInteger)),
      previewOrigin,
    });
  }

  async function getArticle(slug, res) {
    const invalid = validateSlug(slug);
    if (invalid) return fail(res, 400, invalid);
    const path = articlePath(blogDirectory, slug);
    if (!path) return fail(res, 404, `找不到文章：${slug}`);
    const data = parseFrontmatter(readFileSync(path, 'utf8'));
    sendJson(res, 200, {
      slug,
      ...data,
      isMdx: path.endsWith('.mdx'),
      editable: path.endsWith('.md'),
    });
  }

  async function createArticle(req, res) {
    const input = await readJson(req);
    const invalid = validateSlug(input.slug);
    if (invalid) return fail(res, 400, invalid);
    if (articlePath(blogDirectory, input.slug)) return fail(res, 409, `文章已存在：${input.slug}`);

    const orders = listBlogFiles(blogDirectory).flatMap((file) => {
      try {
        const order = parseFrontmatter(readFileSync(file.path, 'utf8')).order;
        return Number.isInteger(order) ? [order] : [];
      } catch {
        return [];
      }
    });

    // Validate cover
    const coverResult = validateCover(input.cover);
    if (!coverResult.valid) {
      return fail(res, 422, '封面校验失败', {
        errors: [{ field: 'cover', message: coverResult.message }],
      });
    }

    const data = {
      title: input.title,
      description: input.description,
      category: input.category,
      tags: input.tags,
      cover: coverResult.sanitized,
      draft: true,
      featured: false,
      order: nextOrder(orders),
      homepageState: '草稿',
      body: '',
    };
    const errors = validateForSave(data, blogDirectory, input.slug);
    if (errors.length) return fail(res, 422, '文章字段不完整', { errors });

    await atomicSave(join(blogDirectory, `${input.slug}.md`), serializeFrontmatter(data));
    sendJson(res, 201, { slug: input.slug, ...data, editable: true, isMdx: false });
  }

  async function updateArticle(slug, req, res) {
    const invalid = validateSlug(slug);
    if (invalid) return fail(res, 400, invalid);
    const path = articlePath(blogDirectory, slug);
    if (!path) return fail(res, 404, `找不到文章：${slug}`);
    if (path.endsWith('.mdx')) return fail(res, 403, 'Studio 只读显示 MDX，不会改写它');

    const input = await readJson(req);
    const existing = parseFrontmatter(readFileSync(path, 'utf8'));

    const changesCover = Object.hasOwn(input, 'cover');
    const coverResult = changesCover ? validateCover(input.cover) : null;
    if (coverResult && !coverResult.valid) {
      return fail(res, 422, '封面校验失败', {
        errors: [{ field: 'cover', message: coverResult.message }],
      });
    }

    const data = { ...existing, ...publicArticle(input) };
    if (coverResult?.sanitized) data.cover = coverResult.sanitized;
    else if (changesCover) delete data.cover;

    const errors = validateForSave(data, blogDirectory, slug);
    if (errors.length) return fail(res, 422, '文章校验失败', { errors });

    await atomicSave(path, serializeFrontmatter(data));
    sendJson(res, 200, { slug, ...data, editable: true, isMdx: false });
  }

  async function uploadCover(slug, req, res) {
    const invalid = validateSlug(slug);
    if (invalid) return fail(res, 400, invalid);
    const path = articlePath(blogDirectory, slug);
    if (!path) return fail(res, 404, `找不到文章：${slug}`);
    if (path.endsWith('.mdx')) return fail(res, 403, 'MDX 在 Studio 中为只读');

    const requestBody = await readBody(req, MAX_COVER_SIZE);
    const file = multipartFile(requestBody, req.headers['content-type'] ?? '');
    const metadata = await sharp(file, { failOn: 'error' }).metadata();
    if (!metadata.width || !metadata.height) return fail(res, 400, '无法读取图片尺寸');

    const output = await sharp(file, { failOn: 'error' })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const directory = join(repoRoot, 'src', 'assets', 'images', 'blog', slug);
    mkdirSync(directory, { recursive: true });
    await atomicSave(join(directory, 'cover.webp'), output);

    const data = parseFrontmatter(readFileSync(path, 'utf8'));
    data.cover = `../../assets/images/blog/${slug}/cover.webp`;
    await atomicSave(path, serializeFrontmatter(data));
    sendJson(res, 200, { cover: data.cover, width: metadata.width, height: metadata.height });
  }

  function runVerification(res) {
    if (verification) return fail(res, 409, '已有验证正在运行');
    const script = join(repoRoot, 'scripts', 'verify.mjs');
    const child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    verification = child;
    let stdout = '';
    let stderr = '';
    let settled = false;
    const append = (current, chunk, limit) => `${current}${chunk}`.slice(-limit);
    child.stdout.on('data', (chunk) => {
      stdout = append(stdout, chunk, 100_000);
    });
    child.stderr.on('data', (chunk) => {
      stderr = append(stderr, chunk, 50_000);
    });

    const finish = (status, payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      verification = null;
      sendJson(res, status, payload);
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(504, { error: '验证超过五分钟，已停止' });
    }, verifyTimeout);

    child.on('error', (error) => finish(500, { error: `无法启动验证：${error.message}` }));
    child.on('close', (code) =>
      finish(200, {
        success: code === 0,
        exitCode: code,
        stdout,
        stderr,
      }),
    );
  }

  function serveStatic(req, res, pathname) {
    const name = pathname === '/' ? 'index.html' : basename(pathname);
    if (!STATIC_FILES.has(name) || (pathname !== `/${name}` && pathname !== '/')) {
      return fail(res, 404, 'Not found');
    }
    const path =
      name === 'avatar.webp'
        ? join(repoRoot, 'src', 'assets', 'images', 'profile', 'galilieo-avatar.webp')
        : join(studioDirectory, name);
    if (!existsSync(path) || !statSync(path).isFile()) return fail(res, 404, 'Not found');
    const body = readFileSync(path);
    send(res, 200, req.method === 'HEAD' ? Buffer.alloc(0) : body, {
      'Content-Security-Policy': `default-src 'self'; base-uri 'none'; connect-src 'self'; frame-ancestors 'none'; frame-src ${previewOrigin}; img-src 'self' data: blob:; object-src 'none'; script-src 'self'; style-src 'self'`,
      'Content-Type': MIME_TYPES[extname(path)] ?? 'application/octet-stream',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
    });
  }

  async function route(req, res) {
    if (!loopbackHost(req.headers.host ?? '')) return fail(res, 403, 'Invalid Host');
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/api/session') {
      if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
      if (!sameOrigin(req)) return fail(res, 403, 'Same-origin request required');
      const token = randomBytes(32).toString('hex');
      sessions.set(token, Date.now());
      return sendJson(
        res,
        200,
        { ok: true },
        {
          'Set-Cookie': `studio_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
        },
      );
    }

    // Cover gallery (unauthenticated read)
    if (pathname === '/api/covers' && req.method === 'GET') {
      return sendJson(res, 200, { covers: scanCoverGallery(repoRoot) });
    }
    if (pathname.startsWith('/api/covers/thumbnails/') && req.method === 'GET') {
      const key = basename(pathname);
      if (!key || !COVER_KEYS.has(key)) return fail(res, 404, 'Not found');
      const filePath = join(repoRoot, 'src', 'assets', 'images', 'covers', `scene-${key}.webp`);
      if (!existsSync(filePath)) return fail(res, 404, 'Not found');
      const body = readFileSync(filePath);
      return send(res, 200, body, {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'image/webp',
      });
    }

    if (pathname === '/api/articles' && req.method === 'GET') return listArticles(res);
    const article = pathname.match(/^\/api\/articles\/([a-z0-9-]+)$/);
    if (article && req.method === 'GET') return getArticle(article[1], res);

    if (pathname.startsWith('/api/')) {
      if (!authorized(req)) return fail(res, 401, '请刷新 Studio 以建立本机会话');
      if (pathname === '/api/articles' && req.method === 'POST') return createArticle(req, res);
      if (article && req.method === 'PUT') return updateArticle(article[1], req, res);
      const cover = pathname.match(/^\/api\/articles\/([a-z0-9-]+)\/cover$/);
      if (cover && req.method === 'POST') return uploadCover(cover[1], req, res);
      if (pathname === '/api/verify' && req.method === 'POST') return runVerification(res);
      return fail(res, 405, 'Method not allowed');
    }

    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, pathname);
    return fail(res, 404, 'Not found');
  }

  const server = http.createServer((req, res) => {
    Promise.resolve(route(req, res)).catch((error) => {
      logger.error?.(`[Studio] ${error.stack ?? error.message}`);
      fail(res, error.status ?? 500, error.status ? error.message : 'Studio 内部错误');
    });
  });
  server.listen(port, host, () => logger.log?.(`[Studio] http://${host}:${server.address().port}`));
  server.on('close', () => verification?.kill('SIGTERM'));
  return server;
}

const executedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedDirectly)
  createBlogStudioServer({ port: Number(process.env.STUDIO_PORT) || DEFAULT_PORT });
