# 项目深化与一致性整理

- **状态：** Completed
- **目标：** 在不改变现有视觉、公开内容和部署模型的前提下，整理文档事实、公开文章规则、首页实时数据、音乐快照和生成产物检查，提高 Locality、Leverage 与测试覆盖。

## 完成范围

- 新增根目录 `CONTEXT.md`，统一 Public Article、Draft Article、Home Live Data、Music Snapshot、Site Contract 与 Galilieo Studio 的项目词汇。
- 修正首页和内页设计文档中过期的实时数据、音乐播放器、归档 Tabs 与实施状态描述。
- RSS、归档、首页文章统计和生产文章详情路径统一复用 `getPublishedBlogArticles()`；开发环境草稿预览保持不变。
- 保持 `initHomeLiveData()` 单一外部 Interface，将 GitHub Public Events 与环境天气分别深化为内部 Module。
- GitHub 统计只计算最近 30 个上海日历日；30 分钟、24 小时和 15 分钟缓存 TTL 保持不变。
- 新增纯 `Music Snapshot` Module，CLI Adapter 继续负责网络、音频探测和文件写入；未运行真实同步，也未覆盖现有 `src/data/music.ts`。
- 三个生成产物检查迁移到窄 runner，只统一 dist 上下文、异常转换、失败汇总和退出协议，未新增断言 DSL 或 HTML 框架。
- README、AGENTS、内容、设计和部署指南已同步新的职责入口。

## 保持不变

- 页面布局、CSS、主题、Heart Island、动画、响应式断点和视觉素材。
- 博客正文、项目事实、正式域名、网易云歌单内容、依赖和 lockfile。
- Galilieo Studio 浏览器脚本未拆分，现有生产隔离继续保留。
- 未提交、推送、创建 PR 或部署。

## TDD 记录

- Public Article：契约测试先因四个生产调用者绕过共享 Module 而失败，迁移后通过。
- Home Live Data：测试先因 GitHub 与环境天气 Module 不存在而失败，最小实现后通过。
- Music Snapshot：测试先因纯快照 Module 不存在而失败，抽离转换和渲染后通过。
- Site Contract runner：测试先因 runner 不存在而失败，实现缺失 dist、稳定错误顺序、异常转换和成功输出后通过。

## 验收结果

- `node scripts/verify.mjs`：9 个阶段全部通过。
- Prettier、ESLint：通过。
- Astro Check：87 个文件，0 errors、0 warnings、0 hints。
- Astro Build：20 个页面。
- Node tests：97/97 通过。
- Site、Blog、Home 与 Studio isolation 契约：全部通过。
- `git diff --check`：通过。
- 静态产物：主页、About、Projects、Notes、404、RSS 与 sitemap 均存在；RSS、sitemap、robots 返回 200，未知路径返回真实 404。
- 浏览器：1440×1000 与 390×844 的首页、项目、详情、博客、文章和 404 均无横向溢出；canonical、description、Open Graph、公共外壳正确。
- 交互：键盘首焦点、深色切换及刷新持久化、移动菜单和 Escape 焦点回归通过。
- Reduced Motion：匹配成功，Reveal 无隐藏内容，横向溢出为 0。
- 无 JavaScript：首页与文章正文、静态导航、Reveal 回退可读，横向溢出为 0。
- 外部网络失败：GitHub 显示 Offline，环境使用 Shanghai fallback，天气显示不可用；页面错误和本地资源失败均为 0。

## 风险与后续边界

- GitHub Public Events 仍是最多 100 条的公开有界数据源，不能表述为年度 Contributions。
- 真实网易云同步依赖外部接口，后续执行前仍应确认不会覆盖手工未提交的 `music.ts` 改动。
- Studio 大脚本只有在先补真实浏览器烟雾测试后才适合独立整理，本轮不继续扩张。
