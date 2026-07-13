import type { CollectionEntry } from 'astro:content';

export type BlogArticle = CollectionEntry<'blog'>;

export interface BlogCategorySummary {
  name: string;
  id: string;
  count: number;
}

export interface BlogCategoryGroup extends BlogCategorySummary {
  articles: BlogArticle[];
}

export function sortBlogArticles(articles: BlogArticle[]): BlogArticle[] {
  return [...articles].sort((articleA, articleB) =>
    (articleB.data.publishedAt ?? '').localeCompare(articleA.data.publishedAt ?? ''),
  );
}

export function getBlogCategoryId(category: string): string {
  const slug = category
    .trim()
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `category-${slug || 'notes'}`;
}

export function createBlogCategoryGroups(articles: BlogArticle[]): BlogCategoryGroup[] {
  const categoryArticles = new Map<string, BlogArticle[]>();

  for (const article of sortBlogArticles(articles)) {
    const category = article.data.category;
    categoryArticles.set(category, [...(categoryArticles.get(category) ?? []), article]);
  }

  return [...categoryArticles.entries()]
    .map(([name, groupedArticles]) => ({
      name,
      id: getBlogCategoryId(name),
      count: groupedArticles.length,
      articles: groupedArticles,
    }))
    .sort(
      (groupA, groupB) =>
        groupB.count - groupA.count || groupA.name.localeCompare(groupB.name, 'zh-CN'),
    );
}

export function getBlogCategorySummaries(articles: BlogArticle[]): BlogCategorySummary[] {
  return createBlogCategoryGroups(articles).map(({ name, id, count }) => ({ name, id, count }));
}
