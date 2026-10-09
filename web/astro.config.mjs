import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://l4g.ro',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'never' },
});
