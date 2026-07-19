# Article Detail Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将博客文章详情改造成带独立封面、稳定返回入口、桌面推荐与目录右栏、移动页尾推荐的可靠阅读页，并消除长文章正文被整块 Reveal 永久隐藏的风险。

**Architecture:** 推荐结果由 `src/lib/blog-directory.ts` 的纯函数在 Astro 构建阶段计算，文章路由把同一组结果传给详情布局；桌面右栏取 3 条，移动页尾组件取前 2 条。核心正文保持服务端 HTML 直接可见，客户端 `article-navigation.ts` 只继续增强目录当前位置，不新增运行时数据请求或生命周期模块。

**Tech Stack:** Astro 7、TypeScript、Content Collections、`astro:assets`、原生 CSS、Node `node:test`、生成产物契约脚本。

---

## 文件结构

- Modify: `src/lib/blog-directory.ts` — 增加公开文章 Recommended 的确定性排序纯函数。
- Modify: `tests/blog-publication.test.mjs` — 覆盖同 Category、共享 Tags、日期、排除项与 limit。
- Modify: `src/pages/notes/[...slug].astro` — 在构建阶段为每篇文章计算推荐结果并传入布局。
- Create: `src/components/blog/ArticleRecommendations.astro` — 渲染桌面 3 条 / 移动 2 条的语义化推荐列表。
- Modify: `src/components/blog/ArticleReadingNavigation.astro` — 桌面组合 Recommended 与本文目录；移动端仍只输出原生折叠目录。
- Modify: `src/layouts/ArticleLayout.astro` — 增加封面 Hero、稳定返回入口、调整正文与页尾顺序，并移除正文整块 Reveal。
- Modify: `src/styles/interior.css` — 完成文章 Hero、推荐列表、双栏、移动降密度和无模糊回退。
- Modify: `scripts/check-blog-navigation.mjs` — 为封面、稳定返回、推荐数量和正文可见性增加生成产物契约。
- Modify: `tasks/active/article-detail-reading-redesign.md` — 完成后将记录迁移到 `tasks/archive/`。

`docs/design-guide.md`、`src/styles/tokens.css` 和 `src/scripts/main.ts` 不在本计划修改范围内：现有语义 token、目录增强入口和清理周期已经足够。工作区里这些文件如有其他未提交改动，必须保留且不能混入本功能提交。

### Task 1: 用测试锁定 Recommended 排序规则

**Files:**

- Modify: `tests/blog-publication.test.mjs`
- Modify: `src/lib/blog-directory.ts`

- [ ] **Step 1: 为推荐优先级写失败测试**

把测试文件的 import 改为：

```js
import { getPublishedBlogArticles, getRecommendedBlogArticles } from '../src/lib/blog-directory.ts';
```

在现有 `describe('Public Article selection')` 后增加：

