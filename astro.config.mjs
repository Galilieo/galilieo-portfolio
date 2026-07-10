import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://galilieo.heart-island.cn',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [mdx(), sitemap()],
});
