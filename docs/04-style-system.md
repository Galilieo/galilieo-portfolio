# 04｜样式系统

## 设计变量

`src/styles/tokens.css` 保存全局 CSS Variables，包括：

- 浅色/深色主题颜色
- 字体族
- 页面最大宽度
- 缓动函数
- 岛屿场景和联系区颜色
- 区块垂直间距

修改颜色时优先修改变量，不要在组件末尾继续添加覆盖补丁。

## 文件职责

- `reset.css`：box-sizing、body、链接和表单元素基础规则
- `typography.css`：品牌、Hero 和首页关键文字样式
- `global.css`：Header、首页区块、卡片和响应式规则
- `animations.css`：Reveal、岛屿关键帧和 reduced motion
- `utilities.css`：skip link、focus-visible
- `content.css`：项目页、文章页和 Markdown 正文

导入顺序定义在 `BaseLayout.astro`。随意改变顺序可能改变 CSS cascade。

## 全局样式与 scoped style

现有首页为了视觉迁移一致，继续使用全局 class。新组件如果规则只属于该组件，可以在 `.astro` 文件中添加 `<style>`；Astro 会自动作用域化。

不要为了“组件化”把现有全局选择器一次性全部改成 scoped，这可能改变优先级和截图结果。

## 响应式

现有主要断点：

- 1180px
- 920px
- 680px
- 580px

修改断点前需要检查 1440×1000、1024×768 和 390×844。`body` 设置 `overflow-x: hidden`，但这不能代替定位真实溢出来源。

## 修改字体

字体链接在 `BaseLayout.astro`，字体变量在 `tokens.css`：

- `--display`
- `--serif`
- `--sans`
- `--mono`

更换字体会影响换行和布局，必须重新截图验证。

## 动画降级

`animations.css` 中的 `prefers-reduced-motion` 会关闭持续动画和长过渡；`reveal.ts` 和 `island-effects.ts` 也会在脚本层降级。两层都要保留。
