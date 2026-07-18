# AGENTS.md

## 项目定位

Galilieo Atlas 是个人长期维护的 Astro 静态作品集与开发记录网站。它展示个人介绍、项目、实习经历与技术文章，并重点展示 heart-island 心屿。保持实现和文档轻量，不按企业系统扩张流程或架构。

技术栈：Astro、TypeScript、Content Collections、Markdown/MDX、原生 CSS、内联 SVG、少量浏览器 TypeScript、Nginx 静态部署。生产站没有数据库、CMS、用户系统或应用后端；本地 Galilieo Studio 只负责在个人电脑读写 Markdown，不进入线上产物。

## 重要位置

- `CONTEXT.md`：Public Article、Home Live Data、Music Snapshot、Site Contract 与 Studio 的项目词汇
- `src/config/site.ts`：站点身份、正式 URL、导航、联系方式与外链的唯一代码来源
- `src/content.config.ts`：项目和博客 schema
- `src/content/projects/`、`src/content/blog/`：内容源
- `src/pages/`：文件路由与 RSS
- `src/layouts/BaseLayout.astro`：全站公共外壳、SEO、Header/Footer 与全局控件
- `src/layouts/ArticleLayout.astro`、`src/layouts/ProjectLayout.astro`：文章与项目主体布局
- `src/components/`：首页、项目、博客与通用组件
- `src/components/home/`：首页固定文案和区块
- `src/components/home/HomeDashboard.astro`：当前首页两行仪表盘组合入口
- `src/styles/`：token、主题、页面、动画和正文样式
- `src/scripts/main.ts`：客户端初始化与清理入口
- `src/scripts/home-live-data.ts`：首页实时增强的单一初始化入口；GitHub 与环境天气 Implementation 分别位于相邻 Module
- `src/scripts/island-effects.ts`：心屿可见性、Reduced Motion 与轻量指针效果
- `src/assets/`：由 Astro/Vite 处理的图片和 SVG
- `public/`：需要稳定公开路径的静态资源
- `scripts/verify.mjs`：顺序执行格式、lint、Astro check、build、站点/结构契约、Node 测试和 Studio 生产隔离检查
- `scripts/check-site-contracts.mjs`：核对站点身份、静态 Adapter、canonical 与公共页面外壳
- `scripts/lib/generated-site-contract.mjs`：三个生成产物检查共用的执行、错误汇总和退出协议
- `scripts/lib/music-snapshot.mjs`：网易云响应到稳定静态 Music Snapshot 的纯转换
- `.github/workflows/verify.yml`：使用冻结 lockfile 调用同一 `verify` 的只读 CI
- `scripts/blog-studio.mjs`、`tools/blog-studio/`：仅绑定本机的博客写作后台与静态界面，不进入 `dist/`
- `tasks/active/`：正在执行的任务
- `tasks/backlog/`：等待事实、范围或用户决定的任务
- `tasks/archive/`：已完成或被新方案取代的历史任务
- `.agents/skills/`：项目本地 Agent 技能
- `sketches/`：隔离原型；`research/raw-web-captures/` 只保存本地研究缓存
- `src/assets/svg/island-reference-no-heart-vector.svg`：受保护的心屿主体素材
- `dist/`、`.astro/`：生成目录，只验证、不直接修改
- `docs/content-guide.md`：个人信息、项目、博客和 SEO 内容维护
- `docs/design-guide.md`：视觉、主题、响应式、心屿和客户端生命周期边界
- `docs/homepage-redesign.md`：已确认的首页目标、参考图、阶段计划和验收条件
- `docs/deployment.md`：静态构建、Nginx、发布前后检查和回滚

## 常用命令

```bash
pnpm run dev
pnpm run studio
pnpm run verify
pnpm run preview
```

`studio` 在个人电脑启动本地写作后台和 Astro 草稿预览，不是生产服务。`verify` 依次运行格式、lint、Astro check、build、结构契约、全部 Node 测试和 Studio 生产隔离检查；任一步失败即停止。Windows Git Bash 若无法直接调用 pnpm，可运行 `node scripts/blog-studio.mjs` 或 `node scripts/verify.mjs`。

## 项目 Skills

- 内容、个人信息、导航、项目或博客：`.agents/skills/portfolio-content/SKILL.md`
- 布局、CSS、主题、Reveal、SVG、浏览器动效或心屿：`.agents/skills/portfolio-ui-change/SKILL.md`
- 发布文章/项目或大型改动完成后的检查：`.agents/skills/pre-release-check/SKILL.md`

Codex 可从 `.agents/skills/` 自动发现；Hermes 未配置外部 Skill 目录时也应按以上路径读取对应 Skill。

## 修改原则

