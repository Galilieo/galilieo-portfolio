# 项目工程化基线整理

- **状态：** Completed — 统一验证、Node 版本约束、EditorConfig 与 GitHub CI 已落地
- **目标：** 在不改变站点功能、视觉与部署架构的前提下，统一本地与 CI 的质量入口，固定开发环境约束，并让维护说明与真实验证链路一致。

## 范围

- 统一 Node 测试入口，并保留音乐与 Studio 的定向测试命令
- 将 Prettier 只读检查接入 `verify`，但排除文章正文、隔离原型和历史任务
- 增加 Node 版本提示、EditorConfig 与 GitHub Actions 验证工作流
- 修正 README、Agent 入口与部署指南中的验证说明
- 格式化当前不符合既有 Prettier 配置的受管文件

## 不修改范围

- 页面布局、视觉 token、响应式与浏览器交互
- Content Collections schema、项目/文章事实与个人信息
- 依赖版本、lockfile、正式域名与 Nginx 配置
- 当前工作区已有的音乐播放功能改动
- 自动提交、推送、创建 PR 或部署

## 步骤

1. 记录现状基线并确认已有未提交改动。
2. 收口 package scripts 与 `scripts/verify.mjs` 的验证入口。
3. 增加本地编辑约束、Node 版本文件和只读 CI。
4. 同步 README、AGENTS 与部署说明。
5. 运行格式检查、完整 `verify` 和 `git diff --check`。
6. 完成后将本计划移入 `tasks/archive/`。

## 验收

- `node scripts/verify.mjs` 一次完成格式、lint、Astro check、build、结构契约、全部 Node 测试和 Studio 生产隔离检查。
- `node --test` 自动发现音乐与 Studio 测试，定向脚本仍可单独运行。
- CI 使用 lockfile 冻结安装，并调用与本地相同的 `verify`。
- 无业务、视觉、依赖或部署状态变化。
- `git diff --check` 通过。

## 命令

```bash
node scripts/verify.mjs
git diff --check
```

## 结果

- 完整 `verify` 通过：Prettier、ESLint、Astro check、20 个静态页面构建、博客/首页结构契约、80 个 Node 测试和 Studio 隔离检查全部成功。
- 本地预览抽查通过：首页、项目列表、Heart Island 详情、文章列表、文章详情、RSS 与 sitemap 返回 200；不存在路径返回 404。
- `dist/` 必需产物齐全，未检出 Studio、Admin、Markdown 源文件或本地写接口泄漏。
- lockfile 未变化，未修改依赖版本、业务功能、视觉或生产配置。

## 风险

- 当前工作区已有音乐播放相关未提交修改；本任务只在共享验证文件中做兼容式合并，不覆盖其实现。
- 格式检查只覆盖可执行源码与维护文档，文章正文、隔离原型和历史任务不作为发布阻塞项。
- Windows PowerShell 可能阻止 `pnpm.ps1`；统一验证脚本继续通过 `cmd.exe` 调用 pnpm。
