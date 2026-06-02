import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://www.stratumcore.com.au',
  integrations: [tailwind()],
  redirects: {
    // Old "Finance Consulting" service page is now the Corporate Advisory stream
    '/finance-consulting': '/corporate-advisory',
  },
});
