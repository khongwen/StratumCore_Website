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
      // Keep redirect stubs and the noindex capture page out of the sitemap.
      filter: (page) =>
        !page.includes('/finance-consulting') &&
        !page.includes('/overheads-review'),
    }),
  ],
  redirects: {
    // Old "Finance Consulting" service page is now the Corporate Advisory stream
    '/finance-consulting': '/corporate-advisory',

    // The overheads offer moved from a toolkit (Excel) to a case-study PDF, and
    // the page moved with it. Permanent so old printed QR codes and any indexed
    // /toolkit link resolve to the new page. Query params are preserved by the
    // redirect, so a tagged /toolkit?utm_... URL keeps its attribution.
    '/toolkit': { status: 301, destination: '/overheads-review' },

    // Short link for printed QR codes. Keeping the encoded URL short is what
    // makes the code scannable from 1m: the full tagged URL needs 57 modules
    // at EC level H (a ~100mm print), this needs 33 (a ~58mm print).
    // The tracking parameters are reattached here, server-side.
    '/t': '/overheads-review?utm_source=seatcard&utm_medium=qr&utm_campaign=ce-01',
  },
});
