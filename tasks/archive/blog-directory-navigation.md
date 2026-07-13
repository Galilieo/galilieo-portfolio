# 博客 Category 目录与阅读导航

- 状态：已完成
- 完成日期：2026-07-13

## 目标

将 `/blog/` 与 `/notes/` 改为 Category 主目录，并为文章详情增加桌面正文目录和移动端轻量本文目录。

## 完成范围

- `/blog/` 与 `/notes/` 共享 Category 分组、数量、顺序和锚点。
- Tag 继续作为文章元信息，不再承担列表筛选。
- 宽桌面显示博客 Category 侧栏和文章 H2/H3 吸顶目录。
- 1024px 与 390px 不重复显示 Category 目录；文章页只保留原生折叠本文目录。
- 当前分类和当前章节使用 `IntersectionObserver` 渐进增强，并接入 Astro 页面切换清理周期。
- 新增构建产物契约检查，维护文档已同步。

## 不修改范围

- Content Collections schema、正文能力、RSS、sitemap、canonical、公开路由和生产配置。
- 首页、项目页、归档页、关于页和 Heart Island 素材。

## 实施依据

- 当前职责与维护边界：`docs/design-guide.md`、`docs/content-guide.md`、`docs/interior-pages-redesign.md`
- 完成记录以本归档任务和生产代码为准。

## 验收结果

- `node scripts/verify.mjs`：通过，包含 ESLint、Astro Check、静态构建、博客导航契约和首页结构检查。
- Astro Check：`0 errors / 0 warnings / 0 hints`；静态构建生成 18 个页面。
- `git diff --check`：通过。
- 1440×1000：博客侧栏和文章目录保持吸顶双列布局。
- 1024×768：隐藏 Category 侧栏，文章卡保持两列，文章页使用折叠本文目录。
- 390×844：文章卡单列，无独立 Category 目录；本文目录摘要 48px，展开后 8 个章节链接可用。
- 浅色、深色与刷新持久化通过；控制台无新增警告或错误。
- Reduced Motion 使用立即定位；无 JavaScript 时分类分组、正文和原生本文目录仍可用。
- `/`、项目、博客、文章、RSS、sitemap 返回 200；不存在路由返回 404。
- canonical、文章 Open Graph / JSON-LD、8 条 RSS item 和 sitemap 关键路由均已检查。

## 风险控制

- Category 与文章 headings 均来自同一构建期数据，两个博客入口不会漂移。
- 小屏删除重复目录和双 Tab，避免挤压首屏与增加维护成本。
- Observer 统一由 `main.ts` 初始化和清理，页面切换不保留旧状态。
- 工作区中与本任务无关的用户改动未被覆盖、清理或提交。