```js
describe('Recommended Article selection', () => {
  const current = article('current', {
    category: '工程笔记',
    tags: ['Astro', 'CSS'],
    draft: false,
    publishedAt: '2026-07-10',
  });

  test('prioritizes Category, then shared Tags, then publication date', () => {
    const candidates = [
      current,
      article('other-two-tags-newest', {
        category: '项目复盘',
        tags: ['Astro', 'CSS'],
        draft: false,
        publishedAt: '2026-07-19',
      }),
      article('same-one-tag-newer', {
        category: '工程笔记',
        tags: ['Astro'],
        draft: false,
        publishedAt: '2026-07-18',
      }),
      article('same-two-tags-older', {
        category: '工程笔记',
        tags: ['Astro', 'CSS'],
        draft: false,
        publishedAt: '2026-07-01',
      }),
      article('other-no-tags', {
        category: '随笔',
        tags: ['阅读'],
        draft: false,
        publishedAt: '2026-07-17',
      }),
    ];

    assert.deepEqual(
      getRecommendedBlogArticles(candidates, current, 4).map(({ id }) => id),
      ['same-two-tags-older', 'same-one-tag-newer', 'other-two-tags-newest', 'other-no-tags'],
    );
    assert.deepEqual(
      candidates.map(({ id }) => id),
      [
        'current',
        'other-two-tags-newest',
        'same-one-tag-newer',
        'same-two-tags-older',
        'other-no-tags',
      ],
      'recommendation must not reorder the caller input',
    );
  });

  test('excludes the current article and unpublished entries, then respects limit', () => {
    const candidates = [
      current,
      article('published', {
        category: '工程笔记',
        tags: [],
        draft: false,
        publishedAt: '2026-07-11',
      }),
      article('draft', {
        category: '工程笔记',
        tags: ['Astro', 'CSS'],
        draft: true,
        publishedAt: '2026-07-19',
      }),
      article('missing-date', {
        category: '工程笔记',
        tags: ['Astro', 'CSS'],
        draft: false,
      }),
    ];

    assert.deepEqual(
      getRecommendedBlogArticles(candidates, current, 1).map(({ id }) => id),
      ['published'],
    );
    assert.deepEqual(getRecommendedBlogArticles(candidates, current, 0), []);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败原因正确**

Run:

```bash
node --test tests/blog-publication.test.mjs
```

Expected: FAIL，错误指出 `src/lib/blog-directory.ts` 没有导出 `getRecommendedBlogArticles`。

- [ ] **Step 3: 实现最小确定性排序函数**

在 `src/lib/blog-directory.ts` 的 `getPublishedBlogArticles` 后增加：

```ts
export function getRecommendedBlogArticles(
  articles: BlogArticle[],
  currentArticle: BlogArticle,
  limit = 3,
): BlogArticle[] {
  const currentTags = new Set(currentArticle.data.tags);
  const safeLimit = Math.max(0, Math.trunc(limit));

  return getPublishedBlogArticles(articles)
    .filter((article) => article.id !== currentArticle.id)
    .map((article) => ({
      article,
      sameCategory: Number(article.data.category === currentArticle.data.category),
      sharedTagCount: article.data.tags.filter((tag) => currentTags.has(tag)).length,
    }))
    .sort(
      (candidateA, candidateB) =>
        candidateB.sameCategory - candidateA.sameCategory ||
        candidateB.sharedTagCount - candidateA.sharedTagCount ||
        (candidateB.article.data.publishedAt ?? '').localeCompare(
          candidateA.article.data.publishedAt ?? '',
        ) ||
        candidateA.article.id.localeCompare(candidateB.article.id),
    )
    .slice(0, safeLimit)
    .map(({ article }) => article);
}
```

- [ ] **Step 4: 运行目标测试并确认通过**

Run:

```bash
node --test tests/blog-publication.test.mjs
```

Expected: PASS，`Public Article selection` 与 `Recommended Article selection` 全部通过。

- [ ] **Step 5: 提交纯数据规则**

```bash
git add src/lib/blog-directory.ts tests/blog-publication.test.mjs
git commit -m "feat: 增加文章推荐排序 / add article recommendation ranking"
```

### Task 2: 把推荐数据接入静态文章路由

**Files:**

- Modify: `src/pages/notes/[...slug].astro`
- Create: `src/components/blog/ArticleRecommendations.astro`

- [ ] **Step 1: 新建语义化推荐列表组件**

创建 `src/components/blog/ArticleRecommendations.astro`：

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  articles: CollectionEntry<'blog'>[];
  variant: 'desktop' | 'mobile';
}

const { articles, variant } = Astro.props;
const visibleArticles = articles.slice(0, variant === 'desktop' ? 3 : 2);
const headingId = `article-recommendations-${variant}`;
---

{
  visibleArticles.length > 0 && (
    <section
      class:list={['article-recommendations', `article-recommendations--${variant}`]}
      aria-labelledby={headingId}
      data-article-recommendations={variant}
    >
      <p class="article-recommendations__eyebrow">Recommended</p>
      <h2 id={headingId}>继续阅读</h2>
      <ol>
        {visibleArticles.map((article) => (
          <li>
            <a
              href={`/notes/${article.id}/`}
              data-article-recommendation-link
              data-recommended-article={article.id}
            >
              <strong>{article.data.title}</strong>
              <span>
                {article.data.category}
                {article.data.readingTime ? ` · ${article.data.readingTime} 分钟` : ''}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 2: 在文章静态路由计算推荐结果**

把 `src/pages/notes/[...slug].astro` 的博客工具 import 改为：

```ts
import { getPublishedBlogArticles, getRecommendedBlogArticles } from '../../lib/blog-directory';
```

删除 `BlogCategorySummary`、`getBlogCategorySummaries` 和 `categorySummaries`。把 `getStaticPaths()` 返回值改为：

```ts
return navigationArticles.map((article, index) => ({
  params: { slug: article.id },
  props: {
    article,
    previous: navigationArticles[index - 1],
    next: navigationArticles[index + 1],
    recommendations: getRecommendedBlogArticles(publicArticles, article, 3),
  },
}));
```

把页面 Props 与解构改为：

```ts
interface Props {
  article: CollectionEntry<'blog'>;
  previous?: CollectionEntry<'blog'>;
  next?: CollectionEntry<'blog'>;
  recommendations: CollectionEntry<'blog'>[];
}

