import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import indexnow from 'astro-indexnow';
import { writeFileSync, mkdirSync } from 'node:fs';
import { lastmodForUrl } from './src/lib/gitdate.mjs';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

/**
 * IndexNow needs a verification file at the site root whose name and contents
 * are both the key. The key lives in the Vercel environment, not in the repo,
 * so the file is written into public/ at the start of each build and picked up
 * by Astro's normal static copy. public/*.txt keys are gitignored.
 */
const indexnowKeyFile = {
  name: 'indexnow-key-file',
  hooks: {
    'astro:build:start': () => {
      if (!INDEXNOW_KEY) return;
      mkdirSync('public', { recursive: true });
      writeFileSync(`public/${INDEXNOW_KEY}.txt`, INDEXNOW_KEY, 'utf8');
    },
  },
};

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
      // <lastmod> comes from the page's last git commit, so it reflects a real
      // content change rather than the deploy time of an unrelated build.
      serialize: (item) => {
        const lastmod = lastmodForUrl(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
    // Only wire IndexNow up when a key is present, so local builds stay silent
    // and never submit URLs.
    ...(INDEXNOW_KEY ? [indexnowKeyFile, indexnow({ key: INDEXNOW_KEY })] : []),
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
