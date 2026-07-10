import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const dateText = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value))
  .pipe(
    z.string().regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/, '日期格式应为 YYYY、YYYY-MM 或 YYYY-MM-DD'),
  );

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        description: z.string().min(1),
        publishedAt: dateText.optional(),
        updatedAt: dateText.optional(),
        category: z.string().min(1),
        tags: z.array(z.string().min(1)),
        cover: image().optional(),
        draft: z.boolean(),
        featured: z.boolean().optional().default(false),
        readingTime: z.number().int().positive().optional(),
        order: z.number().int().nonnegative(),
        homepageState: z.string().min(1),
      })
      .superRefine((entry, context) => {
        if (!entry.draft && !entry.publishedAt) {
          context.addIssue({
            code: 'custom',
            message: '公开文章必须填写 publishedAt',
            path: ['publishedAt'],
          });
        }
      }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      subtitle: z.string().min(1),
      description: z.string().min(1),
      homepageDescription: z.array(z.string().min(1)).min(1),
      date: dateText,
      status: z.string().min(1),
      role: z.string().min(1),
      typeLabel: z.string().min(1),
      stack: z.array(z.string().min(1)).min(1),
      cover: image().optional(),
      website: z.url().optional(),
      repository: z.url().optional(),
      private: z.boolean(),
      featured: z.boolean(),
      order: z.number().int().positive(),
      currentCapabilities: z.array(z.string().min(1)).optional(),
      inDevelopment: z.array(z.string().min(1)).optional(),
      statusLabel: z.string().min(1).optional(),
    }),
});

export const collections = { blog, projects };
