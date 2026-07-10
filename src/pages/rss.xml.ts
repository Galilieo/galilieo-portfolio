import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';

export async function GET(context: { site?: URL }) {
  const articles = (await getCollection('blog'))
    .filter((article) => !article.data.draft && article.data.publishedAt)
    .sort((a, b) => String(b.data.publishedAt).localeCompare(String(a.data.publishedAt)));

  return rss({
    title: `${siteConfig.name} — Portfolio & Notes`,
    description: siteConfig.description,
    site: context.site ?? new URL(siteConfig.url),
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: new Date(`${article.data.publishedAt}T00:00:00+08:00`),
      link: `/notes/${article.id}/`,
      categories: [article.data.category, ...article.data.tags],
    })),
  });
}
