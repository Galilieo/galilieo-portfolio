# 06｜部署指南

## 本地构建

```bash
corepack enable
pnpm install
pnpm check
pnpm lint
pnpm build
pnpm preview
```

构建结果位于 `dist/`。部署的是这个目录的内容，不是源码和 `node_modules`。

## 上传服务器

示例：

```bash
rsync -av --delete dist/ user@server:/var/www/galilieo-portfolio/
```

服务器目录应能被 Nginx 用户读取：

```bash
sudo chown -R www-data:www-data /var/www/galilieo-portfolio
```

具体用户可能是 `nginx`，取决于系统。

## Nginx

1. 复制 `nginx.conf.example` 到站点配置目录。
2. 检查 `root` 和 `server_name`。
3. 测试配置：

```bash
sudo nginx -t
```

4. 重载：

```bash
sudo systemctl reload nginx
```

配置使用：

```nginx
try_files $uri $uri/ =404;
```

不要写：

```nginx
try_files $uri /index.html;
```

后者是 SPA fallback，会破坏 Astro 静态多页面的真实 404。

## DNS

在域名服务商为 `galilieo.heart-island.cn` 添加：

- A 记录 → 服务器 IPv4
- 如果使用 IPv6，再添加 AAAA 记录

DNS 生效后先验证 HTTP。

## HTTPS

可使用 Certbot：

```bash
sudo certbot --nginx -d galilieo.heart-island.cn
```

证书签发后测试：

```bash
curl -I https://galilieo.heart-island.cn
```

## 发布更新流程

1. 修改组件或 Markdown。
2. 执行 `pnpm check`、`pnpm lint`。
3. 本地执行 `pnpm build`、`pnpm preview`。
4. 检查首页、项目、文章、RSS、sitemap 和 404。
5. 上传新的 `dist/`。
6. 不需要重启 Java 或 Node 服务；必要时只重载 Nginx。

## 回滚

部署前保留上一版静态目录：

```text
/var/www/releases/2026-07-10/
```

通过软链接切换当前版本，可以快速回滚。静态部署不依赖数据库，因此回滚只涉及文件。