const { article, previous, next, recommendations } = Astro.props;
```

并把布局调用改为：

```astro
<ArticleLayout
  article={article}
  previous={previous}
  next={next}
  recommendations={recommendations}
  headings={headings}
>
  <Content />
</ArticleLayout>
```

- [ ] **Step 3: 先做类型与构建验证**

Run:

```bash
node node_modules/astro/bin/astro.mjs check
```

Expected: 此时允许因 `ArticleLayout` 尚未声明 `recommendations` 而 FAIL；错误必须只指向下一任务即将补齐的 Props，不得出现 Content Collection 或推荐函数类型错误。

- [ ] **Step 4: 暂不提交不完整路由，直接进入 Task 3**

Task 2 与 Task 3 构成一个可运行 UI 单元；在 Task 3 完成并通过 Astro Check 后一起提交。

### Task 3: 重组文章 Hero、阅读导航与页尾顺序

**Files:**

- Modify: `src/components/blog/ArticleReadingNavigation.astro`
- Modify: `src/layouts/ArticleLayout.astro`
- Reuse: `src/components/blog/ArticleRecommendations.astro`

- [ ] **Step 1: 把桌面阅读导航收敛为 Recommended + TOC**

将 `ArticleReadingNavigation.astro` 的 frontmatter 改为：

```astro
---
import type { MarkdownHeading } from 'astro';
import type { CollectionEntry } from 'astro:content';
import ArticleRecommendations from './ArticleRecommendations.astro';

interface Props {
  variant: 'desktop' | 'mobile';
  headings: MarkdownHeading[];
  recommendations?: CollectionEntry<'blog'>[];
}

const { variant, headings, recommendations = [] } = Astro.props;
const tocHeadings = headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
---
```

桌面分支改为以下结构，删除旧的 Category 返回链接：

```astro
<aside
  class="article-reading-navigation article-reading-navigation--desktop"
  aria-label="文章阅读辅助"
  data-reading-navigation
