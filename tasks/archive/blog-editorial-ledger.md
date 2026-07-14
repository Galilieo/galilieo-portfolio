# 博客 Editorial Ledger 实施

- 状态：已完成并通过 `pnpm run verify`

## 目标

将已审批的方案 A 作为主体，并吸收方案 C 的索引秩序与紧凑元信息，重构博客首页 Category / Tag 浏览体验。

## 范围

- 博客首页左侧 Category / Tags 双视图目录。
- 保留双列图片文章卡，同分类文章在现有三张场景图之间克制轮换。
- Tag 渐进增强筛选、筛选计数和清除状态。
- 桌面、平板、移动端与无 JavaScript 状态。
- 更新对应设计与内容维护说明。

## 不修改范围

- 文章详情页阅读目录结构。
- Header、全站背景、项目页和首页本轮既有改动。
- Content Collection schema 与文章正文。

## 步骤

1. 增加 Tag 聚合数据和博客专用目录组件。
2. 重组 Category 内容区并减少同封面重复。
3. 增加筛选脚本并接入 `main.ts` 清理生命周期。
4. 实现双主题与响应式样式，保留无 JavaScript 可读性。
5. 浏览器检查 Category、Tag、键盘、移动端和无 JavaScript。
6. 用户视觉确认后运行正式验证并归档计划。

## 完成记录

- Category / Tags 双视图、双列图片文章卡与渐进增强筛选已完成。
- 无 JavaScript 内容回退、脚本清理与响应式规则已实现。
- `pnpm run verify` 已完整通过。

## 验收

- Category 和 Tag 层级不同且均可发现。
- Tag 筛选只隐藏不匹配文章，空分类同步隐藏，并可一键恢复全部文章。
- 每篇文章保留图片卡，同分类不连续重复同一场景图。
- 390px 无横向溢出；隐藏面板不可被键盘聚焦。
- 无 JavaScript 时所有公开文章仍可访问。

## 命令

```bash
cmd.exe /d /s /c "pnpm run verify"
```

## 风险

- Tag 筛选与 Category 滚动激活态互相竞争；切换到 Tags 时暂停 Category 观察，恢复目录时重新计算。
- Astro 页面切换必须清理所有事件监听与临时 `hidden` / ARIA 状态。
