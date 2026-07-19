# 文章详情阅读页重构

- 状态：completed
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

## 验证记录

- `node scripts/verify.mjs` 通过全部 9 个阶段：Prettier、ESLint、Astro Check、静态构建、站点契约、博客导航契约、首页契约、Node 测试和 Studio 生产隔离。
- Astro Check 检查 89 个文件，结果为 0 errors、0 warnings、0 hints；构建生成 20 个页面和 41 个优化图片产物；Node 测试为 21 suites、101 tests、101 pass、0 fail。
- `git diff --check` 通过；候选分支在浏览器验收前保持干净。要求的 7 个主要产物全部存在，`dist/` 未发现 Studio/Admin、Markdown、`.env`、凭据或写接口。
- 本地 Astro Preview 使用 `127.0.0.1:4321`。首页、项目列表、Heart Island 项目、博客列表、两篇文章、RSS 和 sitemap 均返回 200；不存在路径返回真实 404。文章 canonical、Open Graph type、Article JSON-LD、9 条公开 RSS 文章、sitemap 和 robots 域名契约一致。
- 1440×1000 浅色/深色：优化封面位于标题上方且尺寸非零，返回博客链接稳定；4247 字长文、结尾和 9 个 H2/H3 均完整；桌面吸顶侧栏显示 3 条推荐并覆盖全部目录目标，滚动后更新 `aria-current="location"`；移动重复区隐藏，主题刷新后保持，无横向溢出。
- 1024×768：桌面侧栏隐藏，原生移动目录、正文和位于前后篇之后的 2 条推荐可见，无横向溢出。
- 390×844 浅色/深色：封面为 360×225、自然比例 1.6；移动目录和 2 条推荐可见，推荐目标高度为 55.6–74.2px；Hero 与推荐表面无 `backdrop-filter` 且背景不透明，无横向溢出。
- Reduced Motion：推荐 transition property 与 transform 均为 `none`，Hero 和全文可读。禁用 JavaScript 时 Hero、标题、全文、原生目录、文章导航、2 条推荐和普通返回链接均可见；正文没有 `reveal` class。最长文章位于排序边界，因此文章导航按数据只显示 1 条有效上一篇链接。
- 短文章推荐区完整且无空布局；Heart Island 项目正文 Reveal 后可见，原有顶部间距为 81.92px，未被文章选择器覆盖。桌面与平板键盘路径均覆盖稳定返回、可用的前后篇、可见推荐；平板额外覆盖原生目录 summary，隐藏的桌面/移动重复版本未进入焦点顺序。
- 代表性页面在桌面与移动端共 12 次路由扫描均无横向溢出；未发现 page error、同源失败请求或同源资源 404。受沙箱网络限制，Google Fonts、GitHub、IP/天气和网易云外部请求使用站点既有回退，不构成本次文章详情发布阻塞。

## 完成条件

- `node scripts/verify.mjs` 完整通过。
- 最长公开文章在桌面、平板、移动端、Reduced Motion 和无 JavaScript 下完整可读。
- 桌面显示 3 条推荐与吸顶目录，移动端在前后篇之后显示 2 条推荐。
- 任务记录已移入 `tasks/archive/`，无未解决阻塞项。
