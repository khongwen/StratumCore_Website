import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.stratumcore.com.au',
  // Every page stays prerendered to static HTML. Only routes that explicitly
  // opt out with `export const prerender = false` (currently just
  // /api/subscribe) are deployed as serverless functions.
  output: 'static',
  adapter: vercel(),
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

    // Short link for printed QR codes. Keeping the encoded URL short is what
    // makes the code scannable from 1m: the full tagged URL needs 57 modules
    // at EC level H (a ~100mm print), this needs 33 (a ~58mm print).
    // The tracking parameters are reattached here, server-side.
    '/t': '/toolkit?src=card&utm_source=joblin-event&utm_medium=qr&utm_campaign=commercial-edge-01',
  },
});
