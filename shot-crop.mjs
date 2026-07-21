// Tight crop of a single element, scaled up, for judging fine detail.
// Usage: node shot-crop.mjs <url> <css-selector> <width> <label> [scale]
import { spawn } from 'child_process';
import { writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import http from 'http';

const CHROME = 'C:/Users/khong/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe';
const outDir = 'temporary screenshots';
const url = process.argv[2], sel = process.argv[3];
const w = parseInt(process.argv[4] || '375');
const label = process.argv[5] ? `-${process.argv[5]}` : '';
const scale = parseFloat(process.argv[6] || '4');
const port = 9226;

const nums = readdirSync(outDir).filter(f => /^screenshot-\d+/.test(f)).map(f => parseInt(f.match(/screenshot-(\d+)/)[1]));
const outFile = join(outDir, `screenshot-${Math.max(...nums) + 1}${label}.png`);

const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${port}`, '--user-data-dir=./.cdp-profile-crop',
  '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJSON = p => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port, path: p }, r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }).on('error', rej);
});

let t;
for (let i = 0; i < 40; i++) {
  try { const l = await getJSON('/json'); t = l.find(x => x.type === 'page'); if (t) break; } catch {}
  await sleep(250);
}
const sock = new globalThis.WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (m, p = {}) => new Promise(r => { const i = ++id; pending.set(i, r); sock.send(JSON.stringify({ id: i, method: m, params: p })); });
await new Promise(r => sock.addEventListener('open', r));
sock.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: scale, mobile: w < 640 });
await send('Page.navigate', { url });
await sleep(2200);

const { result } = await send('Runtime.evaluate', {
  expression: `(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
    return JSON.stringify({x:r.x,y:r.y,width:r.width,height:r.height})})()`,
  returnByValue: true,
});
const r = JSON.parse(result.value);
const pad = 10;
const { data } = await send('Page.captureScreenshot', {
  format: 'png', fromSurface: true, captureBeyondViewport: true,
  clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.width + pad * 2, height: r.height + pad * 2, scale },
});
writeFileSync(outFile, Buffer.from(data, 'base64'));
console.log('SAVED', outFile, `(${sel} @ ${scale}x)`);
sock.close(); chrome.kill(); process.exit(0);
