---
name: pre-release-check
description: Use when preparing to publish an article or project, after a large visual change, or after domain, SEO, routing, or deployment-related changes in the Galilieo portfolio. Check and report release readiness only; never deploy automatically.
version: 1.0.0
---

# Pre-release Check

## 适用场景

- 准备发布文章或项目。
- 大型视觉、主题、导航或心屿改动完成后。
- 修改域名、canonical、SEO、RSS、sitemap、路由或 Nginx 相关内容后。
- 用户要求“发布前检查”“是否可上线”或“完整验证”时。

## 不适用场景

- 日常小改动只需 `pnpm run verify` 时，不必运行完整发布清单。
- 本 Skill 不执行 rsync、SSH、Nginx reload、DNS、证书、部署或发布。

## 必须读取

1. `AGENTS.md`
2. `docs/deployment.md`
3. `package.json`：确认真实验证命令和依赖没有意外变化
4. `astro.config.mjs`：确认正式 `site`、静态输出、目录路由和 sitemap
5. `src/config/site.ts`：确认站点名称、URL、description、导航和外链
6. `src/layouts/BaseLayout.astro`：确认 title、description、canonical、社交元数据、JSON-LD 和主题入口
7. `src/pages/rss.xml.ts`：确认只输出应公开文章且 URL 正确
8. `public/robots.txt`：确认抓取规则和 sitemap 域名
9. 内容发布时读取 `docs/content-guide.md`
10. 视觉改动时读取 `docs/design-guide.md`

## 执行步骤

1. **确认发布范围。** 用 `git status` 和 `git diff` 列出本次候选改动，区分已有工作区改动与当前任务改动。
2. **运行统一验证。** 任一步失败立即将结果标记为 Blocked，不继续声称可发布。
3. **检查静态产物。** 确认主要路由、404、RSS 和 sitemap 已生成。
   - 同时确认 `dist/` 不包含 `/studio`、`/admin`、本地写 API、Markdown 源文件或开发凭据；这些内容出现时直接标记 Blocked。
4. **启动本地预览。** 只用于本地检查，不连接生产环境。
5. **检查主要用户路径。**
6. **检查 SEO 与链接。**
7. **执行视觉/可访问性抽查。**
8. **输出 Ready / Blocked 报告。** 不自动部署。

## 必须运行的命令

```bash
pnpm run verify
pnpm run preview
```

若当前 shell 无法直接调用 pnpm，可用：

```bash
node scripts/verify.mjs
```

构建后至少确认这些产物存在：

```text
dist/index.html
dist/about/index.html
dist/projects/index.html
dist/notes/index.html
dist/404.html
dist/rss.xml
dist/sitemap-index.xml
```

## 路由与内容检查

本地预览至少覆盖：

- `/`
- `/projects/`
- 一个项目详情页
- `/notes/`
- 一个公开博客正文
- `/rss.xml`
- `/sitemap-index.xml`
- 一个不存在的路径，必须返回真实 404

检查项目重点展示、导航、移动菜单和关键外链。逐项确认站内链接指向真实路由，图片、SVG、字体和脚本路径没有 404 或错误 MIME。不得存在依赖 `try_files $uri /index.html` 的 SPA fallback 行为。

## SEO 检查

- 页面标题和 description 与内容一致；
- canonical 使用正式站点 URL 和正确路径；
- Open Graph/Twitter 基础元数据存在；
- 文章/项目 JSON-LD 与页面类型一致；
- RSS 只包含应公开的文章；
- sitemap 和 `robots.txt` 指向正确域名；
- 域名变化同步检查 Astro、site config、robots 和 Nginx 示例，但只有用户明确要求时才能修改域名。

## 浏览器检查

- 首页、项目列表、重点项目、博客列表、博客正文和 404；
- 桌面与 390px 级移动视口；
- 浅色、深色及刷新后的主题；
- 移动端菜单和键盘焦点；
- Reduced Motion；
- 心屿 SVG、CSS 动画与指针效果；
- 浏览器控制台和资源 404；
- 无 JavaScript 时基础内容和导航可读性。

如果某项受工具限制无法执行，必须列为“未验证”。当前无 JavaScript 回退已实现，但发布前仍必须检查 Reveal 内容、静态导航和主要链接可读。

## 完成条件

只有同时满足以下条件才可标记 `Ready`：

- lint、Astro check、build 全部通过；
- 主要产物和路由存在；
- 404、RSS、sitemap、canonical 和内部链接无阻塞问题；
- 与变更相关的桌面、移动端、主题和 Reduced Motion 已检查；
- 没有意外依赖升级、敏感文件或任务外修改；
- 本地 Galilieo Studio、写接口和草稿源文件没有进入生产产物；
- 所有未验证项已列出且不构成发布阻塞。

任一必要项失败则标记 `Blocked`。

## 常见错误

- build 成功就直接判断可发布。
- 只打开首页，不检查详情、RSS、sitemap 和 404。
- 不区分草稿、公开文章和首页选题状态。
- 把浏览器未逐屏滚动导致的 Reveal 空白误判成产品故障。
- 忽略深色、移动端或 Reduced Motion。
- 在“检查”任务中顺手执行部署。

## 禁止行为

- 不执行部署、发布、rsync、SSH、Nginx reload、DNS 或证书操作。
- 不修改生产配置、密钥和正式域名。
- 不自动提交、推送、创建 PR 或合并。
- 不为通过检查而静默修改业务代码；发现问题只报告，修复需单独任务。

## 输出格式

```text
结论：Ready | Blocked
候选改动：<文件范围>
自动验证：<命令、退出结果>
路由/SEO：<结果>
浏览器验证：<结果>
阻塞问题：<无则写“无”>
未验证项：<无则写“无”>
人工发布步骤：未执行
```
