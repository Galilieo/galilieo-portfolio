# 内容维护指南

项目内容分为两类：站点与首页固定信息写在 TypeScript/Astro 文件中；项目和文章写在 Content Collections。字段定义以 `src/content.config.ts` 为准。

## 修改个人信息

统一配置在 `src/config/site.ts`；它也是正式站点 URL 与公开身份的唯一代码来源：

- `name`、`title`、`description`、`url`：站点和全局 SEO
- `email`、`qqEmail`、`github`、`heartIsland`：联系入口与外链
- `author`：姓名、位置和身份
- `navigation`、`socialLinks`：顶部导航和社交链接

首页固定信息集中在 `src/data/home.ts`：

- `homeProfile`：首页身份与简介

`HomeProfileCard.astro` 读取 `homeProfile`，并从 Content Collections 计算 Works / Notes 数量；`HeroUtilityRail.astro` 显示 GitHub Public Events 与全局网易云播放器的首页同步视图；`HomeStatusStrip.astro` 以上海作为无脚本/网络失败回退，并在浏览器端增强为访客粗略位置、当地时间与 Open-Meteo 天气。不要在组件中再写第二份同义个人文案；独立关于页的详细介绍仍由 `src/components/home/AboutSection.astro` 维护。

个人成长节点集中在 `src/data/personal-timeline.ts`，由归档页“个人轨迹”视图读取；About 只保留头像、身份、详细介绍、事实和入口，不再维护第二份时间线。`/campus/` 是在校经历页，只展示已经确认的学习主线和真实项目；课程、比赛、社团、奖项或证书必须获得真实信息后才能补充。

首页音乐清单位于 `src/data/music.ts`，不要手工维护歌曲元数据。更新网易云歌单后运行 `pnpm run sync:music`，CLI Adapter 会读取歌单 `18145116776`、检测站外播放可用性，并通过 `scripts/lib/music-snapshot.mjs` 生成稳定静态清单；无法提供站外音频的曲目仍保留在歌单中，但播放按钮禁用。构建与访客访问页面时不请求网易云元数据接口。

博客列表与首页“精选文章”共用同一个封面选择器：优先使用文章 frontmatter 的 `cover`；没有独立封面时，根据文章 slug 从 `src/assets/images/covers/` 的已批准图库中稳定选择一张。同一文章在所有入口始终使用同一图库图片，不随刷新、分类顺序或构建顺序变化。新增公开素材前必须确认来源和公开使用范围。

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

正文从 frontmatter 后开始。可选字段包括 `cover`、`website`、`repository`、`currentCapabilities`、`inDevelopment` 和 `statusLabel`。项目或文章配置 `cover` 后会用于首页视觉轮播；项目没有封面时使用 Heart Island / CSS 回退，文章没有封面时使用统一博客图库。`order` 必须是正整数且不要重复；首页和项目列表都按它升序排列。公开描述只写可验证的职责和能力，规划内容放进 `inDevelopment` 或正文的未来计划部分。

`private` 是必填元数据，但当前项目列表和 `getStaticPaths()` 都没有按它过滤；设置 `private: true` **不会**保护页面或阻止详情生成。非公开项目只能写允许公开的职责摘要，不能把敏感内容放进 Markdown。`repository` 目前也没有被组件渲染。

### 设置重点项目

项目的 `featured` 字段当前不改变首页位置。首页 `FeaturedProjects.astro` 按 `order` 展示前三个真实项目，因此重点项目应使用更小的 `order`；不要依赖 `featured: true` 产生未实现的筛选或样式。

Heart Island 当前通过 `FeaturedProjects.astro` 的第一张项目轮播卡承担重点视觉，不再拥有独立 Hero 卡。要保持它默认显示，应确保 `heart-island` 的 `order` 最小；修改相关视觉时必须保留 `IslandArtwork.astro` 的主体与水纹识别，不能只改 frontmatter 或替换 SVG。

## 使用本地 Galilieo Studio

个人电脑可以运行 `pnpm run studio`；Windows Git Bash 的 pnpm shim 不可用时运行 `node scripts/blog-studio.mjs`。启动器会优先复用当前仓库已有的 Astro 开发预览，并从默认端口开始选择可用的本机端口；实际 Studio 与预览地址以终端输出为准。服务只监听 loopback，直接读写 `src/content/blog/*.md`，不会进入 `dist/`，服务器和线上访客都没有编辑入口。

