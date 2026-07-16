# Galilieo Studio 写作与发布体验重构

- 状态：已完成
- 日期：2026-07-16
- 负责人：Hermes Sol（方案、视觉实现、整合与验收），DeepSeek V4-Pro（冻结范围内运行时实现与独立审查）

## 目标

把现有三栏技术型 Studio 重构为真正方便个人发布博客的本地写作台：以方案二的边写边看为主，吸收方案一的安静编辑感，减少强制步骤和技术字段，同时保持 Markdown、Astro 静态构建与 Nginx 部署边界不变。

## 调研依据

- Ghost Editor：编辑过程中使用上下文工具，内部链接和内容设置尽量不离开编辑器、不打断写作流。
  - https://ghost.org/help/using-the-editor/
- Ghost Publishing：编辑器顶部集中预览和发布，支持桌面、移动端等实时预览。
  - https://ghost.org/help/publishing-content/
- WordPress Distraction Free Mode：长文场景保留专注写作入口。
  - https://wordpress.org/documentation/article/distraction-free-mode/
- Notion Writing & Editing Basics：文档画布优先、低干扰编辑。
  - https://www.notion.com/help/writing-and-editing-basics

只提炼通用交互原则，不复制第三方代码、色值、素材或品牌结构。

## 已冻结方案

### 核心结构

- 左侧保留文章库、搜索、草稿/已发布筛选与新建入口；桌面可折叠。
- 主区提供两种写作方式：
  1. **专注写作**：隐藏预览，正文获得最大宽度。
  2. **边写边看**：Markdown 编辑器与真实 Astro 页面并排显示。
- 不使用“内容 → 预览 → 检查 → 发布”强制四步向导；顶部只保留模式切换、保存、文章设置和检查发布。
- 视觉以方案一的低饱和蓝灰、安静纸面、柔和中文标题为基础，保留正式浅色/深色主题。

### 内容设置简化

- 日常可见：摘要、Category、Tags、封面、发布日期、更新日期、精选。
- 自动/隐藏：
  - `order` 新建时由服务端自动分配，编辑器不再暴露。
  - `homepageState` 由草稿/发布状态自动同步。
  - `readingTime` 根据正文自动估算，仅显示结果，不要求手填。
  - `slug` 创建后只读并收进高级信息。
- Category 和 Tags 在编辑区顶部用紧凑摘要展示，点击统一打开文章设置抽屉；不常驻挤压正文。

### 保存、预览与发布

- 正文修改后保存本地恢复副本；显式保存仍写入真实 Markdown。
- 分屏预览在 Studio 内常驻 iframe，可切换桌面/手机画布并刷新。
- “检查并发布”打开单一侧板，显示：文章信息、分类标签、标题层级、预览生成、影响页面与静态部署边界。
- 发布只同步 `draft: false`、`homepageState: 已发布` 和日期，不自动 Commit、Push、SSH、rsync 或部署。

### 本机运行时

- Studio 默认从 4310 起寻找可用端口，避免 QQ 等程序占用后直接启动失败。
- 优先复用同仓库已有且可访问的 Astro dev server；否则选择可用端口启动新的 Astro dev server。
- Studio API 返回实际 `previewOrigin`，CSP 只允许该预览源进入 iframe。
- 继续只绑定 `127.0.0.1`，保留同源 Cookie、Origin 校验、固定 verify 命令与生产隔离检查。

## 修改范围

- `tools/blog-studio/index.html`
- `tools/blog-studio/studio.css`
- `tools/blog-studio/studio.js`
- `scripts/blog-studio.mjs`
- `scripts/lib/blog-studio-server.mjs`
- `scripts/lib/blog-studio-runtime.mjs`（新增）
- `tests/blog-studio/server.test.mjs`
- `tests/blog-studio/runtime.test.mjs`（新增）
- `tests/blog-studio/ui.test.mjs`（新增）
- `docs/content-guide.md`
- `docs/design-guide.md`
- 本计划文件

## 不修改范围

