# 归档双时间线、在校经历与 About 头像

- 状态：已完成并通过 `pnpm run verify`

## 目标

把已确认的方案 A 实施为生产版本：归档页在“博客笔记 / 个人轨迹”之间切换，两种内容都保持中央轴左右交替；个人轨迹链接到真实项目和新的在校经历页；About 移除重复时间线并展示真实头像；收柔过尖的标题字体。

## 范围

- `src/pages/archive/index.astro`：双视图时间线与真实统计。
- `src/data/personal-timeline.ts`：个人轨迹唯一数据源。
- `src/scripts/archive-timeline.ts`、`src/scripts/main.ts`：渐进增强 Tabs 与清理。
- `src/pages/campus.astro`：在校经历静态页，仅写已确认事实。
- `src/components/home/AboutSection.astro`：真实头像、移除时间线、增加归档/在校入口。
- `src/styles/interior.css`：归档、About、Campus、响应式与字体收柔。
- `docs/content-guide.md`、`docs/interior-pages-redesign.md`：维护入口和当前能力。

## 不修改范围

- 不修改项目或博客正文事实。
- 不新增课程、比赛、社团、奖项或证书等未经确认内容。
- 不修改首页仪表盘结构、心屿 SVG、背景图或生产部署。
- 不引入新框架、依赖或客户端运行时。

## 步骤

1. 建立个人轨迹数据源和 Archive 双视图服务端结构。
2. 接入原生 TypeScript Tabs，保留无 JavaScript 双时间线回退。
3. 新增在校经历页，未提供的校园内容不做占位伪装。
4. About 使用现有头像，删除重复时间线并调整内容入口。
5. 收敛 CSS：中央轴左右交替、青绿个人辅助色、柔和字重、桌面/平板/移动规则。
6. 删除隔离原型，更新文档。
7. 运行 `pnpm run verify`，再做浅/深色、Reduced Motion、无 JavaScript和 Astro 页面往返浏览器验证。

## 完成记录

- Archive 双视图、个人轨迹真实跳转、Campus 页面和 About 头像已完成。
- 临时 A/B/C 原型已删除，维护文档已同步。
- `pnpm run verify` 已完整通过；正式构建生成 `/campus/`。

## 验收

- Archive 默认显示博客时间线，Tabs 可用键盘切换，URL `?view=personal` 可直达个人轨迹。
- 无 JavaScript 时两套时间线均可读，按钮不伪装可交互。
- 个人轨迹三个入口分别到 AI Chat App、Heart Island 和 Campus。
- About 不再重复成长时间线，头像清晰、比例正确。
- Campus 只呈现已确认学习事实，不出现虚构校园成果。
- 390、1024、1440 视口无横向溢出，浅色与深色可读。
- `pnpm run verify` 完整通过。

## 风险

- 中央轴在窄屏必须降为左轴，否则卡片过窄。
- Tabs 在 View Transitions 往返时不得重复绑定。
- 个人辅助色只能做类型区分，不能破坏既定蓝灰主题。
