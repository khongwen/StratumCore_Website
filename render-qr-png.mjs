// Renders the QR SVGs to high-res PNG via headless Chrome over the DevTools
// Protocol. Print artwork goes out at 300dpi; the holding screen at native
// 1920×1080. Run generate-qr.mjs first.
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import http from 'http';

const CHROME = 'C:/Users/khong/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe';
const port = 9225;
const DPI = 300;

const variant = process.argv.includes('--full-url') ? 'full-url' : 'short-url';
const dir = join('qr-codes', variant);
if (!existsSync(dir)) { console.error(`${dir} not found — run generate-qr.mjs first`); process.exit(1); }

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${port}`,
  '--user-data-dir=./.cdp-profile-qr',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = p => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port, path: p }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

let target;
for (let i = 0; i < 40; i++) {
  try { const l = await getJSON('/json'); target = l.find(t => t.type === 'page'); if (target) break; } catch {}
  await sleep(250);
}
if (!target) { console.error('no devtools target'); chrome.kill(); process.exit(1); }

const sock = new globalThis.WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise(res => {
  const i = ++id; pending.set(i, res);
  sock.send(JSON.stringify({ id: i, method, params }));
});
await new Promise(r => sock.addEventListener('open', r));
sock.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
});

await send('Page.enable');
await send('Runtime.enable');

for (const file of readdirSync(dir).filter(f => f.endsWith('.svg'))) {
  const svg = readFileSync(join(dir, file), 'utf8');
  const mmW = svg.match(/width="([\d.]+)mm"/);
  const mmH = svg.match(/height="([\d.]+)mm"/);

  let cssW, cssH, scale;
  if (mmW && mmH) {
    // Chrome lays out mm at 96dpi (1mm = 96/25.4 px). Scale up to hit 300dpi.
    cssW = Math.round(parseFloat(mmW[1]) * 96 / 25.4);
    cssH = Math.round(parseFloat(mmH[1]) * 96 / 25.4);
    scale = DPI / 96;
  } else {
    cssW = parseInt(svg.match(/width="(\d+)"/)[1]);
    cssH = parseInt(svg.match(/height="(\d+)"/)[1]);
    scale = 1; // holding screen is already at its native pixel size
  }

  const html = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>${svg}`;

  await send('Emulation.setDeviceMetricsOverride', {
    width: cssW, height: cssH, deviceScaleFactor: scale, mobile: false,
  });
  await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
  await sleep(900); // let Georgia load and the vector rasterise

  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
  const out = join(dir, file.replace(/\.svg$/, '.png'));
  writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(`${out}  ${Math.round(cssW * scale)}×${Math.round(cssH * scale)}px${mmW ? ` (${DPI}dpi)` : ''}`);
}

sock.close(); chrome.kill();
process.exit(0);
