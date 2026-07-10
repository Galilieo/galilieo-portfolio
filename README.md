# Galilieo Portfolio & Notes

Galilieo 的个人作品集与技术博客正式工程。项目由已完成的 HTML/CSS/JavaScript 视觉 Demo 迁移而来，迁移目标是提高可维护性和内容发布能力，不重新设计页面。

正式域名：<https://galilieo.heart-island.cn>

## 技术栈

- Astro 静态站点生成
- TypeScript strict
- Astro Content Collections
- Markdown；仅在确实需要组件时使用 MDX
- Astro `Image` / `Picture`
- 原生 CSS、CSS Variables、SVG、Canvas 2D
- 少量客户端 TypeScript
- pnpm
- ESLint、Prettier、Astro Check
- Nginx 静态部署

## 为什么选择 Astro

本网站以内容展示为主，不是复杂 Web App。Astro 默认输出静态 HTML，仅给主题、菜单、滚动观察和岛屿效果加载浏览器脚本，因此页面在禁用 JavaScript 时仍可阅读，也不需要 Vue、React、状态管理或后端服务。

## 安装与启动

要求 Node.js 22 或更高版本，并启用 Corepack。

```bash
corepack enable
pnpm install
pnpm dev
```

默认开发地址通常为 `http://localhost:4321`。

## 检查与构建

```bash
pnpm check
pnpm lint
pnpm build
pnpm preview
```

静态文件输出到 `dist/`。

## 目录结构

```text
public/                 需要原文件名直接访问的字体、GIF、视频和静态文件
src/assets/             交给 Astro/Vite 处理的图片与 SVG
src/components/         布局、首页、项目、博客和通用组件
src/config/site.ts      网站信息、域名、邮箱、导航和社交链接
src/content/blog/       博客 Markdown / MDX
src/content/projects/   项目 Markdown / MDX
src/layouts/            HTML 页面壳、文章页和项目页布局
src/pages/              文件路由
src/scripts/            浏览器 TypeScript 模块
src/styles/             CSS 变量、全局样式、动画和内容样式
docs/                   中文学习与维护文档
```

完整说明见 [`docs/01-project-structure.md`](docs/01-project-structure.md)。

## 修改个人信息和导航

统一修改：

```text
src/config/site.ts
```

这里管理网站名称、描述、域名、邮箱、GitHub、心屿网址、作者信息、导航和默认 SEO 图片。不要在多个组件中重复写这些值。

首页个人介绍、实习经历和技术栈目前仍在以下组件中：

```text
src/components/home/AboutSection.astro
src/components/home/ExperienceSection.astro
src/components/home/StackSection.astro
```

## 新增项目

在 `src/content/projects/` 创建 Markdown：

```yaml
---
title: 项目名称
subtitle: 项目副标题
description: 项目摘要
homepageDescription:
  - 首页第一段
  - 首页第二段
date: '2026-07'
status: 持续开发
typeLabel: 个人项目
role: Full Stack
stack:
  - TypeScript
private: false
featured: false
order: 4
---
```

正文可以使用普通 Markdown。构建时 schema 会检查日期、数组、布尔值和 URL。详细字段见 [`docs/03-content-guide.md`](docs/03-content-guide.md)。

## 新增博客文章

在 `src/content/blog/` 创建 Markdown：

```yaml
---
title: 文章标题
description: 文章摘要
publishedAt: 2026-07-10
category: 工程笔记
tags:
  - Astro
draft: false
featured: false
order: 11
homepageState: 已发布
---
```

- 普通内容使用 `.md`。
- 只有需要嵌入 Astro 组件、交互演示或特殊布局时才使用 `.mdx`。
- `draft: true` 的文章不会生成公开文章页，也不会进入 RSS。
- 公开文章必须填写 `publishedAt`。

## 添加图片

可优化的本地图片放在：

```text
src/assets/images/
```

Astro 组件中使用 `Image`、`Picture`，或复用：

```text
src/components/common/ContentImage.astro
```

该组件默认输出 AVIF/WebP，并保留明确尺寸。所有内容图片必须提供有意义的 `alt`。

需要稳定公开路径的 OG 图片或外部直接引用文件放在 `public/images/`。

## 添加 GIF、Animated WebP 和视频

- GIF：`public/gifs/`
- MP4 / WebM：`public/videos/`
- 内容截图优先 WebP / AVIF
- 较长动画优先 MP4 / WebM
- 短透明动画可以使用 Animated WebP / APNG

Markdown 可以直接写原生 HTML：

```html
<video controls width="1280" height="720" preload="metadata">
  <source src="/videos/demo.webm" type="video/webm" />
  <source src="/videos/demo.mp4" type="video/mp4" />
</video>
```

## 修改岛屿素材

当前素材：

```text
src/assets/svg/island-reference-no-heart-vector.svg
```

渲染组件：

```text
src/components/home/IslandArtwork.astro
```

Canvas 技术迁移：

```text
src/scripts/island-effects.ts
```

不要通过修改 TypeScript 来重画岛屿。更换 SVG 前先保留原文件并执行三尺寸截图对比。

## 修改主题

- 颜色变量：`src/styles/tokens.css`
- 主题状态：`src/scripts/theme.ts`
- Head 初始主题：`src/layouts/BaseLayout.astro`

主题保存在 `localStorage` 的 `galilieo-theme` 中。

## 修改动画

- CSS 动画：`src/styles/animations.css`
- Reveal：`src/scripts/reveal.ts`
- 岛屿 Canvas：`src/scripts/island-effects.ts`
- 页面生命周期：`src/scripts/main.ts`

修改后必须检查 `prefers-reduced-motion`。

## SEO 与发布能力

项目已包含：

- canonical URL
- Open Graph
- Twitter Card
- WebSite / Person JSON-LD
- Article JSON-LD
- 项目结构化信息
- `robots.txt`
- sitemap
- RSS
- 静态 404 页面

## Nginx 部署

```bash
pnpm install
pnpm check
pnpm build
rsync -av --delete dist/ user@server:/var/www/galilieo-portfolio/
```

参考 `nginx.conf.example` 配置站点。Astro 是多页面静态站，不要把所有路径回退到 `/index.html`。

完整部署说明见 [`docs/06-deployment.md`](docs/06-deployment.md)。

## 建议阅读代码的顺序

1. `src/config/site.ts`
2. `src/pages/index.astro`
3. `src/layouts/BaseLayout.astro`
4. `src/components/home/`
5. `src/content.config.ts`
6. `src/content/projects/` 和 `src/content/blog/`
7. `src/styles/tokens.css`、`global.css`
8. `src/scripts/main.ts`
9. 五个客户端 TypeScript 模块
10. 项目和文章动态路由

## 视觉迁移基线

迁移前后在 WebKit 中检查：

- 1440 × 1000
- 1024 × 768
- 390 × 844

当前首页在这三个尺寸的迁移截图比较中平均像素差异均为 `0.0`。岛屿 SVG 复制前后 SHA-256 相同。
