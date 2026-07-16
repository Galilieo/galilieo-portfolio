# 部署指南

本站由 Astro 生成静态文件，Nginx 只负责提供 `dist/` 内容，不运行 Node.js 应用服务。

## 环境要求

- Node.js 22.12+（当前 Astro 7 依赖要求）
- pnpm 11.11.0（见 `package.json#packageManager`）
- 构建机可安装 lockfile 中依赖；服务器只需要 Nginx 和静态文件

```bash
node --version
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

本地首次开发也可使用 `pnpm install`；发布构建优先 `--frozen-lockfile`，避免部署时悄悄改动依赖解析。

## 构建与本地检查

```bash
pnpm run verify
pnpm run preview
```

构建成功后产物位于 `dist/`。只发布该目录的内容，不上传源码、`node_modules`、`.env` 或本地工具文件。`preview` 默认用于本地抽查，不是生产服务器。

### 本地博客 Studio 不参与部署

`pnpm run studio`（或 `node scripts/blog-studio.mjs`）只供个人电脑写作：Studio 监听 `127.0.0.1`，修改 `src/content/blog/` 并调用本地 Astro 预览。不得把 `tools/blog-studio/`、`scripts/blog-studio.mjs`、Markdown 源文件、开发 Cookie 或本地写 API 上传到服务器。

统一验证包含生产隔离检查；`dist/` 中出现 `/studio`、`/admin`、写接口或 Markdown 源文件时应阻止发布。线上仍只有 Nginx 可读静态文件，访问 `/studio` 或 `/admin` 必须返回 404。

## 发布到 Nginx

仓库提供 `nginx.conf.example`。部署前在服务器副本中核对 `server_name`、`root`、Nginx 用户和证书路径，不要把密码、Token 或私钥写回仓库。

一种简单发布方式：

```bash
rsync -av --delete dist/ user@server:/var/www/galilieo-portfolio/
ssh user@server 'sudo nginx -t && sudo systemctl reload nginx'
```

`--delete` 会让目标目录与 `dist/` 一致；执行前确认目标路径正确并已保留上一版本。也可以上传到带时间戳的 release 目录，再切换只读软链接，降低误覆盖风险。

Nginx 必须按静态多页面查找真实文件或目录：

```nginx
location / {
    try_files $uri $uri/ =404;
}

error_page 404 /404.html;
```

不要配置 `try_files $uri /index.html`。那是 SPA fallback，会把不存在的 URL 错误地返回首页并破坏真实 404。

## 域名与 HTTPS

当前站点 URL 同时出现在：

- `astro.config.mjs`
- `src/config/site.ts`
- `public/robots.txt`
- `nginx.conf.example`

域名变更必须由用户明确要求，并同步检查 canonical、Open Graph、RSS、sitemap、robots、Nginx `server_name` 和证书。DNS 至少配置指向服务器的 A 记录；使用 IPv6 时再配置 AAAA。

HTTPS 可由现有证书管理方案或 Certbot 配置。不要在文档中保存账户凭据或私钥。签发/续期后检查 HTTP 到 HTTPS 的跳转、证书域名、有效期和自动续期。

## 发布后检查

至少检查：

1. 首页 `/`，以及桌面和移动端导航。
2. `/projects/`、一个项目详情、`/notes/`、一个公开文章详情。
3. `/rss.xml`、`/sitemap-index.xml`、`/robots.txt`。
4. 一个不存在的路径返回 404 页面和正确 HTTP 状态。
5. CSS、JavaScript、SVG、图片字体没有 404 或 MIME 错误。
6. 浅色/深色切换、刷新后的主题、Reduced Motion 和关键外链。

可做基础响应检查：

```bash
curl -I https://galilieo.heart-island.cn/
curl -I https://galilieo.heart-island.cn/rss.xml
curl -I https://galilieo.heart-island.cn/not-a-real-page
```

## 简单回滚

发布前保留上一份完整静态产物，例如：

```text
/var/www/releases/2026-07-11-1200/
/var/www/releases/2026-07-10-1800/
```

若使用 `current` 软链接，回滚时把它切换到上一目录，执行 `nginx -t` 后 reload；若直接同步目录，则把备份的上一版静态文件恢复到站点 root。本站无数据库迁移，回滚只涉及静态文件，但仍要重新检查首页、资源和 404。

## 常见问题

- **安装失败或版本不支持**：核对 Node.js 是否至少 22.12、pnpm 是否为 11.11.0。
- **build 因内容报错**：按 `src/content.config.ts` 检查必填字段、日期格式、URL、布尔值和 `order`。
- **文章没有生成**：确认 `draft: false` 且填写 `publishedAt`。
- **线上能打开 Studio/Admin**：立即停止发布并检查上传源是否误用了仓库根目录；生产只能同步 `dist/`，正常构建不包含本地 Studio。
- **刷新详情页得到首页**：移除 SPA fallback，使用 `$uri $uri/ =404`。
- **真实详情页 404**：确认上传时保留 Astro `directory` 构建的目录与其中 `index.html`。
- **样式或脚本仍是旧版**：检查 CDN/浏览器缓存策略与上传结果；不要只重载 Nginx 来代替更新文件。
- **RSS 或 canonical 域名错误**：同步检查四处站点 URL 配置后重新构建。
- **资源 404 或 MIME 错误**：核对 Nginx root、静态文件是否完整、`mime.types` 与示例中的额外类型。