1. 修改前先阅读相关页面、组件、schema、样式或配置，不要猜测结构。
2. 保持 Astro 静态优先；新增项目或文章优先通过 Content Collections。
3. 个人资料优先修改 `src/config/site.ts`；首页固定文案按职责修改 `src/components/home/`。
   正式 URL 不得在 `src/`、构建配置或检查脚本中重复硬编码；robots 与 Nginx 示例由站点契约保持一致。
4. 只处理任务范围，不进行无关重构，不升级依赖。
5. 当前实现与未来计划分开写；不能确认的信息标记为“待确认”，不得编造项目能力、经历或数据。
6. 内容、配置或目录职责变化时，同步更新对应维护指南，避免在多份文档重复同一说明。
7. 浏览器 JavaScript 只做渐进增强，不把主要内容改成依赖客户端脚本渲染。
8. 复用现有组件、token 和样式，不重复创建等价实现，也不重新设计已确认的整体视觉。
9. 不直接修改 `dist/`、`.astro/`、`node_modules/` 等生成或依赖目录。
10. 本地 Studio 只能绑定 loopback、修改 Content Collections 源文件并调用固定验证命令；不得增加线上写接口、账户系统、任意命令执行或自动部署。

## 任务计划

修改一篇文章、一个项目、单个组件或小范围样式时不创建计划。重构首页/主题/内容结构、修改路由或构建方式、大幅调整心屿动效，或预计修改超过 5～8 个文件时，在 `tasks/active/` 创建简短计划，只写目标、范围、不修改范围、步骤、验收、命令和风险。等待用户事实或范围确认的计划移到 `tasks/backlog/`；完成或被替代后移到 `tasks/archive/`，不要长期堆在 active。

## Hermes 与 Codex

- 内容更新、小型 Bug、单页面/样式修改、博客/项目新增、文档和构建错误可直接交给 Codex。
- 首页整体重构、多阶段视觉改造、内容结构迁移、大型动效或跨模块工程调整由 Hermes 拆分后调度 Codex。
- Hermes 和 Codex 不得同时修改相同文件；实现和独立检查使用不同会话。

## 视觉与交互边界

- 不随意改变已经确认的编辑感、低饱和、克制动效与首页信息层级。
- 未来首页改版以 `docs/homepage-redesign.md` 为已确认目标；日间 / 夜间 Heart Island 原型是 UI 方向参考，不是可直接照搬的最终素材、网站背景或虚构内容来源，源码不得导入 `docs/assets/` 中的参考图。
- 第三方站点只允许提炼通用设计原则。复制第三方代码、图片、字体或其他素材前必须核对具体许可证、署名与用途限制；XingHuiSama 参考仓库当前为 CC BY-NC 4.0，不得当作无条件 MIT 素材使用。
- 两行仪表盘首页已完成；后续首页修改先阅读 `docs/homepage-redesign.md`，需要追溯决策时再查看 `tasks/archive/homepage-dashboard-refactor.md` 与 `tasks/archive/homepage-p0-implementation.md`，不得把 Pagefind、Giscus、Vue 3 或 P2 计划误写成当前能力。
- 颜色先检查 `src/styles/tokens.css`，同时维护浅色与深色 token；不要用零散覆盖补丁代替语义变量。
- 保留键盘焦点、Reduced Motion、响应式布局和主要内容可读性。
- 修改心屿展示区域时，保留岛屿主体、轮廓比例、水纹布局和整体视觉识别；不得用 TypeScript 重画 SVG。
- 不重新加入已移除的心形图标；动画必须克制且不能影响阅读。
- 客户端模块继续通过 `main.ts` 初始化，并返回清理函数；必须清理 listener、Observer 和 rAF，兼容 Astro 页面切换。

## 完成前验证

- 所有修改至少运行 `pnpm run verify`，它必须完整通过格式、lint、Astro check、build、结构契约、Node 测试和 Studio 生产隔离检查。
- 视觉或交互修改还要检查代表性桌面、平板、移动视口，以及浅色、深色、Reduced Motion 和无 JavaScript 状态。
- 无法完成浏览器验证时，必须在交付说明中明确写出未验证项，不能声称已经通过。

## 禁止行为

- 不无理由引入 React、Vue、Svelte、Tailwind、GSAP、Three.js 或新的 UI/动画运行时。
- 不把静态内容改造成数据库、CMS 或服务端系统。
- 不大规模重排首页、不随意改变心屿素材和既定视觉方向。
- 不在文档、代码或配置中写入密码、Token、私钥等敏感信息。
- 不修改真实域名、生产服务器配置或密钥，除非用户明确要求。
- 不自动提交、推送、创建 PR 或部署。
