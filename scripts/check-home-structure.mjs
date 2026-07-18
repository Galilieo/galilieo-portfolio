import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const distRoot = resolve(process.cwd(), 'dist');
const homepage = readFileSync(resolve(distRoot, 'index.html'), 'utf8');
const generatedPages = [
  resolve(distRoot, 'index.html'),
  resolve(distRoot, 'blog', 'index.html'),
  resolve(distRoot, 'archive', 'index.html'),
  resolve(distRoot, 'about', 'index.html'),
].map((file) => readFileSync(file, 'utf8'));
const blogPage = generatedPages[1];
const generatedCss = readdirSync(resolve(distRoot, '_astro'))
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(resolve(distRoot, '_astro', file), 'utf8'))
  .join('\n');

const failures = [];
const requiredSections = [
  'id="home-dashboard"',
  'id="profile"',
  'id="projects"',
  'id="blog"',
  'id="home-status"',
];
const forbiddenHomepageMarkers = [
  'id="quick-status"',
  'id="archive-preview"',
  'id="about"',
  'class="hero-visual',
  '查看项目 <span',
  '阅读博客 <span',
  'home-carousel__open-cue',
  'Listening shelf · reserved',
  '音乐卡片预留',
  '曲目与来源尚未确定',
  '天气尚未接入',
];

if (!homepage.includes('Galilieo')) failures.push('Homepage must render the Galilieo brand.');
if (generatedPages.some((html) => html.includes('Davis Leo'))) {
  failures.push('Generated public pages must not contain Davis Leo.');
}
if (!/\.skip-link\{[^}]*transform:translateY\(-160%\)/.test(generatedCss)) {
  failures.push('Generated CSS must keep the skip link outside the viewport by default.');
}
if (!/\.skip-link:focus-visible\{[^}]*transform:translateY\(0\)/.test(generatedCss)) {
  failures.push('Generated CSS must reveal the skip link on keyboard focus.');
}
if (!/html:not\(\.js\) \.reveal\{[^}]*opacity:1[^}]*transform:none/.test(generatedCss)) {
  failures.push('Generated CSS must keep reveal content visible without JavaScript.');
}

for (const marker of forbiddenHomepageMarkers) {
  if (homepage.includes(marker)) {
    failures.push(`Homepage must not contain legacy marker ${marker}.`);
  }
}

for (const marker of [
  'data-home-carousel',
  'data-site-time',
  'data-github-activity',
  'data-github-total',
  'data-github-active-days',
  'data-github-repository',
  'data-github-status',
  'data-home-environment',
  'data-home-weather',
  'data-global-music',
  'data-back-to-top',
  'data-music-view="home"',
  'https://music.163.com/#/playlist?id=18145116776',
  'class="home-carousel__section-link" href="/projects/"',
  'class="home-carousel__section-link" href="/blog/"',
]) {
  if (!homepage.includes(marker)) failures.push(`Homepage must render ${marker}.`);
}

if (generatedPages.some((html) => !html.includes('class="header-clock"'))) {
  failures.push('Every public page must render the compact Header clock.');
}
const homepageClockCount = (homepage.match(/\bdata-site-time(?:=|\s|>)/g) ?? []).length;
if (homepageClockCount !== 2) {
  failures.push(
    `Homepage must render one Header clock and one status clock; received ${homepageClockCount}.`,
  );
}
if (!generatedCss.includes('.header-clock')) {
  failures.push('Generated CSS must include the Header clock styles.');
}
if (
  !/\.header-clock\{(?=[^}]*position:absolute)(?=[^}]*top:3px)(?=[^}]*right:0)(?=[^}]*display:inline-flex)/.test(
    generatedCss,
  )
) {
  failures.push('Mobile Header must place the shared clock inside its top edge.');
}
if (!/\.site-header__inner\{padding-top:14px/.test(generatedCss)) {
  failures.push('Mobile Header must reserve a compact top rail for the clock.');
}

const homepageBlogCovers = [...homepage.matchAll(/data-blog-cover="([^"]+)"/g)].map(
  (match) => match[1],
);
if (homepageBlogCovers.length !== 3) {
  failures.push(
    `Homepage must render three selected article covers; received ${homepageBlogCovers.length}.`,
  );
}
for (const cover of homepageBlogCovers) {
  if (!blogPage.includes(`data-blog-cover="${cover}"`)) {
    failures.push(`Homepage and blog directory must share cover ${cover}.`);
  }
}
const homeNotesMarkup =
  homepage.match(/<section class="[^"]*home-notes[\s\S]*?<\/section>/)?.[0] ?? '';
if (homeNotesMarkup.includes('home-carousel__placeholder')) {
  failures.push('Selected Writing must use the article cover instead of the numbered placeholder.');
}

if (!homepage.includes('Public events · 30d')) {
  failures.push('Homepage GitHub snapshot must label its data as 30-day public events.');
}

const audioCount = (homepage.match(/<audio\b/g) ?? []).length;
if (audioCount !== 1) {
  failures.push(`Homepage must render exactly one global audio element; received ${audioCount}.`);
}

const profileMarkup = homepage.match(/<section class="home-profile[\s\S]*?<\/section>/)?.[0] ?? '';
const profileHrefs = [...profileMarkup.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(
  (match) => match[1],
);
const expectedProfileHrefs = [
  '/about/',
  '/projects/',
  '/blog/',
  'https://github.com/Galilieo',
  'mailto:jiangdavis021@gmail.com',
  'mailto:2930382766@qq.com',
];
if (JSON.stringify(profileHrefs) !== JSON.stringify(expectedProfileHrefs)) {
  failures.push(
    `Homepage profile targets must be ${expectedProfileHrefs.join(', ')}; received ${profileHrefs.join(', ')}.`,
  );
}
if (!/<h1[^>]*>Galilieo<\/h1>/.test(profileMarkup)) {
  failures.push('Homepage profile card must render the personal name Galilieo.');
}
for (const label of ['GitHub', 'Gmail', 'QQ 邮箱']) {
  if (!profileMarkup.includes(`home-profile__contact-label" aria-hidden="true">${label}<`)) {
    failures.push(`Homepage profile must render the ${label} brand contact label.`);
  }
}

let previousIndex = -1;
for (const marker of requiredSections) {
  const index = homepage.indexOf(marker);
  if (index === -1) failures.push(`Homepage is missing ${marker}.`);
  if (index !== -1 && index <= previousIndex) {
    failures.push(`Homepage section order is wrong at ${marker}.`);
  }
  if (index !== -1) previousIndex = index;
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log('Homepage identity checks passed.');
