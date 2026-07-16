---
name: portfolio-content
description: Use when updating personal information, navigation, projects, project status, featured content, blog posts, article metadata, or external links in the Galilieo Astro portfolio. Do not use for layout, CSS, animation, or Canvas work.
version: 1.0.0
---

# Portfolio Content

## 适用场景

- 修改姓名、身份、简介、联系方式、导航或外部链接。
- 新增或更新项目、项目状态、重点项目信息。
- 新增博客、修改文章元数据或发布草稿。
- 调整项目/文章排序、标签、摘要、日期或图片引用。

## 不适用场景

- 页面布局、CSS、主题、动画、Reveal、SVG 或 Canvas：使用 `portfolio-ui-change`。
- 发布前全站检查：使用 `pre-release-check`。
- 不要用本 Skill 把内容系统改造成数据库、CMS 或后端。

## 必须读取

1. `AGENTS.md`
2. `docs/content-guide.md`
3. `src/content.config.ts`
4. `src/config/site.ts`
5. 与任务最接近的现有内容文件
6. 只有涉及首页固定文案时，才读取对应 `src/components/home/*.astro`

字段、可选值和展示行为以真实代码为准，文档与代码冲突时先指出差异，不要猜测。

## 执行步骤

1. **确认修改入口。**
   - 全局站点、作者、导航和外链优先修改 `src/config/site.ts`。
   - 项目和博客优先修改 `src/content/projects/` 或 `src/content/blog/`。
   - 个人电脑写普通 Markdown 博客时可运行 `pnpm run studio`（或 `node scripts/blog-studio.mjs`）；它只是本地表单与真实预览，最终内容所有权仍在 `src/content/blog/`。
   - 只有确实属于首页固定叙述时才修改 `src/components/home/`。
2. **读取 schema。** 核对必填字段、日期格式、URL、布尔值、正整数和 `draft` 约束。
3. **参考相邻内容。** 沿用现有 frontmatter 排列、语气和 Markdown 结构，不复制无关内容。
4. **做最小修改。** 不把同一数据重新硬编码到多个组件，不顺手重构组件或样式。
5. **检查内容一致性。**
   - 文件名/slug 为稳定的小写英文路径。
   - 标题、摘要、日期、标签、`order`、状态和图片路径正确。
   - 公开文章满足 `draft: false` 与 `publishedAt` 约束。
   - 项目“当前能力”和“正在开发”分开，不编造数据或成果。
6. **检查真实展示链路。** 不要假定 schema 中存在的字段已经被组件渲染。
7. **运行验证并记录结果。**

## 必须运行的命令

普通内容改动：

```bash
pnpm run verify
```

公开文章、项目、导航或 SEO 变化还要运行：

```bash
pnpm run preview
```

然后检查相关列表页、详情页和链接。若当前 shell 的 pnpm shim 不可用，可直接运行：

```bash
node scripts/verify.mjs
```

## 完成条件

- schema 校验、lint 和 build 全部通过。
- slug、日期、摘要、标签、链接和图片路径已核对。
- 新公开文章能生成详情页；RSS/sitemap 影响已检查。
- 没有把敏感实习信息或未验证成果写入公开内容。
- 没有任务外的组件、样式或依赖变化。

## 常见错误

- `private: true` 不是访问控制，不能保护 Markdown 内容。
- `featured: true` 只控制首页 Quick Cards 的“项目精选”，不会替换 Hero 心屿主视觉。
- `cover` 字段存在不等于当前组件已经显示封面。
- 草稿不会生成公开详情/RSS，也不会进入首页 Latest Blog 或 Archive Preview。
- Galilieo Studio 只绑定 `127.0.0.1`，不进入 `dist/`，也不会自动 Commit、Push 或部署；不要把它描述为线上 CMS。
- 内容目录叫 `blog`，公开路由同时保留 `/blog/` 与 `/notes/` 入口。
- 只改 `siteConfig` 不一定会同步首页所有固定文案；首页资料还要检查 `src/data/home.ts`。

## 禁止行为

- 不编造经历、指标、职责或项目能力。
- 不把可由 Content Collections 表达的内容硬编码进路由页面。
- 不无理由改 slug、依赖、schema 或整体页面结构。
- 不写入密码、Token、私钥或非公开项目细节。
- 不自动提交、推送、发布或部署。

## 输出格式

```text
内容修改：<文件和字段>
展示影响：<页面、RSS、sitemap 或导航>
验证：<实际执行命令和结果>
未验证项：<无则写“无”>
风险：<剩余风险或“无”>
```
