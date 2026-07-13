# Header 导航与个人图片体系

## 目标

修复移动端 Header 菜单的五项导航布局、激活线和无障碍状态；把用户提供的四张图片接入站点头像、图标、分享图、项目和博客封面，并移除现有全站抽象二次元背景与旧抽象博客封面。

## 已确认资产映射

- `6f2122d4-61fc-4905-8207-522758066d90.png`：Header 品牌头像、首页个人头像、favicon、Apple Touch Icon、默认 SEO 分享图。
- `120980983_p0_master1200.jpg`：AI Chat / 前端与移动端文章背景。
- `145508830_p0_master1200.jpg`：Galilieo Atlas / 工程笔记背景。
- `106206682_p0_master1200.jpg`：Heart Island / 项目日志背景。
- 不再在线寻找影视飓风或来源不明图片；本次只使用用户提供的本地素材。

## 范围

- `src/components/layout/SiteHeader.astro`
- `src/components/home/HomeProfileCard.astro`
- `src/components/blog/ArticleCard.astro`
- `src/styles/global.css`
- `src/scripts/navigation.ts`
- `src/styles/home/base.css`
- `src/styles/home/hero.css`
- `src/styles/interior.css`
- `src/config/site.ts`
- `src/layouts/BaseLayout.astro`
- 三个项目 frontmatter
- 图片资产、favicon 与设计指南

## 不修改范围

- Heart Island SVG、轮廓、水纹与动效。
- 博客 Category/Tag 数据与正文。
- 路由、Content Collections schema、构建方式和依赖。
- 正在进行的博客目录/阅读导航结构。

## 实施步骤

1. 将四张源图裁切、压缩为站点 WebP/JPEG/ICO 资产，保留人物焦点并声明尺寸。
2. Header 品牌增加小头像；首页 Profile 的字母占位替换为头像。
3. 重构移动菜单为 3+2 对称网格；文字与短激活线同中心；移动端不保留触摸 hover 假激活。
4. 导航脚本只维护 class、ARIA 和 inert，不写内联展示样式；桌面断点切换时自动归位。
5. 三个项目接入对应封面；博客卡片按真实 Category 使用三张背景池。
6. 删除全站抽象背景和旧抽象博客 SVG，改回低饱和 CSS 氛围。
7. 更新 favicon、Apple Touch Icon、默认 SEO 分享图及素材边界说明。
8. 运行 `node scripts/verify.mjs`、Prettier、`git diff --check`，再做 1440×1000、1024×768、390×844 浅/深色、菜单开关、键盘、无 JS、Astro 往返和控制台检查。

## 验收标准

- 390px 菜单为三项上排、两项下排；五项等权，激活线位于文字正下方。
- 当前页只有一个激活项；触摸后不会留下第二条 hover 线。
- 关闭菜单时链接不可 Tab 到；打开后可键盘访问；Escape、外部点击、路由点击和切回桌面均关闭。
- 首页和内页不再加载 `demo-background-placeholder.webp`。
- 首页头像、Header 头像、favicon、SEO 图片均来自指定人物图。
- 三个项目和三个博客类别均有指定图片，裁切不遮挡主体，文字保持可读。
- 无横向溢出、资源 404、控制台异常或 Astro 页面往返重复初始化。
- 完整验证通过。

## 风险

- 用户提供图片的公开再分发授权未知；按用户声明仅作个人用途接入，公开或商业化前需重新核对来源与许可。
- 竖图裁为横幅会损失上下内容，已通过独立 `object-position` 以人物面部/主体为焦点完成裁切。

## 完成证据

- `node scripts/verify.mjs`：ESLint、Astro Check、18 页静态构建、博客导航与首页结构检查全部通过。
- 构建生成 12 个优化图片变体；项目页 3 张封面、博客页 8 张 Category 背景均加载完成且自然尺寸非零。
- 独立代码审查后将项目/博客列表封面切换为 Astro `Image` 响应式资源，并为未知博客分类增加花海默认背景；隐藏菜单同时使用 `inert` 与链接 `tabindex=-1`。
- CDP 实测：1440×1000、1024×768、390×844；浅色/深色；菜单打开、Escape、断点关闭、无 JavaScript 与 Astro 页面往返。
- 移动菜单五项文字中心偏差均为 `0px`，只有当前“归档”显示短激活线；关闭时 `inert=true`，切到桌面时自动恢复。
- 首页头像桌面为 `96×96`、移动为 `64×64`；390px 文档宽度等于视口，无横向溢出。
- 控制台只有 GitHub/IP 公共接口的 403/429 限流，页面走现有降级文案；没有导航、图片或脚本异常。