- 不改变 Content Collections schema、公开路由、正式域名、RSS、sitemap 或 Nginx。
- 不增加数据库、线上 CMS、React/Vue/Svelte、富文本运行时或新依赖。
- 不自动提交、推送或部署。
- 不修改现有文章内容、项目内容、首页、Heart Island 和全站背景。

## 实施步骤

1. 先添加运行时和 UI 结构失败测试，确认端口回退、预览源注入、简化字段和双模式契约会失败。
2. 实现动态端口、已有 Astro dev server 复用与动态 CSP/previewOrigin。
3. 重构 Studio HTML/CSS 为文章库 + 编辑器 + 可切换预览 + 设置抽屉 + 发布检查侧板。
4. 重构浏览器脚本，保持文章 CRUD、封面、验证、快捷键和 MDX 只读能力；增加双模式、设备预览、恢复副本和派生字段。
5. 更新维护文档，删除对旧固定三栏与固定端口的描述。
6. 运行 focused tests、ESLint、Astro check、build、结构契约、Studio 隔离检查和 `git diff --check`。
7. 真实启动 Studio，检查浅/深主题、专注/分屏、桌面/手机预览、设置抽屉、草稿筛选、发布检查、键盘和控制台。
8. 使用 fresh Agent 独立审查安全、内容写入、运行时、交互和测试证据；修复确认问题后复验。

## 验收标准

- `node --test tests/blog-studio/*.test.mjs` 全部通过，新增行为均有先失败后转绿证据。
- 4310 被占用时 Studio 能自动使用下一可用端口，并打印真实地址。
- 已有 Astro dev server 可复用；没有时能启动本机预览，iframe 使用真实 origin。
- 专注写作和边写边看两种模式均可使用，选择能在本机记住。
- Category/Tags/封面等设置不常驻挤压正文；`order`、`homepageState`、手填阅读时间不再出现在日常界面。
- 桌面与手机预览状态明显不同，长中文标题不截断、不产生孤立末尾字符。
- 草稿、新建、保存、封面上传、预览、验证和发布状态转换保持可用。
- 代表性桌面/平板/移动布局无横向溢出，双主题可读，控制台无新增错误。
- `node scripts/verify.mjs` 完整通过，`dist/` 不含 Studio、Admin、写 API 或 Markdown 源文件。

## 风险与控制

- **重写 UI 导致旧功能丢失**：保留现有 DOM/API 行为契约并增加 UI 结构测试；逐项实测文章读写和发布。
- **自动保存频繁触发 Astro**：恢复副本只写浏览器本地存储；真实 Markdown 仍由显式保存写入。
- **复用错误的 Astro 服务**：只接受当前仓库 `.astro/dev.json` 中的 loopback URL，并在使用前探测可访问性。
- **端口回退扩大攻击面**：所有候选端口仍只绑定 `127.0.0.1`，不监听局域网。
- **视觉过度工具化**：以边写边看为默认，但保留一键专注写作；发布检查只出现一次，不强制逐步向导。

## 完成证据

- 正式 Studio 已实测专注写作、边写边看、真实 Astro 桌面/手机预览、双主题、设置抽屉、标签建议与发布检查通过/阻断状态。
- 本机 4310 被占用时，启动器实际回退到可用 loopback 端口，并复用 `http://localhost:4321`；退出时不误杀复用服务，启动失败会清理自己创建的 Astro 子进程。
- Studio 左上角复用 `src/assets/images/profile/galilieo-avatar.webp`，通过白名单本机静态路由提供，不复制头像素材且不进入生产产物。
- 2026-07-17 最终统一验证通过：Astro Check 74 文件 0 errors / 0 warnings / 0 hints，Astro Build 20 页，Studio 46/46，生产隔离与 `git diff --check` 通过。
- Fresh 独立审查结论：0 安全问题、0 逻辑错误；本地安全边界、Frontmatter 保真、动态端口/进程清理、Tags 渐进增强和文档一致性符合规格。