>
  <ArticleRecommendations articles={recommendations} variant="desktop" />
  {
    tocHeadings.length > 0 && (
      <nav class="article-toc" aria-label="本文目录">
        <p>本文目录</p>
        <ol>
          {tocHeadings.map((heading) => (
            <li class:list={{ 'is-depth-three': heading.depth === 3 }}>
              <a href={`#${heading.slug}`} data-reading-toc-link>
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    )
  }
</aside>
```

移动分支保留现有原生 `<details>` 结构，只移除已经不存在的 Category Props，不加入推荐文章。

- [ ] **Step 2: 用 Astro Image 构建独立文章 Hero**

在 `ArticleLayout.astro` 增加 import：

```ts
import { Image } from 'astro:assets';
import ArticleRecommendations from '../components/blog/ArticleRecommendations.astro';
import { getBlogCover } from '../lib/blog-cover';
```

删除 `BlogCategorySummary` import。Props 与初始化改为：

```ts
interface Props {
  article: CollectionEntry<'blog'>;
  previous?: CollectionEntry<'blog'>;
  next?: CollectionEntry<'blog'>;
  recommendations: CollectionEntry<'blog'>[];
  headings: MarkdownHeading[];
}

const { article, previous, next, recommendations, headings } = Astro.props;
const artwork = getBlogCover(article);
const coverAlt = artwork.key === 'custom' ? `${article.data.title}封面` : '';
```

把 `<article class="article-page">` 的开头替换为：

```astro
<article class="article-page">
  <section class="article-page__hero reveal" data-article-hero>
    <div class="article-page__cover" data-article-cover>
      <Image
        src={artwork.image}
        alt={coverAlt}
        class:list={['article-page__cover-image', `article-page__cover-image--${artwork.key}`]}
        style={`object-position: ${artwork.position}`}
        widths={[480, 720, 960, 1280]}
        sizes="(max-width: 1100px) calc(100vw - 72px), 860px"
        loading="eager"
        decoding="async"
      />
    </div>
    <header class="page-header">
      <a class="article-page__back" href="/notes/" data-article-back-link> ← 返回博客 </a>
      <p class="section-kicker">Notes / {article.data.category}</p>
      <h1>{article.data.title}</h1>
      <p>{article.data.description}</p>
      <ArticleMeta
        category={article.data.category}
        publishedAt={article.data.publishedAt}
        updatedAt={article.data.updatedAt}
        readingTime={article.data.readingTime}
      />
      <TagList items={article.data.tags} label="文章标签" />
    </header>
  </section>
</article>
```

- [ ] **Step 3: 保证正文直接可见并按确认顺序排列页尾**

Hero 后面的主体改为：

```astro
<ArticleReadingNavigation variant="mobile" headings={headings} />
<div class="prose" data-article-body><slot /></div>
<ArticleNavigation previous={previous} next={next} />
<ArticleRecommendations articles={recommendations} variant="mobile" />
```

删除原底部 `.back-link`。桌面右栏调用改为：

```astro
<ArticleReadingNavigation variant="desktop" headings={headings} recommendations={recommendations} />
```

关键约束：`.prose` 不再含 `reveal`，返回入口只在 Hero 中出现一次，移动推荐位于 `ArticleNavigation` 之后。

- [ ] **Step 4: 运行 Astro Check**

Run:

```bash
node node_modules/astro/bin/astro.mjs check
```

Expected: `0 errors / 0 warnings / 0 hints`。如果项目当前 Astro 版本不支持独立 `check`，运行 `node scripts/verify.mjs` 并要求 Astro Check 阶段通过。

- [ ] **Step 5: 提交静态数据与语义结构**

```bash
git add 'src/pages/notes/[...slug].astro' src/components/blog/ArticleRecommendations.astro src/components/blog/ArticleReadingNavigation.astro src/layouts/ArticleLayout.astro
git commit -m "feat: 重组文章详情阅读结构 / reshape article detail reading flow"
```

### Task 4: 完成双主题、桌面右栏和移动页尾样式

**Files:**

- Modify: `src/styles/interior.css:359-376`
- Modify: `src/styles/interior.css:1976-2118`
- Modify: `src/styles/interior.css:2319-2358`
- Modify: `src/styles/interior.css:2529-2535`

- [ ] **Step 1: 把新 Hero 和移动推荐接入现有玻璃表面**

在现有共享表面选择器中加入：

```css
.interior-detail .article-page__hero,
.interior-detail .article-recommendations--mobile,
```

保留原 `--interior-*` token、阴影和模糊，不新增硬编码主题色。

- [ ] **Step 2: 添加 Hero、返回入口与封面样式**

在详情页样式段 `.article-reading-layout` 前加入：

```css
.article-page__hero {
  overflow: hidden;
  border-radius: 24px;
}

.article-page__cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-bottom: 1px solid var(--interior-border);
  background: var(--interior-surface-soft);
}

.article-page__cover::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: linear-gradient(180deg, transparent 56%, var(--interior-surface-soft));
  opacity: 0.42;
}

.article-page__cover-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  filter: saturate(0.82) contrast(0.97);
}

