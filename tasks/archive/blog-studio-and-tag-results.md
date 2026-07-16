# 本地博客 Studio 与 Tags 结果流

- 状态：已完成（后续 Studio 交互与动态端口由 `blog-studio-writing-publish-redesign.md` 继续演进）
- 日期：2026-07-15
- 负责人：Hermes（方案、整合、视觉验收），DeepSeek V4-Pro（冻结范围内实现与独立审查）

## 目标

1. 为 Galilieo Atlas 增加一个只在个人电脑运行的本地博客写作后台，直接读写 `src/content/blog/*.md`，保持生产站点为 Astro 静态构建与 Nginx 托管。
2. 修正博客 Tags 模式的内容语义：选择 Tags 或具体 Tag 后，右侧显示统一 Tag 结果流，而不是继续显示 Category 标题。
3. 保留当前 Editorial Atlas、双列图片卡、Category 主目录、无 JavaScript 回退和双主题视觉。

## 已冻结方案

### 本地 Galilieo Studio

- 正式实现使用项目自有的轻量 Node HTTP 服务和原生 HTML/CSS/JavaScript，不引入数据库、CMS SaaS、React、Svelte 或线上写入 API。
- `pnpm run studio`（Git Bash shim 异常时使用 `node scripts/blog-studio.mjs`）同时启动：
  - Studio：`http://127.0.0.1:4310`
  - Astro 开发预览：`http://127.0.0.1:4321`
- Studio 只绑定 `127.0.0.1`，写请求要求同源、HttpOnly `SameSite=Strict` 会话 Cookie；不提供 CORS，不监听局域网地址。
- Studio 文件放在 `tools/blog-studio/`，服务和解析逻辑放在 `scripts/`；这些文件不进入 `dist/`。
- 生产构建不得生成 `/studio`、`/admin`、本地 API、Markdown 源文件或密钥。新增隔离检查并接入统一验证。
- 不自动 Commit、Push、SSH、rsync 或部署；“发布”只更新 Markdown 元数据并允许运行本地 `verify`。
- 只创建和编辑 `.md`；若未来出现 `.mdx`，列表中标记为只读，不由 Studio 改写。
- 不提供删除和批量重命名接口，避免误删内容。

### Studio 信息架构

- 左栏：文章搜索、全部/草稿/已发布筛选、文章状态与新建入口。
- 中栏：标题、Markdown 正文、常用 Markdown 插入工具、未保存状态、字数/行数。
- 右栏：Slug、Description、Category、Tags、封面、发布日期、阅读时间、排序、精选与草稿状态。
- 预览：保存后在 Studio 内 iframe 打开真实 Astro 文章页面；开发环境允许直接渲染草稿，生产构建继续排除草稿。
- 操作：保存草稿、发布、上传封面、刷新真实预览、运行完整验证。
- 封面：接收常见图片格式，使用现有 `sharp` 校验方向和尺寸，最长边压缩到 1600px、输出 WebP；写入 `src/assets/images/blog/<slug>/cover.webp`，不裁切原图。

### 内容与安全约束

- Slug 仅允许小写英文、数字和连字符，拒绝路径穿越、绝对路径和重复文件。
- 写入采用同目录临时文件加原子替换。
- 新文章默认 `draft: true`、`featured: false`、`homepageState: 草稿`，`order` 使用当前最大值加一。
- 发布要求 `publishedAt`，并将 `draft`/`homepageState` 同步为 `false`/`已发布`。
- 校验 title、description、category、tags、readingTime、order、日期格式和重复 order；`src/content.config.ts` 仍是最终 schema 真相，Studio 校验只是提前反馈。
- 请求正文和封面均设置明确大小限制；固定验证命令，不接受任意 shell 输入。

### Tags 统一结果流

- Category 模式：继续显示按 Category 分组的服务端内容与真实 hash。
- Tags 模式：右侧切换为独立统一结果区，不再显示 Category 分组标题。
- 未选择具体 Tag 时显示：`TAG INDEX / 全部文章 / 08 ARTICLES`（数量以真实数据为准）。
- 选择 `Ionic` 时显示：`TAG / Ionic / 03 ARTICLES`。
- 一个 Tag 跨多个 Category 时，所有匹配文章按发布日期统一排序；卡片内部仍显示文章真实 Category 和 Tags。
- 服务端继续输出 Category 主内容；Tag 结果作为渐进增强区域，禁用 JavaScript 时不重复显示内容。
- 切回 Category 时清理 Tag 筛选、恢复全部 Category 和计数；Astro 页面往返后不保留重复监听或临时状态。

