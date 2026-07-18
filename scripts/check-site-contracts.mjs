import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import astroConfig from '../astro.config.mjs';
import { siteConfig } from '../src/config/site.ts';
import { runGeneratedSiteContract } from './lib/generated-site-contract.mjs';

function collectFiles(directory, predicate) {
  const files = [];

  function visit(currentDirectory) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (predicate(path)) files.push(path);
    }
  }

  visit(directory);
  return files;
}

function count(markup, marker) {
  return markup.split(marker).length - 1;
}

await runGeneratedSiteContract({
  name: 'Site identity and shell',
  successMessage: 'Site identity and shell checks passed.',
  check: ({ repositoryRoot, distRoot, readRepository, readDist }) => {
    const siteUrl = new URL(siteConfig.url);
    const failures = [];
    const readRepositoryFile = (...segments) => readRepository(...segments);

    if (siteUrl.protocol !== 'https:' || siteUrl.origin !== siteConfig.url) {
      failures.push(
        'siteConfig.url must be an HTTPS origin without a path, query, hash, or trailing slash.',
      );
    }

    if (astroConfig.site !== siteConfig.url) {
      failures.push(`Astro site must reuse siteConfig.url; received ${String(astroConfig.site)}.`);
    }

    const robots = readRepositoryFile('public', 'robots.txt');
    if (!robots.includes(`Sitemap: ${siteConfig.url}/sitemap-index.xml`)) {
      failures.push('robots.txt sitemap must match siteConfig.url.');
    }

    const nginx = readRepositoryFile('nginx.conf.example');
    if (
      !nginx.match(new RegExp(`\\bserver_name\\s+${siteUrl.hostname.replaceAll('.', '\\.')}\\s*;`))
    ) {
      failures.push('nginx.conf.example server_name must match siteConfig.url hostname.');
    }

    const sourceFiles = [
      resolve(repositoryRoot, 'astro.config.mjs'),
      ...collectFiles(resolve(repositoryRoot, 'src'), (path) => /\.(?:astro|ts)$/.test(path)),
      ...collectFiles(resolve(repositoryRoot, 'scripts'), (path) => path.endsWith('.mjs')),
    ];
    const siteConfigPath = resolve(repositoryRoot, 'src', 'config', 'site.ts');
    for (const path of sourceFiles) {
      if (path === siteConfigPath) continue;
      if (readFileSync(path, 'utf8').includes(siteUrl.hostname)) {
        failures.push(
          `${relative(repositoryRoot, path).split(sep).join('/')} must reuse siteConfig.url instead of duplicating the production hostname.`,
        );
      }
    }

    const publicHtmlFiles = collectFiles(distRoot, (path) => path.endsWith('.html'));
    if (publicHtmlFiles.length === 0) failures.push('dist/ must contain generated HTML pages.');

    for (const path of publicHtmlFiles) {
      const page = relative(distRoot, path).split(sep).join('/');
      const html = readFileSync(path, 'utf8');
      const skipIndex = html.indexOf('class="skip-link"');
      const headerIndex = html.indexOf('class="site-header"');
      const mainIndex = html.indexOf('id="main-content"');
      const footerIndex = html.indexOf('class="site-footer"');

      for (const [name, marker] of [
        ['skip link', 'class="skip-link"'],
        ['Site Header', 'class="site-header"'],
        ['main content', 'id="main-content"'],
        ['Site Footer', 'class="site-footer"'],
      ]) {
        const markerCount = count(html, marker);
        if (markerCount !== 1)
          failures.push(`${page} must render exactly one ${name}; received ${markerCount}.`);
      }

      if (!(skipIndex < headerIndex && headerIndex < mainIndex && mainIndex < footerIndex)) {
        failures.push(`${page} must preserve skip link -> Header -> main -> Footer order.`);
      }

      const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
      if (!canonical || new URL(canonical).origin !== siteConfig.url) {
        failures.push(`${page} canonical URL must use siteConfig.url.`);
      }
    }

    const archive = readDist('archive', 'index.html');
    for (const marker of [
      'data-archive-course',
      'class="archive-chain__chapter"',
      'class="archive-chain__coordinate"',
      'class="archive-chain__track"',
      'class="archive-chain__beacon"',
      'data-archive-voyage',
      'data-archive-voyage-day',
      'data-archive-voyage-night',
      'NEXT COORDINATE',
      '下一程，仍在航行',
      '把走过的路留在这里，新的坐标仍在海面上亮起。',
    ]) {
      if (!archive.includes(marker)) failures.push(`Archive must render ${marker}.`);
    }
    const voyageCount = (archive.match(/\bdata-archive-voyage(?:=|\s|>)/g) ?? []).length;
    if (voyageCount !== 1) {
      failures.push('Archive must render exactly one voyage ending.');
    }

    for (const [name, content] of [
      ['RSS', readDist('rss.xml')],
      ['sitemap', readDist('sitemap-0.xml')],
    ]) {
      if (!content.includes(siteConfig.url)) failures.push(`${name} must use siteConfig.url.`);
    }

    return failures;
  },
});