.interior-detail .article-page .page-header {
  max-width: none;
  margin: 0;
  padding: clamp(30px, 5vw, 52px);
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.article-page__back {
  width: fit-content;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  margin-bottom: 18px;
  color: var(--home-text-secondary);
  font-size: 12px;
}

.article-page__back:hover,
.article-page__back:focus-visible {
  color: var(--home-accent);
}
```

- [ ] **Step 3: 添加 Recommended 列表的完整样式**

在 `.article-reading-navigation__body` 后加入：

```css
.article-recommendations--mobile {
  display: none;
  max-width: 860px;
  margin: 24px auto 0;
  padding: 22px;
  border-radius: 18px;
  background: var(--interior-surface-strong);
}

.article-recommendations__eyebrow {
  margin: 0;
  color: var(--home-accent);
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.article-recommendations h2 {
  margin: 7px 0 0;
  color: var(--home-text);
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 600;
}

.article-recommendations ol {
  display: grid;
  gap: 6px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.article-recommendations a {
  display: grid;
  gap: 5px;
  min-height: 54px;
  padding: 10px 11px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--home-text-secondary);
  background: color-mix(in srgb, var(--home-accent-soft) 34%, transparent);
  transition:
    color 180ms ease,
    border-color 180ms ease,
    transform 220ms var(--ease);
}

.article-recommendations a:hover,
.article-recommendations a:focus-visible {
  border-color: var(--interior-border-strong);
  color: var(--home-text);
  transform: translateY(-2px);
}

.article-recommendations strong {
  font-size: 12px;
  line-height: 1.55;
}

.article-recommendations a span {
  color: var(--home-text-muted);
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

- [ ] **Step 4: 校准正文间距和响应式显示**

把 `.interior-detail .prose` 的顶部间距显式收敛：

```css
.interior-detail .prose {
  max-width: 860px;
  margin-top: clamp(26px, 4vw, 42px);
  padding: clamp(30px, 5vw, 58px);
  border-radius: 24px;
  background: var(--interior-surface-strong);
  color: var(--home-text-secondary);
}
```

在现有 `@media (max-width: 1100px)` 中加入：

```css
.article-recommendations--mobile {
  display: block;
}
```

在现有 `@media (max-width: 580px)` 的无模糊选择器中加入 `.interior-detail .article-page__hero` 和 `.interior-detail .article-recommendations--mobile`，并在该断点加入：

```css
.article-page__hero,
.article-recommendations--mobile {
  background: var(--interior-surface-strong);
}

.article-page__cover {
  aspect-ratio: 16 / 10;
}

.article-recommendations--mobile {
  padding: 18px;
}
```

在 Reduced Motion 媒体查询的 transition 清理列表加入 `.article-recommendations a`，并在 transform 清理规则加入：

```css
.article-recommendations a:hover,
.article-recommendations a:focus-visible {
  transform: none;
}
```

- [ ] **Step 5: 格式化并运行自动检查**

Run:

```bash
node node_modules/prettier/bin/prettier.cjs --write src/styles/interior.css src/layouts/ArticleLayout.astro src/components/blog/ArticleReadingNavigation.astro src/components/blog/ArticleRecommendations.astro 'src/pages/notes/[...slug].astro'
node scripts/verify.mjs
```

Expected: Prettier 完成；ESLint、Astro Check、build、结构契约和 Node tests 全部通过。此时旧契约仍可能因 Category 返回链接变化失败，若失败只允许是 Task 5 明确要更新的旧契约断言。

- [ ] **Step 6: 提交视觉实现**

```bash
git add src/styles/interior.css
git commit -m "style: 打磨文章详情阅读布局 / polish article detail reading layout"
```

### Task 5: 更新生成产物契约

**Files:**

- Modify: `scripts/check-blog-navigation.mjs`

- [ ] **Step 1: 增加可复用的标记区块读取函数**

在 `attribute()` 后增加：

```js
function markedBlock(html, tagName, marker) {
  return (
    html.match(new RegExp(`<${tagName}\\b[^>]*${marker}[^>]*>[\\s\\S]*?<\\/${tagName}>`))?.[0] ?? ''
  );
}
```

- [ ] **Step 2: 用新文章详情契约替换旧 Category 返回断言**

在文章目录循环中保留 H2/H3 与移动目录校验，删除 `data-current-category-link` 断言，并增加：

```js
const hero = tagsWithMarker(html, 'section', 'data-article-hero')[0] ?? '';
const cover = markedBlock(html, 'div', 'data-article-cover');
const body = tagsWithMarker(html, 'div', 'data-article-body')[0] ?? '';
const backLink = tagsWithMarker(html, 'a', 'data-article-back-link')[0] ?? '';
const desktopRecommendations = markedBlock(
  html,
  'section',
  'data-article-recommendations="desktop"',
);
const mobileRecommendations = markedBlock(html, 'section', 'data-article-recommendations="mobile"');
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
```

- [ ] **Step 3: 构建并运行目标契约**

Run:

```bash
node node_modules/astro/bin/astro.mjs build
node scripts/check-blog-navigation.mjs
```

Expected: build 成功，输出 `Blog directory and reading navigation checks passed.`。

- [ ] **Step 4: 提交契约**

```bash
git add scripts/check-blog-navigation.mjs
git commit -m "test: 约束文章详情阅读结构 / enforce article detail reading contracts"
```

### Task 6: 全量验证与真实浏览器验收

**Files:**

- Verify only: `dist/`（不直接编辑、不提交）
- Move after success: `tasks/active/article-detail-reading-redesign.md` → `tasks/archive/article-detail-reading-redesign.md`

- [ ] **Step 1: 运行统一验证入口**

Run:

```bash
node scripts/verify.mjs
git diff --check
```

Expected: Prettier、ESLint、Astro Check、静态构建、站点契约、全部 Node tests 和 Studio 隔离检查全部通过；`git diff --check` 无输出。

- [ ] **Step 2: 启动可持续预览进程**

Run:

```bash
node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4321
```

Expected: preview 保持运行，`http://127.0.0.1:4321/notes/capacitor-android-media-save-debugging/` 返回 200。不要让启动预览的终端在浏览器验收前退出。

- [ ] **Step 3: 检查最长公开文章**

在 `capacitor-android-media-save-debugging` 页面检查：

- `1440×1000`：封面在标题上方；右栏按 `Recommended → 本文目录` 排列；推荐最多 3 条；目录滚动时吸顶并正确高亮 H2/H3。
- `1024×768`：右栏退出；标题下仅有原生折叠目录；正文完整；页尾顺序为前后篇后接 2 条 Recommended。
- `390×844`：无横向溢出；封面比例自然；目录可触控；推荐不使用大图；主文字和链接对比度清晰。
- 浅色、深色、Reduced Motion 各检查一次，控制台无新增错误。

- [ ] **Step 4: 检查短文章和无 JavaScript 回退**

打开任意已发布短文章（优先 `/notes/heart-island-multi-turn-memory/`），确认短正文不会造成右栏或页尾推荐错位。然后在最长文章禁用 JavaScript 并刷新，确认 Hero、正文、目录锚点、前后篇和 Recommended 全部可见可用，`.prose` 不透明且没有 `reveal` 类。

- [ ] **Step 5: 检查外部直达与键盘路径**

直接在新标签打开最长文章，点击 Hero 内“返回博客”应稳定进入 `/notes/`。用 Tab 依次遍历返回链接、折叠目录、正文链接、前后篇与推荐链接；所有焦点清晰，移动端隐藏的桌面右栏不进入 Tab 顺序。

- [ ] **Step 6: 归档任务记录**

使用 `apply_patch` 在 `tasks/archive/article-detail-reading-redesign.md` 新增与 active 文件相同的内容，将状态改为 `completed` 并补充验证结果；同时删除 `tasks/active/article-detail-reading-redesign.md`。

- [ ] **Step 7: 提交验收记录**

```bash
git add tasks/active/article-detail-reading-redesign.md tasks/archive/article-detail-reading-redesign.md
git commit -m "docs: 归档文章详情阅读改造 / archive article detail reading work"
```

- [ ] **Step 8: 最终提交范围审计**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: 本功能提交只包含计划列出的文件；`docs/design-guide.md`、`src/styles/global-controls.css`、`src/styles/tokens.css` 等任务开始前已有修改仍按原状态保留，除非用户另行要求把它们作为独立音乐悬浮窗提交处理。

发布与推送只在用户已明确授权且所有验证通过后进行；推送成功不等于服务器已部署，部署必须另行执行并进行真实线上回归。
