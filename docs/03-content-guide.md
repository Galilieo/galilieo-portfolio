# 03｜内容系统指南

## Content Collections

Content Collections 把 Markdown 当作带类型的数据。定义位置：

```text
src/content.config.ts
```

集合：

- `blog`：博客文章
- `projects`：项目详情

构建时字段不符合 schema 会直接报错，避免发布缺少标题、错误 URL 或错误布尔值的内容。

## Frontmatter

Markdown 顶部两个 `---` 之间是 frontmatter：

```yaml
---
title: 标题
draft: true
tags:
  - Astro
---
```

YAML 会自动识别日期、数字和布尔值。只有年份时建议写引号，例如 `date: '2026'`。

## 新增文章

1. 在 `src/content/blog/` 创建小写英文文件名。
2. 复制现有文章 frontmatter。
3. 填写真实标题、摘要、分类和标签。
4. 未完成时设置 `draft: true`，可以不写 `publishedAt`。
5. 发布时设置 `draft: false` 并填写 `publishedAt`。
6. 执行 `pnpm check`。

公开文章会进入 `/notes/`、详情路由、RSS 和 sitemap。草稿仍可用于首页选题数据，但不会生成公开文章页。

## 新增项目

1. 在 `src/content/projects/` 创建 Markdown。
2. `order` 决定首页和项目列表顺序。
3. `homepageDescription` 保留首页所需段落。
4. `private: true` 表示项目内容受限，不代表文件不能包含已经公开的职责摘要。
5. 不要写未经验证的数据或成果。

## Markdown 与 MDX

普通文章使用 Markdown：

- 标题
- 段落
- 图片
- 代码块
- 引用
- 表格
- 列表
- 外部链接

只有需要导入 Astro 组件时使用 MDX，例如嵌入一个定制演示组件。不要把所有文章改成 MDX。

## 图片

Markdown 中可以使用 `src/assets/images` 的相对图片。Astro 组件中优先使用 `ContentImage.astro` 或 `astro:assets` 的 `Image` / `Picture`。

装饰图片使用空 `alt` 或 `aria-hidden`；内容图片必须写清楚 `alt`。

## 视频与动画

可直接在 Markdown 中写 `<video>`。文件放在 `public/videos/`，通过 `/videos/name.webm` 访问。短透明动画可放 `public/gifs/`，但较长演示优先视频格式。
