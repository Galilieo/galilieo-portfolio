# Galilieo Atlas Context

Galilieo Atlas 是一个静态优先的个人作品集与开发记录网站。本文件统一描述公开内容、首页增强和生产验证中的项目专用概念，避免后续维护使用相互冲突的名称。

## Language

**Public Article**:
`draft: false` 且具有 `publishedAt` 的博客条目，会进入公开列表、详情、归档、RSS 与 sitemap。
_Avoid_: Published Post, Note

**Draft Article**:
`draft: true` 的博客条目，只能在本地开发预览和 Galilieo Studio 中使用。
_Avoid_: Private Article

**Home Live Data**:
首页通过渐进增强展示的 GitHub Public Events、访客城市级环境、当地时间与天气状态。
_Avoid_: Analytics, Realtime Backend

**Music Snapshot**:
由公开网易云歌单生成并随静态构建发布的歌曲元数据与站外播放可用性清单。
_Avoid_: Music Database, Playlist API

**Site Contract**:
对生成页面、公开内容、站点身份与生产隔离不变量执行的构建后检查。
_Avoid_: End-to-end Test

**Galilieo Studio**:
只在个人电脑 loopback 地址运行、直接维护 Markdown 的本地写作工具，不属于生产站点。
_Avoid_: CMS, Admin Site

## Relationships

- 一个 **Public Article** 会进入博客目录、文章详情、归档、RSS 与 sitemap。
- 一个 **Draft Article** 可以在开发环境生成预览，但不得进入生产产物。
- **Home Live Data** 只能增强服务端已有的静态回退内容。
- 一个 **Music Snapshot** 由同步脚本生成，并由全站唯一的原生音频播放器读取。
- **Site Contract** 在静态构建后验证 **Public Article**、站点身份和生产隔离规则。
- **Galilieo Studio** 可以把 **Draft Article** 更新为 **Public Article**，但不会提交、部署或发布网站。

## Example dialogue

> **Dev:** “首页天气接口失败时，要不要隐藏整个状态条？”
> **Domain expert:** “不要。**Home Live Data** 只是渐进增强，页面必须继续显示上海静态回退；同样，更新歌单只重建 **Music Snapshot**，不能让访客构建时请求网易云元数据。”

## Flagged ambiguities

- “博客”和“笔记”曾同时表示内容集合与公开路由：统一把集合条目称为 **Public Article** 或 **Draft Article**；`/blog/` 与 `/notes/` 都是公开入口。
- “实时数据”容易被理解为服务端推送：统一使用 **Home Live Data**，它只表示浏览器端按需获取并带缓存、失败回退的渐进增强数据。
