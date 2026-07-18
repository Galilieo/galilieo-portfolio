# 设计维护指南

这份指南只记录容易在修改中被破坏的视觉与交互边界。具体数值以 `src/styles/` 和组件实现为准，不在文档复制整套 CSS。首页完整方向见 [`homepage-redesign.md`](homepage-redesign.md)，项目、博客、归档、关于和详情页的已确认方向见 [`interior-pages-redesign.md`](interior-pages-redesign.md)。

原站以暖纸色、编辑感为基线；当前两行仪表盘首页已完成桌面、平板、移动端、双主题、Reduced Motion、无 JavaScript 和键盘路径验收。首页采用日间 / 夜间 Heart Island 双主题方向，固定结构、两张高保真参考图和后续 P1/P2 边界统一见 [`homepage-redesign.md`](homepage-redesign.md)。当前验收不代表最终背景素材、全文搜索或高级 Heart Island 场景已经完成。

## 视觉定位

原有页面采用克制、低饱和、带编辑感的个人作品集风格。已确认的改版使用同一套海岛语言：日间是暖骨白、雾蓝灰和低饱和石板蓝，夜间是深海蓝黑、靛蓝灰和少量月光紫蓝；两者继续继承清晰文字层级、克制动效和可访问性要求。动画用于提供呼吸感和状态反馈，不应成为页面主角。

