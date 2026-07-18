import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export const BLOG_FRONTMATTER_FIELDS = [
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
];

const FIELD_SET = new Set(BLOG_FRONTMATTER_FIELDS);
const NUMERIC_FIELDS = new Set(['readingTime', 'order']);
const DATE_PATTERN = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseQuoted(value) {
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`frontmatter: invalid quoted value ${value}`);
    }
  }

  return value;
}

function parseScalar(key, value) {
  const parsed = parseQuoted(value.trim());
  if (parsed === 'true') return true;
  if (parsed === 'false') return false;
  if (NUMERIC_FIELDS.has(key) && /^-?\d+$/.test(parsed)) return Number.parseInt(parsed, 10);
  return parsed;
}

export function parseFrontmatter(raw) {
  if (typeof raw !== 'string') throw new TypeError('frontmatter: content must be a string');

  const normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  if (lines[0] !== '---') throw new Error('frontmatter: missing opening --- delimiter');

  const closingLine = lines.indexOf('---', 1);
  if (closingLine < 0) throw new Error('frontmatter: missing closing --- delimiter');

  const data = {};
  const source = lines.slice(1, closingLine);

  for (let index = 0; index < source.length; index += 1) {
    const line = source[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const match = line.match(/^([A-Za-z][A-Za-z0-9_]*):(?:\s*(.*))?$/);
    if (!match) throw new Error(`frontmatter: unsupported syntax on line ${index + 2}`);

    const [, key, rawValue = ''] = match;
    if (rawValue !== '') {
      data[key] = parseScalar(key, rawValue);
      continue;
    }

    const values = [];
    while (index + 1 < source.length) {
      const item = source[index + 1].match(/^\s{2}-\s+(.+)$/);
      if (!item) break;
      values.push(parseQuoted(item[1].trim()));
      index += 1;
    }
    data[key] = values;
  }

  const bodyLines = lines.slice(closingLine + 1);
  if (bodyLines[0] === '') bodyLines.shift();
  data.body = bodyLines.join('\n');
  return data;
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function serializeFrontmatter(data) {
  const unknown = Object.keys(data).filter((key) => key !== 'body' && !FIELD_SET.has(key));
  if (unknown.length > 0) {
    throw new Error(`frontmatter: unsupported fields: ${unknown.join(', ')}`);
  }

  const lines = ['---'];
  for (const key of BLOG_FRONTMATTER_FIELDS) {
    const value = data[key];
    if (value === undefined || value === null || value === '') continue;

    if (key === 'tags') {
      lines.push('tags:');
      for (const tag of Array.isArray(value) ? value : []) lines.push(`  - ${quote(tag)}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${quote(value)}`);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    }
  }

  const body = String(data.body ?? '').replace(/^\n/, '');
  const document = `${lines.join('\n')}\n---\n\n${body}`;
  return document.endsWith('\n') ? document : `${document}\n`;
}

export function validateBlogFrontmatter(data) {
  const errors = [];
  const requiredText = ['title', 'description', 'category', 'homepageState'];

  for (const field of requiredText) {
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      errors.push({ field, message: `${field} 是必填字段` });
    }
  }

  const unknown = Object.keys(data).filter((key) => key !== 'body' && !FIELD_SET.has(key));
  if (unknown.length > 0) {
    errors.push({ field: 'frontmatter', message: `Studio 不支持字段：${unknown.join(', ')}` });
  }

  if (!Array.isArray(data.tags) || data.tags.length === 0) {
    errors.push({ field: 'tags', message: 'tags 必须包含至少一个标签' });
  } else if (data.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    errors.push({ field: 'tags', message: 'tags 中不能有空值' });
  }

  if (typeof data.draft !== 'boolean') {
    errors.push({ field: 'draft', message: 'draft 必须是布尔值' });
  }
  if (data.featured !== undefined && typeof data.featured !== 'boolean') {
    errors.push({ field: 'featured', message: 'featured 必须是布尔值' });
  }
  if (!Number.isInteger(data.order) || data.order < 0) {
    errors.push({ field: 'order', message: 'order 必须是非负整数' });
  }
  if (
    data.readingTime !== undefined &&
    (!Number.isInteger(data.readingTime) || data.readingTime <= 0)
  ) {
    errors.push({ field: 'readingTime', message: 'readingTime 必须是正整数' });
  }

  for (const field of ['publishedAt', 'updatedAt']) {
    const value = data[field];
    if (value !== undefined && (typeof value !== 'string' || !DATE_PATTERN.test(value))) {
      errors.push({ field, message: `${field} 格式应为 YYYY、YYYY-MM 或 YYYY-MM-DD` });
    }
  }

  if (data.draft === false && !data.publishedAt) {
    errors.push({ field: 'publishedAt', message: '公开文章必须填写 publishedAt' });
  }
  if (data.draft === false && data.homepageState !== '已发布') {
    errors.push({ field: 'homepageState', message: '公开文章的 homepageState 必须为“已发布”' });
  }
  if (data.cover !== undefined && typeof data.cover !== 'string') {
    errors.push({ field: 'cover', message: 'cover 必须是图片路径' });
  }
  if (data.body !== undefined && typeof data.body !== 'string') {
    errors.push({ field: 'body', message: '正文必须是字符串' });
  }

  return errors;
}

export function validateSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return 'slug 只能包含小写字母、数字和单个连字符，且不能以连字符开头或结尾';
  }
  return null;
}

export function nextOrder(orders) {
  return Array.isArray(orders) && orders.length > 0 ? Math.max(...orders) + 1 : 0;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function atomicSave(filePath, content) {
  const directory = dirname(filePath);
  const name = basename(filePath);
  const id = randomUUID();
  const temporary = join(directory, `.blog-studio-${name}-${id}.tmp`);
  const backup = join(directory, `.blog-studio-${name}-${id}.bak`);

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, content);

  try {
    await rename(temporary, filePath);
    return;
  } catch (replaceError) {
    if (!(await pathExists(filePath))) throw replaceError;

    try {
      await rename(filePath, backup);
      await rename(temporary, filePath);
      await rm(backup, { force: true });
    } catch (error) {
      if (!(await pathExists(filePath)) && (await pathExists(backup))) {
        await rename(backup, filePath).catch(() => {});
      }
      throw error;
    }
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
    await rm(backup, { force: true }).catch(() => {});
  }
}

export function listBlogFiles(blogDirectory) {
  const files = [];

  function visit(directory, prefix = '') {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (/\.(?:md|mdx)$/.test(entry.name)) {
        const name = entry.name.replace(/\.(?:md|mdx)$/, '');
        files.push({
          slug: prefix ? `${prefix}/${name}` : name,
          path: fullPath,
          isMdx: entry.name.endsWith('.mdx'),
          isNested: Boolean(prefix),
        });
      }
    }
  }

  visit(blogDirectory);
  return files;
}
