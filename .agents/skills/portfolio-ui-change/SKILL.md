---
name: portfolio-ui-change
description: Use when changing layout, Astro components, CSS, responsive behavior, themes, Reveal, SVG, Canvas, or the heart-island featured area in the Galilieo portfolio. Do not use for content-only edits or release-only checks.
version: 1.0.0
---

# Portfolio UI Change

## 适用场景

- 修改页面布局、组件结构或响应式行为。
- 修改 CSS token、主题、排版、卡片或正文样式。
- 修改 Reveal、移动菜单、客户端交互或 Astro 页面切换行为。
- 修改心屿重点展示区域、SVG 周边呈现或 Canvas 动效。

## 不适用场景

- 只改个人资料、项目或博客内容：使用 `portfolio-content`。
- 只做发布前检查：使用 `pre-release-check`。
- 没有明确视觉目标时，不使用本 Skill 主动重新设计页面。

## 必须读取

1. `AGENTS.md`
2. `docs/design-guide.md`
3. 目标页面和组件
4. `src/styles/tokens.css` 及实际负责该区域的样式文件
5. 涉及客户端行为时读取 `src/scripts/main.ts` 和目标模块
6. 涉及心屿时读取 `src/components/home/HeroVisual.astro`、`src/components/home/IslandArtwork.astro`、相关 CSS、`src/scripts/island-effects.ts` 和主体 SVG 的层级结构

先确认真实选择器、token、组件和生命周期，不根据截图猜代码。

## 执行步骤

1. **记录范围和不变量。** 明确要解决的视觉问题、允许修改的文件，以及不得改变的页面结构、岛屿、水纹和文案。
2. **调查现有实现。** 找到已有 token、断点、组件、动画和可复用模式，避免重复创建。
3. **建立基线。** 记录目标视口、主题、交互状态和控制台情况。心屿素材变更前先检查 SVG 几何与图层，而不是只看文件名。
4. **最小实现。** 优先修改语义 token、现有组件和现有样式；不增加无必要依赖或邻近断点。
5. **检查渐进增强。** 核心内容必须来自 HTML；浏览器脚本只增强主题、导航、Reveal 和 Canvas。
   - 博客 Tags 模式可以显示独立统一结果流，但无 JavaScript 时只保留一次完整 Category 主内容；Tag 结果标题必须使用 Tag 语义，不能继续显示 Category 名称。
6. **检查生命周期。** 修改客户端模块时确保：
   - 目标不存在时安全返回；
   - 初始化函数返回清理函数；
   - listener、MediaQuery、Observer、ResizeObserver 和 rAF 被释放；
   - `astro:before-swap` 后不会重复初始化；
   - Reduced Motion、页面隐藏和离屏状态能停止持续工作。
7. **运行自动验证。** 自动检查通过后再做浏览器检查。

## 必须运行的命令

```bash
pnpm run verify
pnpm run preview
```

若当前 Windows Git Bash 的 pnpm shim 不可用，验证可直接运行：

```bash
node scripts/verify.mjs
```

## 浏览器验证清单

至少检查与修改相关的项目：

- 首页和目标页面；
- 1440×1000、1024×768、390×844 代表视口；
- 浅色和深色主题；
- 主题刷新后是否保持；
- 键盘焦点和移动端菜单；
- `prefers-reduced-motion: reduce`；
- 控制台错误和横向溢出；
- Astro 页面往返后是否出现重复 Canvas、listener 或 Observer；
- 禁用 JavaScript 后的基础内容可读性。

Reveal 元素必须逐屏滚动触发后再截图。不要因为未滚动的全页截图显示空白就直接判定页面坏了，应结合 DOM class、滚动位置和控制台判断。

当前已通过 `html:not(.js) .reveal` 和移动端静态导航提供无 JavaScript 回退。修改 Reveal、Header 或样式导入时必须复查这个契约，不能只以构建通过代替浏览器验证。

## 心屿不可变边界

- 保留已批准的岛屿主体、轮廓比例、内部识别和水纹整体布局。
- 不重新加入心形图标。
- 不用 TypeScript 重画 SVG。
- 不在没有明确视觉批准时改变岛屿 path、粒子数量、动效语言或整体 layering。
- 不引入 GSAP、Three.js、Lottie 或新的 Canvas 库。

## 完成条件

- `pnpm run verify` 通过。
- 相关桌面、移动端、主题和 Reduced Motion 状态已实际检查。
- 浏览器控制台没有由本次修改引入的新错误。
- 没有任务外重构、重复样式或依赖变化。
- 所有未执行或未通过的视觉检查都已明确列出。

## 常见错误

- 在组件末尾追加覆盖而不使用现有 token。
- 通过 `overflow-x: hidden` 掩盖真实溢出。
- 只检查浅色或桌面视口。
- 只做 CSS 降级，忘记停止 Canvas rAF。
- 在 Astro 页面切换后重复绑定事件。
- 把构建通过等同于视觉通过。
- 仅凭自动截图替代用户对岛屿形状和层次的视觉批准。

## 禁止行为

- 不重新设计网站或改成通用 SaaS 模板。
- 不无理由升级依赖、换框架或大规模拆分 CSS。
- 不修改生成目录 `dist/`、`.astro/`。
- 不自动提交、推送、部署或修改生产配置。

## 输出格式

```text
UI 修改：<文件和可见行为>
保持不变：<明确的不变量>
自动验证：<命令和结果>
浏览器验证：<视口/主题/交互及结果>
未验证项：<必须明确>
剩余风险：<无则写“无”>
```
