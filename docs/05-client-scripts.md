# 05｜客户端 TypeScript

## 为什么脚本很少

Astro 页面默认是静态 HTML。只有以下功能需要浏览器执行：

- 明暗主题
- 移动端菜单
- Header 滚动态
- IntersectionObserver Reveal
- 当前导航区块
- 岛屿 Canvas 和指针响应

## 统一入口

`src/scripts/main.ts` 负责初始化，不包含具体业务算法。每个模块导出：

```ts
initSomething(): () => void
```

返回值是清理函数。

## 页面转场生命周期

启用 `ClientRouter` 后，页面可能不发生完整刷新：

- `astro:page-load`：新页面 DOM 可用，重新初始化
- `astro:before-swap`：旧页面移除前，清理监听器、Observer 和 rAF

`main.ts` 在每次初始化前也会执行旧清理函数，因此不会重复注册。

## 模块职责

### `theme.ts`

读取系统主题和 `localStorage`，更新 `data-theme`、按钮 ARIA 和 `theme-color`。主题变化时发送 `galilieo:theme-change`，让 Canvas 重画颜色。

### `navigation.ts`

处理菜单开关、Escape、点击外部、点击链接关闭和 Header 滚动态。清理时移除所有事件监听器。

### `reveal.ts`

用 IntersectionObserver 为 `.reveal` 添加 `.is-visible`。元素显示后停止观察。减少动态效果时直接显示。

### `active-section.ts`

首页根据阅读线更新导航；其他页面根据 pathname 更新。滚动事件只安排一个 `requestAnimationFrame`。

### `island-effects.ts`

完整保留原 Canvas 参数。负责 DPR、ResizeObserver、可见性、后台暂停、指针视差和 reduced motion。清理时停止 rAF 并断开 Observer。

## 避免重复初始化

新增脚本时：

1. 不要在模块顶层直接查询并绑定大量 DOM。
2. 导出 init 函数。
3. 元素不存在时返回空清理函数。
4. 记录每个监听器的函数引用。
5. 清理 Observer、媒体查询监听器和 rAF。
6. 在 `main.ts` 中注册。
