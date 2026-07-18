import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const root = process.cwd();
const html = readFileSync(join(root, 'tools', 'blog-studio', 'index.html'), 'utf8');
const css = readFileSync(join(root, 'tools', 'blog-studio', 'studio.css'), 'utf8');
const script = readFileSync(join(root, 'tools', 'blog-studio', 'studio.js'), 'utf8');
const interiorCss = readFileSync(join(root, 'src', 'styles', 'interior.css'), 'utf8');
const homeSectionsCss = readFileSync(join(root, 'src', 'styles', 'home', 'sections.css'), 'utf8');
const homeHeroCss = readFileSync(join(root, 'src', 'styles', 'home', 'hero.css'), 'utf8');
const homeResponsiveCss = readFileSync(
  join(root, 'src', 'styles', 'home', 'responsive.css'),
  'utf8',
);

describe('controlled taxonomy UI', () => {
  test('category stays inside the settings drawer and new-draft modal', () => {
    assert.match(html, /id="settings-category-options"/);
    assert.match(html, /id="new-category-options"/);
    assert.doesNotMatch(html, /id="category-select-trigger"/);
    assert.doesNotMatch(html, /id="new-category-select-trigger"/);
    assert.doesNotMatch(html, /id="meta-category"[^>]*type="text"/);
    assert.match(script, /selectedCategory/);
    assert.match(script, /newCategory/);
    assert.match(script, /renderCategoryOptions/);
    assert.match(
      script,
      /summaryCategoryButton\.addEventListener\('click', openCategorySettings\)/,
    );
    assert.doesNotMatch(script, /type === 'category'/);
  });

  test('category can be created in either local context and selected immediately', () => {
    assert.match(html, /id="settings-category-input"[^>]*maxlength="40"/);
    assert.match(html, /id="settings-add-category"/);
    assert.match(html, /id="new-category-input"[^>]*maxlength="40"/);
    assert.match(html, /id="new-add-category"/);
    assert.match(script, /function addCategory\(context\)/);
    assert.match(script, /if \(event\.key === 'Enter'\)/);
  });

  test('tags stay inside the settings drawer and new-draft modal as creatable comboboxes', () => {
    assert.match(html, /id="settings-tag-combobox"/);
    assert.match(
      html,
      /id="settings-tag-input"[^>]*role="combobox"[^>]*aria-controls="settings-tag-options"/,
    );
    assert.match(html, /id="settings-tag-selected"/);
    assert.match(html, /id="settings-tag-options"[^>]*role="listbox"/);
    assert.match(html, /id="new-tag-combobox"/);
    assert.match(
      html,
      /id="new-tag-input"[^>]*role="combobox"[^>]*aria-controls="new-tag-options"/,
    );
    assert.doesNotMatch(html, /id="tag-select-trigger"/);
    assert.doesNotMatch(html, /id="new-tag-select-trigger"/);
    assert.match(script, /selectedTags/);
    assert.match(script, /newTags/);
    assert.match(script, /selection\.size === 1/);
    assert.match(script, /summaryTagsButton\.addEventListener\('click', openTagSettings\)/);
    assert.doesNotMatch(script, /openSelectionPanel\('current', 'tags'\)/);
  });

  test('tag combobox exposes a first-class create row and selects it immediately', () => {
    assert.match(html, /placeholder="搜索或新增标签"/);
    assert.match(script, /function addTag\(context, value\)/);
    assert.match(script, /data-tag-create/);
    assert.match(script, /＋ 创建「\$\{escapeHtml\(query\)\}」/);
    assert.match(script, /aria-activedescendant/);
    assert.match(script, /event\.key === 'ArrowDown'/);
    assert.match(script, /event\.key === 'Escape'/);
    assert.match(script, /const menuWasOpen = !menu\.hidden/);
    assert.match(script, /if \(menuWasOpen\) \{[^}]*event\.stopPropagation\(\)/s);
    assert.match(
      script,
      /input\.addEventListener\('blur', \(event\) => \{[^}]*combobox\.contains\(event\.relatedTarget\)/s,
    );
    assert.doesNotMatch(script, /state\.tags\.push\(tag\)/);
  });

  test('keeps taxonomy creation controls compact inside their current panel', () => {
    assert.match(
      css,
      /\.taxonomy-create\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s,
    );
    assert.match(css, /\.tag-combobox\s*\{[^}]*position:\s*relative/s);
    assert.match(
      css,
      /\.tag-combobox__menu\s*\{[^}]*position:\s*absolute[^}]*top:\s*calc\(100% \+ 6px\)/s,
    );
    assert.match(
      css,
      /\.tag-combobox\.opens-up \.tag-combobox__menu\s*\{[^}]*bottom:\s*calc\(100% \+ 6px\)/s,
    );
    assert.match(script, /function positionTagMenu\(context\)/);
    assert.match(script, /availableBelow < naturalHeight/);
  });

  test('new draft modal keeps category inline and tags in an independent picker', () => {
    assert.match(html, /id="new-category-options"/);
    assert.match(html, /id="new-tag-combobox"/);
    assert.match(html, /id="new-tag-input"/);
    assert.match(
      script,
      /function openNewModal\(\)[\s\S]*?closeDrawers\(\{ restoreFocus: false \}\)/,
    );
    assert.doesNotMatch(html, /id="new-category"[^>]*type="text"/);
    assert.doesNotMatch(html, /id="new-tags"[^>]*type="text"/);
  });

  test('cover summary opens the same bottom panel with auto, gallery, and upload options', () => {
    assert.match(html, /id="cover-select-trigger"/);
    assert.match(script, /data-cover-mode="auto"/);
    assert.match(script, /selection-cover-gallery/);
    assert.match(script, /selection-btn-upload-cover/);
    assert.match(script, /coverMode/);
    assert.doesNotMatch(script, /renderSelectionOptions\('tags'\)/);
  });

  test('cover gallery renders thumbnails from covers data', () => {
    assert.match(script, /coverGallery/);
    assert.match(script, /thumbnail/);
    assert.match(script, /selection-cover-thumb/);
  });

  test('cover selection panel is a bottom sheet with a dimmed scrim', () => {
    assert.match(html, /class="selection-panel"[^>]*id="selection-panel"/);
    assert.match(html, /class="selection-panel__sheet"/);
    assert.match(css, /\.selection-panel\s*\{/);
    assert.match(css, /\.selection-panel__sheet\s*\{/);
    assert.match(css, /align-items:\s*flex-end/);
    assert.match(html, /id="selection-done"/);
    assert.doesNotMatch(html, /id="selection-cancel"/);
    assert.match(script, /selectionReturnFocus/);
    assert.match(script, /returnFocus\?\.focus\(\)/);
    assert.match(script, /aria-pressed/);
    assert.match(script, /event\.key === 'Tab'/);
    assert.match(
      script,
      /function openCoverPanel\(\)[\s\S]*?\.drawer\.open[\s\S]*?setAttribute\('inert', ''\)/,
    );
    assert.match(
      script,
      /function closeSelectionPanel\(\)[\s\S]*?\.drawer\.open[\s\S]*?removeAttribute\('inert'\)/,
    );
  });
});

describe('responsive card and typography contract', () => {
  test('keeps the full-detail tablet cards single-column until the compact breakpoint', () => {
    assert.match(
      interiorCss,
      /@media \(max-width: 760px\)[\s\S]*?\.project-grid,\s*\.article-grid\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
  });

  test('keeps blog cards in two columns with compact image-index content below 580px', () => {
    const mobile = interiorCss.slice(interiorCss.indexOf('@media (max-width: 580px)'));
    assert.match(
      mobile,
      /\.article-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
    );
    assert.match(
      mobile,
      /\.article-matrix-card__visual\s*\{(?=[^}]*aspect-ratio:\s*16\s*\/\s*9)(?=[^}]*min-height:\s*0)/s,
    );
    assert.match(
      mobile,
      /\.article-matrix-card__title\s*\{[^}]*font-size:\s*17px[^}]*-webkit-line-clamp:\s*3/s,
    );
    assert.match(mobile, /\.article-matrix-card__topline\s*\{[^}]*font-size:\s*10px/s);
    assert.match(mobile, /\.article-matrix-card__description[^}]*display:\s*none/s);
    assert.match(mobile, /\.article-matrix-card \.inline-tags[^}]*display:\s*none/s);
    assert.match(mobile, /\.article-matrix-card__footer[^}]*display:\s*none/s);
    assert.match(mobile, /\.article-grid\s*\{[^}]*gap:\s*10px/s);
    assert.match(mobile, /\.article-matrix-card\s*\{[^}]*border-radius:\s*18px/s);
    assert.match(mobile, /\.article-matrix-card__body\s*\{[^}]*padding:\s*12px/s);
  });

  test('gives complete blog and project cards a useful image share without oversized copy', () => {
    assert.match(interiorCss, /\.article-matrix-card__visual\s*\{[^}]*min-height:\s*160px/s);
    assert.match(
      interiorCss,
      /\.article-matrix-card__title\s*\{[^}]*font-size:\s*clamp\(24px,\s*1\.8vw,\s*28px\)/s,
    );
    assert.match(
      interiorCss,
      /\.project-matrix-card__visual\s*\{(?=[^}]*aspect-ratio:\s*16\s*\/\s*7)(?=[^}]*min-height:\s*0)/s,
    );

    const mobile = interiorCss.slice(interiorCss.indexOf('@media (max-width: 580px)'));
    assert.match(
      mobile,
      /\.project-matrix-card__visual\s*\{(?=[^}]*aspect-ratio:\s*5\s*\/\s*2)(?=[^}]*min-height:\s*0)/s,
    );
    assert.match(mobile, /\.project-matrix-card h2\s*\{[^}]*font-size:\s*22px/s);
    assert.match(mobile, /\.project-matrix-card__description\s*\{[^}]*font-size:\s*13px/s);
    assert.match(mobile, /\.project-matrix-card \.inline-tags li\s*\{[^}]*font-size:\s*10px/s);
    assert.match(mobile, /\.project-matrix-card__footer\s*\{[^}]*font-size:\s*10px/s);
  });

  test('keeps homepage content-card microcopy readable at desktop and mobile sizes', () => {
    assert.match(homeSectionsCss, /\.home-carousel__eyebrow\s*\{[^}]*font-size:\s*10px/s);
    assert.match(homeSectionsCss, /\.home-carousel__content > p\s*\{[^}]*font-size:\s*13px/s);
    assert.match(homeSectionsCss, /\.home-carousel__content li\s*\{[^}]*font-size:\s*10px/s);
    assert.match(homeHeroCss, /\.home-profile__summary\s*\{[^}]*font-size:\s*14px/s);
    assert.match(
      homeHeroCss,
      /\.home-utility__github-body\s*\{[^}]*min-height:\s*104px[^}]*margin:\s*14px 0 10px/s,
    );
    assert.match(homeHeroCss, /\.home-utility__github-title > span,[^}]*font-size:\s*9px/s);
    assert.match(homeHeroCss, /\.home-utility__github-footer\s*\{[^}]*font-size:\s*12px/s);
    assert.match(
      homeResponsiveCss,
      /@media \(max-width: 580px\)[\s\S]*?\.home-utility__github-body\s*\{[^}]*min-height:\s*110px/s,
    );
    assert.match(
      homeResponsiveCss,
      /@media \(max-width: 580px\)[\s\S]*?\.home-profile__role,\s*\.home-profile__summary\s*\{[^}]*font-size:\s*13px/s,
    );
  });

  test('keeps the Studio library, editor, and metadata controls readable', () => {
    assert.match(css, /\.article-copy strong\s*\{[^}]*font-size:\s*12px/s);
    assert.match(css, /\.article-copy small\s*\{[^}]*font:\s*10px\/1\.4 var\(--mono\)/s);
    assert.match(css, /\.article-status\s*\{[^}]*font:\s*650 10px\/1 var\(--mono\)/s);
    assert.match(css, /\.editor-body\s*\{[^}]*font-size:\s*15px/s);
    assert.match(css, /\.meta-control\s*\{[^}]*font-size:\s*13px/s);
    assert.match(css, /\.category-choice\s*\{[^}]*min-height:\s*42px[^}]*font-size:\s*12px/s);
    assert.match(css, /\.tag-combobox__input\s*\{[^}]*font-size:\s*13px/s);
    assert.match(
      css,
      /@media \(max-width: 620px\)[\s\S]*?\.editor-body\s*\{[^}]*font-size:\s*15px/s,
    );
  });
});

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

  test('renders desktop preview at a real desktop viewport before scaling it to fit', () => {
    assert.match(html, /id="preview-stage"/);
    assert.match(script, /const DESKTOP_PREVIEW_WIDTH = 1180/);
    assert.match(script, /new window\.ResizeObserver\(fitDesktopPreview\)/);
    assert.match(
      css,
      /\.preview-shell\.is-desktop\s*\{[^}]*width:\s*1180px[^}]*transform:\s*translateX\(-50%\) scale\(var\(--preview-scale/s,
    );
    assert.match(css, /\.preview-shell\.is-mobile\s*\{[^}]*transform:\s*none/s);
  });

  test('moves content settings and publish checks into separate drawers', () => {
    assert.match(html, /id="settings-drawer"/);
    assert.match(html, /id="publish-drawer"/);
    assert.match(html, /id="btn-settings"/);
    assert.match(html, /id="btn-publish-check"/);
    assert.match(html, /id="publish-check-status"/);
    assert.match(script, /btnConfirmPublish\.disabled/);
    assert.match(script, /\.summary-chip/);
  });

  test('treats drawers and new-draft form as real modal focus scopes', () => {
    assert.match(html, /id="settings-drawer"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*inert/);
    assert.match(html, /id="publish-drawer"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*inert/);
    assert.match(html, /id="new-article-form"[^>]*role="dialog"[^>]*aria-modal="true"/);
    assert.match(script, /function trapFocus\(event, container\)/);
    assert.match(script, /drawer\.removeAttribute\('inert'\)/);
    assert.match(script, /drawer\.setAttribute\('inert', ''\)/);
    assert.match(script, /addEventListener\('click', \(\) => closeDrawers\(\)\)/);
    assert.match(script, /addEventListener\('click', \(\) => closeNewModal\(\)\)/);
    assert.doesNotMatch(script, /addEventListener\('click', close(?:Drawers|NewModal)\)/);
  });

  test('resets cancelled draft fields and protects an unsaved current article', () => {
    assert.match(script, /if \(state\.modified && !window\.confirm\(/);
    assert.match(script, /refs\.newArticleForm\.reset\(\)/);
    assert.match(script, /state\.newModalReturnFocus/);
    assert.match(script, /state\.drawerReturnFocus/);
    assert.match(script, /returnFocus\?\.focus\(\)/);
  });

  test('uses state-aware publish copy for drafts and already-public articles', () => {
    assert.match(script, /const isPublic = state\.current\?\.draft === false/);
    assert.match(
      script,
      /btnConfirmPublish\.textContent = isPublic \? '保存公开更新' : '标记为公开'/,
    );
    assert.match(script, /已保存公开文章更新；部署前请运行完整验证/);
  });

  test('opens controlled selectors for categories and tags', () => {
    assert.match(html, /id="settings-category-options"/);
    assert.match(html, /id="settings-tag-input"/);
    assert.match(script, /renderCategoryOptions/);
    assert.match(script, /renderTagCombobox/);
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
