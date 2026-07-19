# 文章详情阅读页重构

- 状态：active
- 设计规格：`docs/superpowers/specs/2026-07-19-article-detail-reading-design.md`
- 实现计划：`docs/superpowers/plans/2026-07-19-article-detail-reading.md`

## 目标

为博客文章详情增加独立顶部封面、稳定返回入口、桌面 Recommended + 本文目录右栏，以及移动端页尾轻量推荐，并修复长文章整块 Reveal 可能永久隐藏的问题。

## 范围

- Astro 构建阶段的推荐排序与数量限制。
- 文章详情组件、布局、双主题和响应式样式。
- 生成产物契约、Node 测试和代表性浏览器验收。

## 不修改

- 项目详情、博客目录、Content Collections schema、RSS 和生产配置。
- 全站音乐播放器、首页两行仪表盘和 Heart Island 素材。
- XingHuiSama 的代码、图片、字体或精确视觉样式。

## 完成条件

- `node scripts/verify.mjs` 完整通过。
- 最长公开文章在桌面、平板、移动端、Reduced Motion 和无 JavaScript 下完整可读。
- 桌面显示 3 条推荐与吸顶目录，移动端在前后篇之后显示 2 条推荐。
- 任务记录移入 `tasks/archive/`。
