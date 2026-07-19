import { readdirSync } from 'node:fs';
import { siteConfig } from '../src/config/site.ts';
import { runGeneratedSiteContract } from './lib/generated-site-contract.mjs';

await runGeneratedSiteContract({
  name: 'Blog directory and reading navigation',
  successMessage: 'Blog directory and reading navigation checks passed.',
  check: ({ readDist, resolveDist }) => {
    const readPage = (...segments) => readDist(...segments);
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

    function markedBlock(html, tagName, marker) {
      return (
        html.match(
          new RegExp(`<${tagName}\\b[^>]*${marker}[^>]*>[\\s\\S]*?<\\/${tagName}>`),
        )?.[0] ?? ''
      );
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
      if (!html.includes('data-blog-directory'))
        failures.push(`${name} must render BlogDirectory.`);
      if (html.includes('data-article-filter') || html.includes('Tag Index')) {
        failures.push(`${name} must not render the legacy Tag filter.`);
      }
      if (html.includes('blog-category-disclosure')) {
        failures.push(`${name} must not duplicate the Category directory on small screens.`);
      }
      if (!html.includes(`href="${siteConfig.url}/blog/"`)) {
        failures.push(`${name} must preserve the /blog/ canonical URL.`);
      }
    }

    const blogCategories = categorySignature(blogPage);
    const notesCategories = categorySignature(notesPage);
    if (blogCategories.length === 0) failures.push('BlogDirectory must render Category sections.');
    if (JSON.stringify(blogCategories) !== JSON.stringify(notesCategories)) {
      failures.push('/blog/ and /notes/ must render identical Category order and counts.');
    }

    const articleDirectories = readdirSync(resolveDist('notes'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const slug of articleDirectories) {
      const html = readPage('notes', slug, 'index.html');
      if (!html.includes('data-reading-navigation')) {
        failures.push(`/notes/${slug}/ must render reading navigation.`);
        continue;
      }

      const body = markedBlock(html, 'div', 'data-article-body');
      const headingIds = new Set(
        [...body.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"[^>]*>/g)].map((match) => match[1]),
      );
      const tocTargets = new Set(
        tagsWithMarker(html, 'a', 'data-reading-toc-link')
          .map((link) => attribute(link, 'href'))
          .filter((href) => href.startsWith('#'))
          .map((href) => href.slice(1)),
      );

      if (html.includes('data-reading-tab') || html.includes('data-reading-panel')) {
        failures.push(
          `/notes/${slug}/ must not render the removed mobile Category / article tabs.`,
        );
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

      const hero = tagsWithMarker(html, 'section', 'data-article-hero')[0] ?? '';
      const cover = markedBlock(html, 'div', 'data-article-cover');
      const backLink = tagsWithMarker(html, 'a', 'data-article-back-link')[0] ?? '';
      const desktopRecommendations = markedBlock(
        html,
        'section',
        'data-article-recommendations="desktop"',
      );
      const mobileRecommendations = markedBlock(
        html,
        'section',
        'data-article-recommendations="mobile"',
      );
      const desktopRecommendationCount = tagsWithMarker(
        desktopRecommendations,
        'a',
        'data-article-recommendation-link',
      ).length;
      const mobileRecommendationCount = tagsWithMarker(
        mobileRecommendations,
        'a',
        'data-article-recommendation-link',
      ).length;

      if (!hero) failures.push(`/notes/${slug}/ must render the article hero.`);
      if (!cover || !cover.includes('<img')) {
        failures.push(`/notes/${slug}/ must render an optimized article cover.`);
      }
      if (!body) failures.push(`/notes/${slug}/ must mark the server-rendered article body.`);
      if (/class="[^"]*\\bprose\\b[^"]*\\breveal\\b/.test(html)) {
        failures.push(`/notes/${slug}/ must not gate the whole article body behind Reveal.`);
      }
      if (attribute(backLink, 'href') !== '/notes/') {
        failures.push(`/notes/${slug}/ must provide a stable back link to /notes/.`);
      }
      if (desktopRecommendationCount === 0 || desktopRecommendationCount > 3) {
        failures.push(`/notes/${slug}/ desktop Recommended must contain 1–3 articles.`);
      }
      if (mobileRecommendationCount === 0 || mobileRecommendationCount > 2) {
        failures.push(`/notes/${slug}/ mobile Recommended must contain 1–2 articles.`);
      }
      for (const recommendationLink of tagsWithMarker(
        `${desktopRecommendations}${mobileRecommendations}`,
        'a',
        'data-article-recommendation-link',
      )) {
        if (attribute(recommendationLink, 'href') === `/notes/${slug}/`) {
          failures.push(`/notes/${slug}/ must not recommend itself.`);
        }
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
        failures.push(
          `${name} Tag results section must include a heading with data-blog-tag-results-heading.`,
        );
      }
      const tagHeading =
        html.match(
          /<header\b[^>]*\bdata-blog-tag-results-heading\b[^>]*>[\s\S]*?<\/header>/,
        )?.[0] ?? '';
      if (!tagHeading.includes('TAG INDEX') || !tagHeading.includes('全部文章')) {
        failures.push(`${name} Tag results heading must use the default Tag index semantics.`);
      }
      const tagHeadingText = tagHeading.replace(/<[^>]+>/g, ' ');
      if (/\bCategory\b/i.test(tagHeadingText)) {
        failures.push(`${name} Tag results heading must not retain Category semantics.`);
      }
      if (!html.includes('data-blog-tag-results-count')) {
        failures.push(
          `${name} Tag results section must include a count element with data-blog-tag-results-count.`,
        );
      }
      if (!html.includes('data-blog-tag-results-grid')) {
        failures.push(
          `${name} Tag results section must include an article grid with data-blog-tag-results-grid.`,
        );
      }
      // Category sections must NOT be hidden for no-JS fallback
      const catSectionCount = (
        html.match(/<section\b[^>]*\bdata-blog-category-section\b[^>]*>/g) ?? []
      ).length;
      const hiddenCatSections = (
        html.match(/<section\b[^>]*\bdata-blog-category-section\b[^>]*\bhidden\b[^>]*>/g) ?? []
      ).length;
      if (hiddenCatSections > 0) {
        failures.push(
          `${name} Category sections must not be hidden by default (no-JS fallback). ${hiddenCatSections}/${catSectionCount} hidden.`,
        );
      }
      // Verify Tag results grid contains article cards with data-blog-entry
      const tagGridMatch = html.match(
        /<div\b[^>]*\bdata-blog-tag-results-grid\b[^>]*>[\s\S]*?<\/div>/,
      );
      if (!tagGridMatch || !tagGridMatch[0].includes('data-blog-entry')) {
        failures.push(`${name} Tag results grid must contain article cards with data-blog-entry.`);
      }
    }

    // /blog/ and /notes/ must render identical Tag results structure (compare signatures)
    const blogTagSig = (blogPage.match(/<section\b[^>]*\bdata-blog-tag-results\b[^>]*>/g) ?? [])
      .length;
    const notesTagSig = (notesPage.match(/<section\b[^>]*\bdata-blog-tag-results\b[^>]*>/g) ?? [])
      .length;
    if (blogTagSig !== notesTagSig || blogTagSig === 0) {
      failures.push('/blog/ and /notes/ must render identical Tag results sections.');
    }

    return failures;
  },
});
