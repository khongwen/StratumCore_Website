import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.stratumcore.com.au',
  integrations: [
    tailwind(),
    sitemap({
      // Exclude the /finance-consulting redirect stub from the sitemap
      filter: (page) => !page.includes('/finance-consulting'),
    }),
  ],
  redirects: {
    // Old "Finance Consulting" service page is now the Corporate Advisory stream
    '/finance-consulting': '/corporate-advisory',
  },
});