## 不修改范围

- 不改变 Content Collections schema、公开路由、RSS、sitemap、canonical、Nginx 或正式域名。
- 不改变首页两行仪表盘、项目页、归档页、关于页、Heart Island 素材和全站背景。
- 不修改或删除当前未提交的 `src/content/blog/capacitor-android-media-save-debugging.md` 与归档页样式修复。
- 不自动提交、推送或部署。

## 实施步骤

1. 为 frontmatter 解析、序列化、校验、Slug 安全、原子保存和 Studio API 写 Node `node:test` 失败测试。
2. 实现 `scripts/lib/blog-frontmatter.mjs` 与 `scripts/lib/blog-studio-server.mjs`，使测试转绿。
3. 实现 `scripts/blog-studio.mjs` 启动器、固定验证执行、Astro 子进程清理与本地安全边界。
4. 实现 `tools/blog-studio/index.html`、`studio.css`、`studio.js`，完成文章库、编辑器、元数据、封面、预览和验证结果界面。
5. 调整 `src/pages/notes/[...slug].astro`：开发环境可预览草稿，生产构建仍只生成公开文章。
6. 先扩展 `scripts/check-blog-navigation.mjs` 形成失败契约，再实现 Tag 统一结果区、脚本状态和样式。
7. 新增 Studio 生产隔离检查，接入 `package.json` 与 `scripts/verify.mjs`。
8. 更新 `docs/content-guide.md`、`docs/design-guide.md`、`docs/deployment.md` 与根 `AGENTS.md` 的真实维护入口。
9. 运行单元测试、ESLint、Astro Check、Build、结构契约和 `git diff --check`。
10. 启动真实 Studio 与 Astro 预览，创建临时测试草稿完成保存/预览/封面/发布校验后清理测试文件；检查不修改真实文章。
11. 浏览器检查 1440×1000、1024×768、390×844，浅色/深色、Category/Tags、跨 Category Tag、键盘、Reduced Motion、无 JavaScript、页面往返和控制台。
12. 使用 fresh Agent 独立审查 Diff、安全边界、内容完整性和测试证据；修复确认问题并复验。

## 验收标准

- `node --test tests/blog-studio/*.test.mjs` 全部通过，且关键测试曾在实现前因缺失功能按预期失败。
- `node scripts/verify.mjs` 完整通过；`git diff --check` 无错误。
- Studio 仅监听 `127.0.0.1`，写 API 具备 Cookie/Origin 校验，无任意路径、任意命令和删除接口。
- 新建草稿、读取、修改、保存、封面上传、真实预览和发布前校验均在临时 fixture 或临时草稿中实测。
- `dist/` 不包含 Studio、Admin、写 API、Markdown 源文件或开发 Cookie/Token。
- Category 模式保持现有分组；Tags 模式右侧语义、标题、计数和统一排序正确。
- `/blog/` 与 `/notes/` 行为一致；无 JavaScript 时公开文章只输出一次且全部可访问。
- 桌面、平板、移动端无横向溢出；双主题可读；键盘焦点可见；控制台无新增错误。

## 风险与控制

- **frontmatter 被重写损坏**：仅支持明确字段子集，解析未知/不支持结构时拒绝写入；测试往返一致性，写入使用原子替换。
- **草稿误发布**：生产构建仍按 `draft` 过滤；隔离检查验证测试草稿不进入 `dist/`。
- **本地写 API 被滥用**：只绑定 loopback、SameSite Cookie、同源校验、请求大小限制、固定命令。
- **Tag 内容重复**：Tag 结果区默认隐藏并只由 JavaScript 激活；无 JavaScript 保留唯一 Category 内容流。
- **重复卡片影响图片与 Reveal**：只在当前视图暴露一套卡片，检查隐藏状态、懒加载、Observer 和页面切换清理。
- **工作区已有改动被覆盖**：所有实现限制在计划文件范围，交付前逐项核对 `git status` 和 Diff。

## 完成证据

- 本地 Studio、Tags 统一结果流、草稿开发预览与生产隔离已实现。
- 后续重构将固定三栏改为专注写作/边写边看双模式，并将固定端口改为动态 loopback 端口；当前维护说明以 `docs/content-guide.md` 和 `docs/design-guide.md` 为准。
- 2026-07-17 最终统一验证通过 ESLint、Astro Check、Astro Build、博客/首页结构契约、46 项 Studio 测试与生产隔离检查。