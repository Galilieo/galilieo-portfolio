# 内容维护指南

项目内容分为两类：站点与首页固定信息写在 TypeScript/Astro 文件中；项目和文章写在 Content Collections。字段定义以 `src/content.config.ts` 为准。

## 修改个人信息

统一配置在 `src/config/site.ts`：

- `name`、`title`、`description`、`url`：站点和全局 SEO
- `email`、`qqEmail`、`github`、`heartIsland`：联系入口与外链
- `author`：姓名、位置和身份
- `navigation`、`socialLinks`：顶部导航和社交链接

首页固定信息集中在 `src/data/home.ts`：

- `homeProfile`：首页身份与简介

`HomeProfileCard.astro` 读取 `homeProfile`，并从 Content Collections 计算 Works / Notes 数量；`HeroUtilityRail.astro` 显示 GitHub Public Events 与全局网易云播放器的首页同步视图；`HomeStatusStrip.astro` 以上海作为无脚本/网络失败回退，并在浏览器端增强为访客粗略位置、当地时间与 Open-Meteo 天气。不要在组件中再写第二份同义个人文案；独立关于页的详细介绍仍由 `src/components/home/AboutSection.astro` 维护。

个人成长节点集中在 `src/data/personal-timeline.ts`，由归档页“个人轨迹”视图读取；About 只保留头像、身份、详细介绍、事实和入口，不再维护第二份时间线。`/campus/` 是在校经历页，只展示已经确认的学习主线和真实项目；课程、比赛、社团、奖项或证书必须获得真实信息后才能补充。

首页音乐清单位于 `src/data/music.ts`，不要手工维护歌曲元数据。更新网易云歌单后运行 `pnpm run sync:music`，脚本会读取歌单 `18145116776`、检测站外播放可用性并重写静态清单；构建与访客访问页面时不请求网易云元数据接口。

博客列表优先使用文章 frontmatter 的 `cover`；没有独立封面时，根据 Category 选择巷道、太空舱或花海作为主场景，并在同分类文章中轮换另外两张现有场景图，避免连续重复同一封面。新增公开素材前必须确认许可证、作者和公开使用范围。

修改姓名、身份或方向时同时检查 `siteConfig` 与 `src/data/home.ts`，避免首屏、关于区和 SEO 信息互相矛盾。

## 新增项目

在 `src/content/projects/` 新建小写英文文件名，例如 `my-project.md`。最小示例：

```yaml
---
title: My Project
subtitle: 一句话副标题
description: 用于列表页和 SEO 的简短摘要。
homepageDescription:
  - 首页展示的第一段说明。
date: 2026-07
status: 持续开发
role: Frontend / Product
typeLabel: 个人项目
stack:
  - Astro
  - TypeScript
private: false
featured: false
order: 4
---
```

正文从 frontmatter 后开始。可选字段包括 `cover`、`website`、`repository`、`currentCapabilities`、`inDevelopment` 和 `statusLabel`。项目或文章配置 `cover` 后会用于首页视觉轮播；没有封面时自动使用 Heart Island / CSS 占位。`order` 必须是正整数且不要重复；首页和项目列表都按它升序排列。公开描述只写可验证的职责和能力，规划内容放进 `inDevelopment` 或正文的未来计划部分。

`private` 是必填元数据，但当前项目列表和 `getStaticPaths()` 都没有按它过滤；设置 `private: true` **不会**保护页面或阻止详情生成。非公开项目只能写允许公开的职责摘要，不能把敏感内容放进 Markdown。`repository` 目前也没有被组件渲染。

### 设置重点项目

项目的 `featured` 字段当前不改变首页位置。首页 `FeaturedProjects.astro` 按 `order` 展示前三个真实项目，因此重点项目应使用更小的 `order`；不要依赖 `featured: true` 产生未实现的筛选或样式。

Heart Island 当前通过 `FeaturedProjects.astro` 的第一张项目轮播卡承担重点视觉，不再拥有独立 Hero 卡。要保持它默认显示，应确保 `heart-island` 的 `order` 最小；修改相关视觉时必须保留 `IslandArtwork.astro` 的主体与水纹识别，不能只改 frontmatter 或替换 SVG。

## 新增博客文章