- 左侧文章库用于搜索并区分草稿、已发布文章；桌面可以折叠，移动端作为临时抽屉打开。
- 主区提供“专注写作”和“边写边看”两种方式：前者扩大 Markdown 编辑区，后者并排显示真实 Astro 文章页。桌面画布以 1180px 真实 viewport 渲染后缩放进预览栏，手机画布保持 330px 左右的窄 viewport，二者会触发站点各自的真实响应式布局。
- Category、Tags、摘要、封面和日期集中在“文章设置”抽屉；编辑区只显示紧凑摘要，不让设置常驻挤压正文。
- 主分类直接在文章设置抽屉内以紧凑按钮单选；新建草稿时也直接显示在新建弹窗内。两个位置都可以输入新分类并立即选中；顶部分类摘要只打开文章设置并聚焦当前分类，不再弹出覆盖写作区的底部面板。
- 标签在文章设置抽屉和新建草稿弹窗内使用原位可创建多选框：已选值显示为可删除标签，输入可搜索已有值；不存在的名称会在锚定菜单首行显示“创建”，按 Enter 即新增并选中。空间不足时菜单自动向上展开，顶部标签摘要只打开文章设置并聚焦该字段；文章至少保留一个标签。只有封面继续使用底部选择面板，在自动图库、指定图库和专属上传间切换。
- 新增分类或标签只更新当前编辑状态，保存 Markdown 或创建草稿后才写入 frontmatter；之后 Studio 会从文章重新扫描并把它加入候选列表。名称最长 40 个字符，不能包含控制字符，标签不能重复。
- 封面提供三种模式：自动图库（按 slug 稳定分配图库图片）、指定图库（从已批准图库中选择具体封面）、专属上传（压缩为 WebP 写入文章资源目录）。抽屉会即时显示选择状态；保存 Markdown 后，真实 Astro 预览才读取新封面。
- `order` 由新建流程自动分配，`homepageState` 跟随草稿/发布状态，阅读时间根据正文估算；这些派生字段只显示结果，不要求日常手填。
- 输入过程中会把恢复副本保存在浏览器本地存储；只有点击保存或刷新真实预览时才写入 Markdown。恢复副本不是第二套内容源，成功保存后会清除。
- 文章设置、发布检查和新建草稿都使用模态焦点范围：Tab 不会进入背景或另一个关闭状态的抽屉，关闭后焦点回到原触发器。取消新建会清空标题、Slug、摘要、分类和标签；当前文章有未保存修改时，进入新建流程前必须确认。
- “发布检查”只做内容检查并更新本地 Markdown：草稿通过后显示“标记为公开”，已经公开的文章显示“保存公开更新”；两种操作都不会自动 Commit、Push、SSH、rsync 或部署。
- Studio 只管理普通 `.md`；需要 Astro 组件的 `.mdx` 继续在代码编辑器中维护，避免写作工具破坏组件语法。
- 专属上传模式把封面写入 `src/assets/images/blog/<slug>/cover.webp`；它只做方向修正与等比压缩，不代替人工检查构图。
- 公共封面图库位于 `src/assets/images/covers/`，包含 scene-alley、scene-balcony、scene-bloom、scene-orbit、scene-window 五张已批准 WebP；自动模式按 slug 的 FNV 哈希稳定分配图库封面，博客目录与首页精选卡保持同图。指定图库模式时 API 只接受这五个键值，拒绝任意文件路径；Markdown frontmatter 仍保存 Astro `image()` 可解析的已批准相对路径，而不是裸 key。

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

- `category` 是文章的唯一主分类，用于 `/blog/` 与 `/notes/` 的目录分组。Studio 允许新增，但应优先复用已有分类，避免为单篇文章创建含义相近的新分类。
- 博客目录在宽桌面使用左侧吸顶面板，1024px 及以下转为内容上方的横向索引；Category 链接定位真实分组。
- `tags` 是辅助主题词，公开文章保留 2–3 个主要 Tag；博客目录切到 Tags 时，右侧改为按发布日期排序的统一 Tag 结果流，标题显示选中的 Tag 与总数，文章卡内部继续显示真实 Category。切回 Category 时恢复分类分组。无 JavaScript 时只输出 Category 主内容流，所有文章仍完整可访问。
- 正文使用连续、清晰的 H2/H3 层级生成文章目录，不跳级，也不使用标题只做视觉加粗。

公开文章由 `src/lib/blog-directory.ts` 的 `getPublishedBlogArticles()` 统一选择，会进入 `/notes/`、`/blog/`、文章详情、首页 Selected Writing 轮播、归档页“博客笔记”时间线、RSS 和 sitemap。归档页使用原生 Tabs 在博客笔记与个人轨迹之间切换；无 JavaScript 时两套时间线都完整显示。开发环境允许单独预览草稿，生产构建不会生成草稿详情，草稿也不会进入首页、归档、RSS 或 sitemap。

## Markdown 与 MDX

- 普通标题、段落、列表、代码、引用、表格和图片使用 Markdown。
- 需要导入组件或交互演示时才改用 MDX；MDX 依然必须满足同一个 collection schema。
- 不把可由 Markdown 表达的文章改成组件，也不要把内容硬编码进路由页面。

## 添加封面图片

把需要 Astro 处理的图片放在 `src/assets/images/` 的合适子目录，再从内容文件使用相对路径：

```yaml
cover: ../../assets/images/projects/my-project.jpg
```

`cover` 已在项目和博客 schema 中定义。项目卡直接渲染 frontmatter 封面；博客目录与首页精选卡都调用 `src/lib/blog-cover.ts`，优先使用文章 `cover`，没有时按 slug 从已批准图库稳定选择。列表卡通过 Astro `Image` 生成响应式资源。详情 Layout 仍未使用封面；默认 SEO 分享图由 `siteConfig.defaultSeoImage` 指向 `public/images/galilieo-header.jpg`。

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
3. 运行 `pnpm run verify`（依次执行格式、lint、Astro check、build、站点契约、Node 测试和 Studio 生产隔离检查）。
4. 用 `pnpm run preview` 检查首页、列表页、详情页和移动端阅读。
5. 公开文章额外检查 `/rss.xml` 和生成的 sitemap；检查不存在路径确实显示 404。
