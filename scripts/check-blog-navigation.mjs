import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const distRoot = resolve(process.cwd(), 'dist');
const readPage = (...segments) => readFileSync(resolve(distRoot, ...segments), 'utf8');
const blogPage = readPage('blog', 'index.html');
const notesPage = readPage('notes', 'index.html');
const failures = [];

function tagsWithMarker(html, tagName, marker) {
  const expression = new RegExp(`<${tagName}\\b[^>]*${marker}[^>]*>`, 'g');
  return html.match(expression) ?? [];
}

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '';
}

function categorySignature(html) {
  return tagsWithMarker(html, 'section', 'data-blog-category-section').map((section) => ({
    id: attribute(section, 'id'),
    count: attribute(section, 'data-category-count'),
  }));
}

for (const [name, html] of [
  ['blog', blogPage],
  ['notes', notesPage],
]) {
  if (!html.includes('data-blog-directory')) failures.push(`${name} must render BlogDirectory.`);
  if (html.includes('data-article-filter') || html.includes('Tag Index')) {
    failures.push(`${name} must not render the legacy Tag filter.`);
  }
  if (html.includes('blog-category-disclosure')) {
    failures.push(`${name} must not duplicate the Category directory on small screens.`);
  }
  if (!html.includes('href="https://galilieo.heart-island.cn/blog/"')) {
    failures.push(`${name} must preserve the /blog/ canonical URL.`);
  }
}

const blogCategories = categorySignature(blogPage);
const notesCategories = categorySignature(notesPage);
if (blogCategories.length === 0) failures.push('BlogDirectory must render Category sections.');
if (JSON.stringify(blogCategories) !== JSON.stringify(notesCategories)) {
  failures.push('/blog/ and /notes/ must render identical Category order and counts.');
}

const articleDirectories = readdirSync(resolve(distRoot, 'notes'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const slug of articleDirectories) {
  const html = readPage('notes', slug, 'index.html');
  if (!html.includes('data-reading-navigation')) {
    failures.push(`/notes/${slug}/ must render reading navigation.`);
    continue;
  }

  const headingIds = new Set(
    [...html.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"[^>]*>/g)].map((match) => match[1]),
  );
  const tocTargets = new Set(
    tagsWithMarker(html, 'a', 'data-reading-toc-link')
      .map((link) => attribute(link, 'href'))
      .filter((href) => href.startsWith('#'))
      .map((href) => href.slice(1)),
  );

  if (html.includes('data-reading-tab') || html.includes('data-reading-panel')) {
    failures.push(`/notes/${slug}/ must not render the removed mobile Category / article tabs.`);
  }
  if (headingIds.size > 0 && !html.includes('article-reading-navigation--mobile')) {
    failures.push(`/notes/${slug}/ must render a native mobile article TOC.`);
  }

  for (const id of headingIds) {
    if (!tocTargets.has(id)) failures.push(`/notes/${slug}/ is missing TOC target #${id}.`);
  }
  for (const id of tocTargets) {
    if (!headingIds.has(id)) failures.push(`/notes/${slug}/ links to missing heading #${id}.`);
  }

  const categoryLink = tagsWithMarker(html, 'a', 'data-current-category-link')[0] ?? '';
  if (!attribute(categoryLink, 'href').startsWith('/notes/#category-')) {
    failures.push(`/notes/${slug}/ must link back to its Category section.`);
  }
}

// Tag 统一结果区契约
for (const [name, html] of [
  ['blog', blogPage],
  ['notes', notesPage],
]) {
  if (!html.includes('data-blog-tag-results')) {
    failures.push(`${name} must render a Tag results section (data-blog-tag-results).`);
  }
  if (!html.match(/<section\b[^>]*\bdata-blog-tag-results\b[^>]*\bhidden\b[^>]*>/)) {
    failures.push(`${name} Tag results section must be hidden by default.`);
  }
  if (!html.includes('data-blog-tag-results-heading')) {
    failures.push(`${name} Tag results section must include a heading with data-blog-tag-results-heading.`);
  }
  const tagHeading = html.match(/<header\b[^>]*\bdata-blog-tag-results-heading\b[^>]*>[\s\S]*?<\/header>/)?.[0] ?? '';
  if (!tagHeading.includes('TAG INDEX') || !tagHeading.includes('全部文章')) {
    failures.push(`${name} Tag results heading must use the default Tag index semantics.`);
  }
  const tagHeadingText = tagHeading.replace(/<[^>]+>/g, ' ');
  if (/\bCategory\b/i.test(tagHeadingText)) {
    failures.push(`${name} Tag results heading must not retain Category semantics.`);
  }
  if (!html.includes('data-blog-tag-results-count')) {
    failures.push(`${name} Tag results section must include a count element with data-blog-tag-results-count.`);
  }
  if (!html.includes('data-blog-tag-results-grid')) {
    failures.push(`${name} Tag results section must include an article grid with data-blog-tag-results-grid.`);
  }
  // Category sections must NOT be hidden for no-JS fallback
  const catSectionCount = (html.match(/<section\b[^>]*\bdata-blog-category-section\b[^>]*>/g) ?? []).length;
  const hiddenCatSections = (html.match(/<section\b[^>]*\bdata-blog-category-section\b[^>]*\bhidden\b[^>]*>/g) ?? []).length;
  if (hiddenCatSections > 0) {
    failures.push(`${name} Category sections must not be hidden by default (no-JS fallback). ${hiddenCatSections}/${catSectionCount} hidden.`);
  }
  // Verify Tag results grid contains article cards with data-blog-entry
  const tagGridMatch = html.match(/<div\b[^>]*\bdata-blog-tag-results-grid\b[^>]*>[\s\S]*?<\/div>/);
  if (!tagGridMatch || !tagGridMatch[0].includes('data-blog-entry')) {
    failures.push(`${name} Tag results grid must contain article cards with data-blog-entry.`);
  }
}

// /blog/ and /notes/ must render identical Tag results structure (compare signatures)
const blogTagSig = (blogPage.match(/<section\b[^>]*\bdata-blog-tag-results\b[^>]*>/g) ?? []).length;
const notesTagSig = (notesPage.match(/<section\b[^>]*\bdata-blog-tag-results\b[^>]*>/g) ?? []).length;
if (blogTagSig !== notesTagSig || blogTagSig === 0) {
  failures.push('/blog/ and /notes/ must render identical Tag results sections.');
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log('Blog directory and reading navigation checks passed.');
