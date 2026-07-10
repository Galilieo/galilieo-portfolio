# 02｜Astro 基础

## `.astro` 文件是什么

`.astro` 文件由两部分组成：顶部 frontmatter 和下方模板。

```astro
---
const title = '示例';
---

<h1>{title}</h1>
```

frontmatter 在构建阶段运行，不会自动发送到浏览器。模板最终生成普通 HTML。

## Props

Props 是父组件传给子组件的数据：

```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
---

<h2>{title}</h2>
```

本项目使用 TypeScript 接口约束 Props，避免字段拼错。

## Layout

Layout 是页面共同外壳。`BaseLayout.astro` 负责：

- `<html>`、`<head>`、`<body>`
- SEO
- 字体与样式
- JSON-LD
- View Transitions
- 客户端 TypeScript 入口

`ArticleLayout.astro` 和 `ProjectLayout.astro` 在 BaseLayout 上增加文章或项目结构。

## Slot

`<slot />` 表示父页面传入的 HTML 应该插入的位置。

```astro
<BaseLayout>
  <main>这里会进入 BaseLayout 的 slot</main>
</BaseLayout>
```

## 文件路由

Astro 不需要手写路由表。`src/pages/` 的路径就是 URL。

`[slug].astro` 是单段动态路由；`[...slug].astro` 可以接收多级路径。动态页面通过 `getStaticPaths()` 在构建时枚举所有合法 URL。

## 静态生成

执行 `pnpm build` 时，Astro：

1. 读取配置和 Content Collections。
2. 校验 Markdown frontmatter。
3. 执行 `.astro` frontmatter。
4. 为每个路由生成 HTML。
5. 打包少量浏览器脚本和 CSS。
6. 输出到 `dist/`。

服务器只发送文件，不运行 Node.js。

## Astro 默认没有整页 JavaScript

普通 Astro 组件只生成 HTML。主题、菜单和岛屿效果通过 `src/scripts/main.ts` 单独加载。项目没有 Vue/React 水合，因此页面更轻，也更容易理解。
