# 站点外壳与身份统一

- **状态：** Completed
- **目标：** 深化现有 `BaseLayout` Module，将全站公共外壳和站点身份不变量集中到少数 Interface，减少页面与静态 Adapter 之间的同步点。

## 完成范围

- skip link、`SiteHeader`、`SiteFooter` 已集中到 `BaseLayout` 的 Implementation。
- 页面与详情 Layout 已移除重复的公共外壳导入和标记。
- Astro 配置、详情页 JSON-LD、首页无障碍名称与结构检查已复用 `siteConfig`。
- 新增 `scripts/check-site-contracts.mjs`，检查 robots、Nginx、构建 canonical、RSS、sitemap 与公共外壳。
- 新契约已通过 `check:site` 接入统一 `verify`。
- `AGENTS.md`、README 和内容、设计、部署指南已同步职责说明。

## 保持不变

- 页面主体内容、信息层级、CSS、响应式断点和视觉 token。
- Header、Footer、心屿、音乐、Reveal 与客户端生命周期的行为。
- 正式域名的实际值、Nginx 行为、依赖和 lockfile。
- 未提交、推送、创建 PR 或部署。

## 验收结果

- `node scripts/verify.mjs`：9 个阶段全部通过；Astro 检查 79 个文件，构建 20 个页面，Node 测试 80 项全部通过。
- 站点契约：20 个公开 HTML 均恰好包含一个 skip link、Header、`main-content` 和 Footer，DOM 顺序正确。
- 站点身份：Astro `site`、JSON-LD、canonical、robots、Nginx、RSS 与 sitemap 均由契约校验为一致。
- 浏览器：桌面、平板、移动端的代表页面均为 200；浅色、深色、主题持久化、移动菜单、键盘首焦点和 Reduced Motion 通过。
- 无 JavaScript：移动首页和文章页在 CSS 完成加载后内容与公共外壳可用，横向溢出为 0。
- `git diff --check`：通过。

## 命令

```bash
node scripts/verify.mjs
git diff --check
```

## 说明

- 工作区原有音乐播放与上一轮工程化改动均保留；共享文件只做兼容式追加。
- 浏览器检查中的外部请求被主动拦截，控制台资源失败来自该验证策略，不是应用脚本错误；页面错误为 0。