在 `src/content/blog/` 新建 `.md`；只有确实需要导入 Astro 组件时才使用 `.mdx`。草稿最小示例：

```yaml
---
title: '文章标题'
description: '说明文章解决什么问题的摘要。'
category: 工程笔记
tags:
  - Astro
  - TypeScript
draft: true
featured: false
order: 11
homepageState: 草稿
---
```

发布时改为：

```yaml
publishedAt: 2026-07-11
draft: false
homepageState: 已发布
```

`publishedAt`、`updatedAt` 支持 `YYYY`、`YYYY-MM` 或 `YYYY-MM-DD`，但公开文章必须有 `publishedAt`。`readingTime` 是可选正整数。首页“精选文章”优先展示 `featured: true` 的公开文章，再以近期文章补足三篇；不要给过多文章同时设置 `featured`。

- `category` 是文章的唯一主分类，用于 `/blog/` 与 `/notes/` 的目录分组。优先复用已有分类，避免为单篇文章创建含义相近的新分类。
- 博客目录在宽桌面使用左侧吸顶面板，1024px 及以下转为内容上方的横向索引；Category 链接定位真实分组。
- `tags` 是辅助主题词，公开文章保留 2–3 个主要 Tag；博客目录的 Tags 面板提供渐进增强筛选，切回 Category 时恢复全部文章。无 JavaScript 时所有文章仍完整输出。
- 正文使用连续、清晰的 H2/H3 层级生成文章目录，不跳级，也不使用标题只做视觉加粗。

公开文章会进入 `/notes/`、`/blog/`、文章详情、首页 Selected Writing 轮播、归档页“博客笔记”时间线、RSS 和 sitemap。归档页使用原生 Tabs 在博客笔记与个人轨迹之间切换；无 JavaScript 时两套时间线都完整显示。草稿不会生成公开详情页，也不会进入首页、归档、RSS 或 sitemap。

## Markdown 与 MDX

- 普通标题、段落、列表、代码、引用、表格和图片使用 Markdown。
- 需要导入组件或交互演示时才改用 MDX；MDX 依然必须满足同一个 collection schema。
- 不把可由 Markdown 表达的文章改成组件，也不要把内容硬编码进路由页面。

## 添加封面图片

把需要 Astro 处理的图片放在 `src/assets/images/` 的合适子目录，再从内容文件使用相对路径：

```yaml
cover: ../../assets/images/projects/my-project.jpg
```

`cover` 已在项目和博客 schema 中定义。项目卡直接渲染 frontmatter 封面；博客卡优先使用文章 `cover`，没有时按 Category 场景序列轮换，未知分类回退到花海序列。列表卡通过 Astro `Image` 生成响应式资源。详情 Layout 仍未使用封面；默认 SEO 分享图由 `siteConfig.defaultSeoImage` 指向 `public/images/galilieo-header.jpg`。

## 修改导航

导航项在 `src/config/site.ts` 的 `navigation`。当前主导航对应 `/`、`/projects`、`/blog`、`/archive` 和 `/about`；新增或修改链接前先确认真实路由存在。修改后检查桌面导航、移动菜单、当前区块状态与键盘操作。

## SEO 检查

- 全局默认值：`src/config/site.ts`。
- canonical、Open Graph、Twitter Card 与基础 JSON-LD：`src/layouts/BaseLayout.astro`。
- 文章结构化数据：`src/layouts/ArticleLayout.astro`。
- 项目结构化数据：`src/layouts/ProjectLayout.astro`。
- RSS：`src/pages/rss.xml.ts`；sitemap：`astro.config.mjs`；robots：`public/robots.txt`。

新增内容时至少检查标题、摘要、发布日期、URL slug 和外链是否准确。内容文件名会成为项目或文章 URL 的 slug，发布后不要无理由改名。

## 发布前检查

1. 区分当前能力、正在开发和未来计划；删除未验证成果或敏感实习信息。
2. 检查标题、摘要、标签、日期、`draft`、`order`、`homepageState` 和链接。
3. 运行 `pnpm run verify`（依次执行 lint、Astro check 和 build）。
4. 用 `pnpm run preview` 检查首页、列表页、详情页和移动端阅读。
5. 公开文章额外检查 `/rss.xml` 和生成的 sitemap；检查不存在路径确实显示 404。
