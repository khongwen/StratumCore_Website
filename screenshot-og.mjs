import { createRequire } from 'module';
const puppeteer = createRequire(import.meta.url)('C:/Users/khong/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  executablePath: 'C:/Users/khong/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox'],
});

async function capture(url, outFile) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outFile, fullPage: false, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await page.close();
  console.log(`Saved: ${outFile}`);
}

await capture('http://localhost:3000/og-image-home.html',     join(__dirname, 'og-image-home.png'));
await capture('http://localhost:3000/og-image-training.html', join(__dirname, 'og-image-training.png'));

await browser.close();
