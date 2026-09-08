/**
 * When a page last actually changed, read from git at build time.
 *
 * Used for two things: the sitemap's <lastmod>, and the "Last reviewed" line
 * printed at the foot of each page. Both want the same answer — the date the
 * source file last changed — so both read it from here.
 *
 * Vercel clones shallowly. If the last change to a file falls outside the
 * cloned depth, `git log` returns nothing; we fall back to the file's mtime,
 * which on a fresh clone is checkout time. That is wrong-but-recent rather
 * than missing, and it never fails the build. Set VERCEL_DEEP_CLONE (or
 * `git fetch --unshallow` in the build command) if exact dates matter.
 */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** One git call per file per build, not per import. */
const cache = new Map();

/** @param {string} relPath e.g. 'src/pages/about.astro' */
function resolveDate(relPath) {
  const abs = path.join(ROOT, relPath);

  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cI', '--', relPath],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (out) return new Date(out);
  } catch {
    // No git, or a shallow clone that does not reach this file's last change.
  }

  try {
    return statSync(abs).mtime;
  } catch {
    return new Date();
  }
}

function dateFor(relPath) {
  let d = cache.get(relPath);
  if (!d) {
    d = resolveDate(relPath);
    cache.set(relPath, d);
  }
  return d;
}

/**
 * The date a page last changed, in the two shapes the site needs.
 * @param {string} relPath repo-relative source path, e.g. 'src/pages/about.astro'
 * @returns {{ label: string, iso: string, date: Date }}
 *   label — "September 2026", for the visible "Last reviewed" line
 *   iso   — "2026-09-08", for schema.org dateModified and sitemap lastmod
 */
export function reviewedFor(relPath) {
  const date = dateFor(relPath);
  return {
    date,
    iso: date.toISOString().slice(0, 10),
    label: date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
  };
}

/**
 * Sitemap <lastmod> for a built URL. Maps the URL back to its source page:
 * https://site/about/ -> src/pages/about.astro, https://site/ -> index.astro.
 * @param {string} url
 * @returns {string|undefined} ISO 8601 timestamp, or undefined if unmapped
 */
export function lastmodForUrl(url) {
  let slug;
  try {
    slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
  } catch {
    return undefined;
  }
  const relPath = `src/pages/${slug || 'index'}.astro`;
  try {
    statSync(path.join(ROOT, relPath));
  } catch {
    return undefined;
  }
  return dateFor(relPath).toISOString();
}
