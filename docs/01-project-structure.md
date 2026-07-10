# 01｜项目结构

## 从哪里开始

浏览器访问 `/` 时，Astro 首先找到 `src/pages/index.astro`。这个页面只组装组件，不保存整页 HTML。

```text
src/pages/index.astro
  └─ BaseLayout.astro
      ├─ SiteHeader.astro
      │   └─ MobileNavigation.astro
      ├─ HeroSection.astro
      │   └─ FeaturedProject.astro
      │       └─ IslandArtwork.astro
      ├─ StatusStrip.astro
      ├─ AboutSection.astro
      ├─ ProjectsSection.astro
      ├─ ExperienceSection.astro
      ├─ StackSection.astro
      ├─ NotesSection.astro
      ├─ ContactSection.astro
      └─ SiteFooter.astro
```

`BaseLayout.astro` 输出完整 HTML、SEO、字体、样式和客户端脚本入口。

## 主要目录

### `src/pages/`

文件即路由：

- `index.astro` → `/`
- `about.astro` → `/about/`
- `projects/index.astro` → `/projects/`
- `projects/[slug].astro` → `/projects/heart-island/`
- `notes/index.astro` → `/notes/`
- `notes/[...slug].astro` → 文章路径
- `rss.xml.ts` → `/rss.xml`
- `404.astro` → `/404.html`

### `src/components/`

- `layout/`：跨页面布局组件
- `home/`：首页独立语义区块
- `project/`：项目列表和元信息
- `blog/`：文章列表、元信息和前后导航
- `common/`：真正重复使用的小组件

### `src/content/`

Markdown 原文。项目和博客字段由 `src/content.config.ts` 校验。

### `src/styles/`

按职责分开，但仍使用原生 CSS：

- `tokens.css`：变量
- `reset.css`：基础重置
- `typography.css`：首页文字规则
- `global.css`：主要页面与响应式规则
- `animations.css`：Reveal、关键帧和 reduced motion
- `utilities.css`：跳转链接和 focus 样式
- `content.css`：项目/文章内容页

### `src/scripts/`

只有浏览器需要的行为：主题、菜单、Reveal、active 导航和岛屿效果。

## 修改原则

1. 网站信息先找 `src/config/site.ts`。
2. 项目和文章先找 `src/content/`。
3. 首页固定内容找 `src/components/home/`。
4. 颜色先找 `tokens.css`。
5. 客户端行为从 `main.ts` 追踪到对应模块。
6. 不要把所有代码重新堆回 `index.astro`。