XingHuiSama 站点只作为第二层氛围参考：可以学习背景、遮罩、玻璃面板的层级关系和日夜模式的独立调色，但不能覆盖 Galilieo 已确认的布局、Heart Island 识别和真实内容优先级。详细来源、截图与许可边界见 [`homepage-redesign.md`](homepage-redesign.md#第三方风格与氛围参考)。

不要无任务依据重排首页、改成通用 SaaS 模板、加入大面积渐变/玻璃拟态/霓虹粒子，或用新框架重写现有视觉。

## 字体与排版

字体链接和导入顺序在 `src/layouts/BaseLayout.astro`，字体 token 在 `src/styles/tokens.css`：

- `--display`：展示标题
- `--serif`：中文衬线正文/编辑性标题
- `--sans`：界面与正文无衬线
- `--mono`：编号、标签与技术信息

当前使用 Instrument Serif、Noto Serif SC、Plus Jakarta Sans 和 IBM Plex Mono，并保留系统 fallback。Archive、Campus 与 About 的大标题和卡片标题主动使用较柔和的 `--sans` 中等字重，避免中文衬线在大字号下过尖；文章正文和需要编辑感的标题继续使用 `--serif`。换字体会改变换行、卡片高度与首屏节奏，必须同时检查中英文和响应式布局。

## 色彩与主题

语义 token 集中在 `src/styles/tokens.css`。优先修改 `--paper`、`--ink`、`--line`、`--accent`、场景色和联系区变量，不要在组件末尾堆叠硬编码覆盖。

浅色变量定义在 `:root`，深色变量定义在 `html[data-theme='dark']`。主题链路包括：

1. `BaseLayout.astro` 的 head 内联脚本在首屏绘制前读取 `localStorage` 或系统偏好。
2. `theme.ts` 同步 `data-theme`、按钮 ARIA 和 `theme-color`。
3. `galilieo:theme-change` 作为后续客户端增强事件保留；当前 SVG 与场景颜色直接跟随 CSS token，不需要脚本重绘。

修改任何语义颜色时都要检查日间和夜间；它们是同等正式的主题，不要只让一种主题“勉强可用”，也不要用滤镜或简单反色生成另一套主题。首页固定色值以 `src/styles/tokens.css` 的 `--home-*` 为唯一代码来源，具体使用边界见 [`homepage-redesign.md`](homepage-redesign.md#双主题设计契约)。未经视觉确认和对比度检查，不要把日间改回冷白 SaaS 蓝，也不要把夜间改成纯黑霓虹。

## 首页布局边界

当前 `src/pages/index.astro` 已收敛为两行仪表盘：个人档案与 GitHub/音乐功能卡，项目与笔记轮播，之后是轻量状态条和 Footer。桌面主次列约为 `60:40`，Heart Island 只在项目轮播首项展示，不再保留独立 Hero 主视觉。扩展区当前不渲染，具体边界见 [`homepage-redesign.md`](homepage-redesign.md#首页结构当前实现与已确认目标)。

- 未经明确要求，不改变已确认的两行结构、`60:40` 主次关系或 Heart Island 只出现一次的边界。
- 固定内容修改对应 `src/components/home/` 文件；项目与文章列表继续从 Content Collections 读取。
- 响应式修改应解决真实布局问题，不用 `overflow-x: hidden` 掩盖溢出来源。
- GitHub 功能卡只把官方 Public Events 表达为“最近 30 天公开事件”，不得冒充年度 Contributions；卡片使用 GitHub 身份区、事件数、活跃日、最近仓库和 30 日活动脉冲建立信息层级，使用 30 分钟缓存，并保留 API 限流/离线回退。
- 状态条先输出上海静态回退，再使用浏览器时区、IP 城市级粗定位和 Open-Meteo 渐进增强；不调用 GPS、不显示经纬度，也不在失败时展示模拟天气。
- `home-live-data.ts` 只保留单一初始化 Interface；GitHub Public Events 与环境天气分别由 `home-github-activity.ts`、`home-environment.ts` 维护。页面选择器、缓存 TTL、请求中止和静态回退属于必须保持的行为，不重新合并到一个大文件，也不抽象通用网络客户端。
- 全站音乐只使用 `GlobalControls.astro` 中一个持久化原生 `<audio>`；左下唱片球展开紧凑歌单，首页音乐卡只是同步控制视图。列表循环、单曲循环和随机播放共用同一模式状态，并在刷新后保留用户选择；随机模式不得立即重复当前曲，单曲模式只在自然结束时重复，手动上一首/下一首仍应换曲。页面切换不得重建或暂停音频，不自动播放；网易云外链失败时明确降级，Reduced Motion 下封面不旋转。
- 右下回顶控件滚动超过约一屏后显示，Reduced Motion 下立即回顶；无 JavaScript 时保留原生 `href="#top"`。
- 空内容应保留自然说明，不渲染空网格、失效按钮或虚构占位数据。
- 不重新加入“全部项目 / 所有文章 / 时间归档 / 完整 About”横向文字入口；Header 与内容卡已经提供对应路径。
- 首页个人档案卡使用兄弟覆盖层导航：头像、简介、留白和“查看完整档案”进入 `/about/`；Works / Notes 分别进入 `/projects/`、`/blog/`；GitHub、Gmail 和 QQ 邮箱保留独立目标。所有内部入口位于整卡覆盖层之上，不嵌套 `<a>`。项目与笔记轮播同样使用两层兄弟链接：点击外层标题、留白或边缘分别进入 `/projects/`、`/blog/`，点击内层当前视觉卡进入对应项目或文章详情；内层不增加“查看项目 / 阅读笔记”等解释文字。轮播圆点是更高层的独立切换控件，不参与导航。
- 首页快速联系使用等权的 GitHub、Gmail 和 QQ 邮箱品牌入口，不给单个平台默认高亮，也不依赖品牌大色块区分；图标按钮必须保留准确的邮件地址、可见键盘焦点和文字化无障碍名称。
- 项目与文章轮播使用全幅视觉和底部渐变信息层；有真实 `cover` 时通过 Astro 图片管线渲染。项目缺少封面时使用现有 Heart Island 或 CSS 占位；文章缺少封面时从用户明确批准、来源清楚的博客图库按 slug 稳定选择，并与博客目录保持同图。参考图和站点背景仍不得直接充当内容封面。
- 自动轮播必须在悬停、键盘焦点、后台页面和 Reduced Motion 下停止，圆点保持可聚焦与可命名；普通切换使用约 `320ms`、`12px` 以内的方向交叉淡入淡出，Reduced Motion 立即切换；不要重新加入占空间的左右按钮或页码。

## 响应式

当前主要断点位于 `src/styles/global.css` 和 `src/styles/content.css`：1180px、920px、680px、580px。不要为了单个截图随意增加相邻断点。

可用 1440×1000、1024×768、390×844 作为代表性视口，而不是永久固定的完整测试矩阵。重点观察导航、档案卡上下分区、右侧功能卡拥挤、轮播长标题、状态条换行和横向溢出。

## 动画与 Reduced Motion

- Reveal 和心屿关键帧在 `src/styles/animations.css`；观察逻辑在 `src/scripts/reveal.ts`。
- 优先使用 transform 和 opacity，避免持续动画高成本 filter、布局属性或大量粒子。
- `prefers-reduced-motion: reduce` 必须同时在 CSS 和脚本层降级：停止循环、长位移和指针视差 rAF，并立即显示内容。
- 不用动画延迟主要信息或阻断链接；触摸设备不能依赖 hover 才能理解内容。

## 键盘与可访问性

保留语义标题层级、landmark、skip link、可见的 `:focus-visible`、移动菜单 ARIA 状态和 Escape 关闭行为。关闭的移动菜单不能保留在 Tab 顺序中；键盘打开后焦点进入首项，Escape 关闭后回到菜单按钮。无 JavaScript 的窄屏应隐藏无效菜单按钮，并直接显示静态导航。装饰图片使用空 `alt` 或 `aria-hidden`；传达信息的图片必须有准确 `alt`。修改链接卡片时确认整卡链接与内部交互不会冲突。

主导航通过主题强调色、略高字重和居中短线标识当前栏目，不使用胶囊或大面积按钮背景；同时保留 `aria-current="page"`。项目详情归入“项目”，`/notes/*` 文章详情归入“博客”，首页滚动时仍保持“首页”作为当前页面。

所有页面通过 `BaseLayout.astro` 统一渲染 skip link、`SiteHeader.astro` 与 `SiteFooter.astro`，页面和详情 Layout 只提供带 `id="main-content"` 的主体内容，不得重复公共外壳。Header 使用独立的 `--header-page`（桌面上限 `1220px`）及内部 `paper / ink / line / accent` 映射；首页和内页只能调整各自内容区，不得通过 `body:has(...)` 覆盖 Header 的宽度、背景、边框或模糊。Header 顶部保持半透明，滚动后统一收紧到 `64px` 并启用 `18px` 模糊。桌面时间位于主题开关前；`680px` 以下复用同一时钟和时区源，将 `LOCAL HH:MM` 收进 Header 顶部约 `14px` 的细栏，不复制第二套计时逻辑，也不挤占品牌、菜单和主题按钮主行。

博客主导航使用单值 `category`，多值 Tag 用于跨分类探索。`/blog/` 与 `/notes/` 必须复用同一 Category 分组和 Tags 结果组件；Category 模式保留真实分组与 hash，Tags 模式切换为独立统一结果流，结果标题使用 `TAG / <名称> / <数量> ARTICLES`，不能继续冒充 Category 标题。文章卡内部保留真实 Category，跨分类 Tag 按发布日期统一排序。无 JavaScript 时隐藏增强型 Tag 结果，只显示一次完整 Category 内容流。宽桌面显示 Category / Tags 侧栏，平板与移动端直接显示文章流，不额外重复目录。文章详情目录只收录 Markdown H2/H3：宽桌面使用吸顶目录，小屏使用单一原生 `<details>` 本文目录，不加入“分类 / 本文”Tab。目录使用真实锚点、语义化 `<nav>`、唯一 `aria-label` 和 `aria-current="location"`；JavaScript 只增强当前位置并接入 `main.ts` 清理周期。无 JavaScript 时分类分组和章节链接仍然可读、可用。

## 本地 Studio 视觉与交互

Galilieo Studio 是个人电脑上的 Markdown 写作工具，不属于公开站点页面。视觉应延续低饱和蓝灰、柔和中文无衬线标题和克制状态反馈，但不导入生产背景素材，也不伪装成通用 SaaS 管理后台。

- 默认“边写边看”，将 Markdown 编辑器与真实 Astro 页面并排；“专注写作”隐藏预览并扩大正文，两种模式是平行选择，不是强制步骤。
- 文章库、写作区和真实预览建立主次；Category、Tags、摘要、封面和日期收进设置抽屉，派生字段只在高级信息中只读展示。
- Studio 的紧凑感不能依赖不可读小字：文章库条目约 `60px` 高，标题约 `12px`，meta / 状态约 `10px`；编辑正文桌面和移动端均以 `15px` 为基线，摘要 chip 约 `10.5px`。设置字段正文使用约 `12–13px`，Category、Tags 候选和常用按钮保持至少约 `42px` 的操作高度。
- 发布流程只使用一个检查侧板，说明缺失内容、影响页面和部署边界；不增加四步向导、数据库状态或线上发布假象。
- 长中文标题必须自然换行并自适应高度；桌面/手机预览状态要明显不同，不得用固定单行输入截断标题。
- 恢复副本只用于防止本机输入丢失，成功写入 Markdown 后清除；不能成为第二套内容源。
- Studio 双主题同等正式，保留可见键盘焦点和 Reduced Motion；隐藏文件输入不能撑开页面或用 `overflow-x: hidden` 掩盖问题。
- 设置抽屉、发布检查和新建草稿必须使用真实 dialog 语义与模态焦点范围；关闭状态抽屉不参与 Tab 顺序，关闭后焦点回到触发器。取消新建要清空表单和独立 taxonomy 状态；当前文章 dirty 时进入新建流程必须先确认，不能静默切走。
- 主分类必须留在当前操作容器内：文章设置抽屉和新建草稿弹窗各自直接显示紧凑单选按钮及一行新增输入，顶部分类摘要只打开设置抽屉并聚焦当前值。Tags 也属于当前容器，使用带 chips 的可创建多选 combobox；输入框同时负责搜索和新增，新值以菜单首行“创建”明确呈现，Enter 接受、方向键移动、Esc 关闭，菜单锚定字段并在空间不足时向上展开。顶部标签摘要只打开设置并聚焦输入，不能再弹出远离触发点的底部面板。文章至少保留一个标签；只有封面选择使用支持 Esc / scrim / 关闭按钮的底部面板。新增 taxonomy 不建立第二套数据源，只在文章保存后进入 Markdown 和后续候选列表。
- 封面设置直接展示自动、指定图库和专属上传三种模式。图库缩略图来自固定的 `scene-*.webp` 白名单，客户端只提交图库 key，服务端转换为 Astro 可解析的相对路径；专属上传之外不得接受任意文件路径。
- 完整博客卡使用约 `160px` 高的封面、`24–28px` 标题和 `14px` 摘要，桌面两列与 `581–760px` 单列分别校准留白。580px 以下继续使用双列图片索引：390px 下单卡约 `176×212px`、图片约 `98px`；随视口增至 580px 时图片按 `16:9` 自然增至约 `151px`，标题 `17px` 最多三行，保留 `10px` category/date，隐藏摘要、标签和 footer。首页精选与项目网格保持单列；移动项目卡图片约 `5:2`、标题 `22px`、摘要 `13px`，不能继承博客双列压缩规则。

- 归档页通过原生 Tabs 在博客笔记与个人轨迹之间切换，两套内容都使用语义化 `<ol>`。桌面航线固定为 `minmax(0, 1fr) 92px minmax(0, 1fr)` 三列，卡片等宽交替停靠，节点与卡片 meta 行对齐；`760px` 及以下统一降为 `68px` 左侧航道，主轴和节点位于轨道中央 `34px`。个人轨迹当前确认时间为软件工程学习 `2024.09 — 至今`、Heart Island 持续开发 `2026.04 — 至今`、AI 产品开发实习 `2026.06 — 至今`，并链接到真实项目与 `/campus/`。About 不再复制时间线，只展示真实头像、身份、介绍、事实和入口。
- `ArchiveVoyage.astro` 只在两套归档面板之后渲染一次，昼夜主题分别使用 `src/assets/images/archive/archive-voyage-day.png` 与 `archive-voyage-night.png`。它是无遮罩卡片外壳的视觉句号，必须保留长过渡、边缘渐隐和完整纸舟构图；不得把参考图或文档截图重新接入页面。
- 整卡反馈只用于真实整卡链接：归档记录、首页 Selected Works / Selected Writing 外层入口、项目列表和文章列表。音乐、GitHub、About 与纯信息面板不能仅为统一视觉而伪装成可点击卡片。悬停和键盘焦点需要同步边框、顶部高光、航线节点或箭头反馈；移动端与 Reduced Motion 保留静态焦点/边框提示，不执行位移、缩放、漂移或闪光动画。

## 心屿重点项目边界

心屿是网站最强的视觉识别，相关入口：

- 首页重点项目与语义控制器：`src/components/home/FeaturedProjects.astro`
- 岛屿结构：`src/components/home/IslandArtwork.astro`
- 主体 SVG：`src/assets/svg/island-reference-no-heart-vector.svg`
- 仪表盘、岛屿与场景样式：`src/styles/home/hero.css`、`src/styles/home/sections.css`
- 入场与循环：`src/styles/animations.css`
- 可见性、指针与生命周期：`src/scripts/island-effects.ts`
- 隔离原型：`sketches/`

必须保留岛屿 SVG 的主体路径、轮廓比例、内部识别和水纹整体布局。不要增加心形图标，不要用 TypeScript 重画岛屿，也不要引入 GSAP、Three.js、Lottie 或新的 Canvas 库。

现有动效语言是低振幅、慢周期、延迟感知：岛屿不旋转，持续位移不超过约 3px，指针反馈不超过约 5px，且只有精细指针启用局部视差。当前没有 Canvas、粒子系统或 DPR 绘制循环；不要把未来 P2 设想写成现有能力。改变这些边界前需得到明确视觉方向，而不是把参数当普通装饰随意调整。

## 客户端动效生命周期

`src/scripts/main.ts` 在 `astro:page-load` 初始化，在 `astro:before-swap` 清理。新增或修改动效模块时：

ClientRouter 会同步目标页的 `<html>` 属性，因此 `main.ts` 必须在每次 `astro:page-load` 恢复 `.js` 渐进增强标记；否则返回首页后依赖 `html.js` 的轮播圆点会被 CSS 隐藏。

1. 导出 `initSomething(): () => void`。
2. 目标元素不存在时安全返回空清理函数。
3. 清理事件监听器、MediaQuery 监听、Observer、ResizeObserver 和 rAF。
4. 页面离屏或 `document.hidden` 时暂停持续绘制。
5. 主题、Reduced Motion、resize 和 Astro 页面切换后状态仍正确。

## 图片与 SVG

- 需要 Astro 优化和内容引用的图片放 `src/assets/`；需要稳定 URL 的 favicon、robots 或公开媒体放 `public/`。
- Astro 组件优先使用 `astro:assets` 或现有 `ContentImage.astro`，提供尺寸策略、懒加载和准确 alt。
- 归档纸舟昼夜图是用户批准的原创生成素材，只用于 `ArchiveVoyage.astro`，源文件固定在 `src/assets/images/archive/` 并交给 Astro 图片管线输出响应式格式；不要复制到 `public/` 或当作文章封面。
- SVG 优先保留为可审查的源文件；修改 path 前确认不是受保护的品牌/作品主体。
- 不提交只为文档验收产生的大量重复截图；需要临时比对时放在任务产物或本地工具目录。
- `docs/assets/homepage-day-reference.png` 与 `docs/assets/homepage-night-reference.png` 仅用于设计对照，不得从 `src/` 导入、裁切后充当背景或作为正式内容素材。
- `docs/assets/xinghuisama-day-reference.png`、`docs/assets/xinghuisama-night-reference.png` 与 `docs/assets/xinghuisama-mobile-reference.png` 是带来源、日期和许可说明的第三方研究截图，不属于本站 MIT 素材，也不得从 `src/` 导入。
- `docs/assets/interior-reference/` 保存 XingHuiSama 项目、时间线、关于页的桌面/移动研究截图和 Galilieo 对照板；它们同样不属于本站 MIT 素材，不得从 `src/` 导入或裁切为正式页面资源。
- 首页与内页使用 `src/assets/images/home/demo-background-placeholder.webp` 作为低透明度整页氛围层，并分别使用日夜遮罩保证内容可读。它由站点所有者从桌面文件 `【哲风壁纸】二次元-动漫-城市.png` 指定，仓库只保存压缩后的 2560×1440 WebP；人物图用于 Header、首页头像、favicon 与默认分享图，三张场景图用于项目封面和博客 Category 背景。以上素材按站点所有者声明用于个人网站，公开再分发或商业化前仍需重新核对原作者与许可。背景仅作氛围层，不得据此重排页面结构。

首页卡片材质参考 XingHuiSama 的通用背景分层、半透明面板、柔和边缘和模糊景深原则，但由本站使用原生 CSS 和语义 token 独立实现。当前桌面主面板日间使用约 `14px / 112%`、夜间使用约 `18px / 116%` 的模糊与饱和度，并配合低饱和双层阴影和独立透明度；日间遮罩与面板更透，让背景保持可感知。移动端主动关闭大面积 `backdrop-filter`，改用更实的半透明底色、边框和内高光保证回退。不得复制其 Tailwind 类、组件代码、精确色值、图片或功能；其上游仓库采用 CC BY-NC 4.0。

## 视觉验证清单

涉及 UI、主题或动效时检查：

- 桌面、平板和移动端代表视口
- 浅色与深色主题，以及刷新后的主题持久化
- Reduced Motion
- 键盘导航、焦点样式和移动菜单
- 无 JavaScript 时主要内容、链接和导航是否可读
- 页面切换后是否出现重复监听器、Observer 或 rAF

`.reveal` 在 JavaScript 可用时由 `reveal.ts` 添加 `.is-visible`；`BaseLayout.astro` 会尽早给根元素添加 `.js`，而 `src/styles/home/base.css` 通过 `html:not(.js) .reveal` 保证禁用 JavaScript 时内容直接可见。不要删除这组渐进增强契约，也不要让跳转链接的隐藏与聚焦规则依赖 JavaScript。
