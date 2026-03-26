import { createRequire } from 'module';
const puppeteer = createRequire(import.meta.url)('C:/Users/khong/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'temporary screenshots');
if (!existsSync(outDir)) mkdirSync(outDir);

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

// Auto-increment screenshot number
const existing = existsSync(outDir)
  ? readdirSync(outDir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'))
  : [];
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0'));
const n = nums.length ? Math.max(...nums) + 1 : 1;
const outFile = join(outDir, `screenshot-${n}${label}.png`);

const browser = await puppeteer.launch({
  executablePath: 'C:/Users/khong/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.screenshot({ path: outFile, fullPage: true });
await browser.close();
console.log(`Screenshot saved: ${outFile}`);
