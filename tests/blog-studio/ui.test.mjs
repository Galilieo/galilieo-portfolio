import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const root = process.cwd();
const html = readFileSync(join(root, 'tools', 'blog-studio', 'index.html'), 'utf8');
const css = readFileSync(join(root, 'tools', 'blog-studio', 'studio.css'), 'utf8');
const script = readFileSync(join(root, 'tools', 'blog-studio', 'studio.js'), 'utf8');

describe('Studio writing-first UI contract', () => {
  test('reuses the portfolio avatar in the Studio brand', () => {
    assert.match(html, /<img[^>]+class="brand-avatar"[^>]+src="\/avatar\.webp"/);
  });

  test('offers focus and split writing modes without a forced publishing wizard', () => {
    assert.match(html, /data-writing-mode="focus"/);
    assert.match(html, /data-writing-mode="split"/);
    assert.doesNotMatch(html, /内容\s*→\s*预览\s*→\s*检查\s*→\s*发布/);
    assert.match(script, /galilieo-studio-writing-mode/);
  });

  test('keeps actual-site preview inline with desktop and mobile canvases', () => {
    assert.match(html, /id="preview-panel"/);
    assert.match(html, /id="preview-frame"/);
    assert.match(html, /data-preview-device="desktop"/);
    assert.match(html, /data-preview-device="mobile"/);
    assert.match(css, /\.preview-shell\.is-mobile/);
  });

  test('moves content settings and publish checks into separate drawers', () => {
    assert.match(html, /id="settings-drawer"/);
    assert.match(html, /id="publish-drawer"/);
    assert.match(html, /id="btn-settings"/);
    assert.match(html, /id="btn-publish-check"/);
    assert.match(html, /id="publish-check-status"/);
    assert.match(script, /btnConfirmPublish\.disabled/);
  });

  test('offers one-click suggestions for categories and tags', () => {
    assert.match(html, /id="category-suggestions"/);
    assert.match(html, /id="tag-suggestions"/);
    assert.match(script, /renderTaxonomySuggestions/);
  });

  test('escapes quotes before inserting local content into HTML attributes', () => {
    assert.match(script, /'"': '&quot;'/);
    assert.match(script, /"'": '&#39;'/);
  });

  test('does not expose derived implementation fields in the daily authoring form', () => {
    assert.doesNotMatch(html, /id="meta-order"/);
    assert.doesNotMatch(html, /id="meta-homepageState"/);
    assert.doesNotMatch(html, /id="meta-readingTime"/);
    assert.match(html, /id="reading-time-display"/);
  });

  test('provides local recovery without replacing explicit Markdown saves', () => {
    assert.match(script, /galilieo-studio-recovery:/);
    assert.match(script, /localStorage\.setItem/);
    assert.match(html, /id="btn-save"/);
  });

  test('prevents the hidden cover input from creating horizontal overflow', () => {
    assert.match(html, /id="meta-cover-file"[^>]*class="visually-hidden-file"/);
    assert.match(css, /\.visually-hidden-file\s*\{[^}]*width:\s*1px/s);
    assert.doesNotMatch(css, /\.meta-field input,\s*\n\.meta-field textarea/);
  });
});
