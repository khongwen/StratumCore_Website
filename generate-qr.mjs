// Generates the printed/screen QR artwork for the Commercial Edge session.
//
//   node generate-qr.mjs            → short-URL artwork (recommended, scannable at 1m)
//   node generate-qr.mjs --full-url → same artwork encoding the full tagged URL
//
// Writes vector SVG (the print master) to qr-codes/. PNGs are rendered from
// those same SVGs by render-qr-png.mjs, so the two can never drift apart.
import QRCode from 'qrcode';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const FULL_URL  = 'https://www.stratumcore.com.au/toolkit?src=card&utm_source=joblin-event&utm_medium=qr&utm_campaign=commercial-edge-01';
const SHORT_URL = 'https://stratumcore.com.au/t';

const useFull = process.argv.includes('--full-url');
const URL_TO_ENCODE = useFull ? FULL_URL : SHORT_URL;
const outDir = join('qr-codes', useFull ? 'full-url' : 'short-url');
mkdirSync(outDir, { recursive: true });

const INK    = '#1C1C1E';
const TEAL   = '#00C9BB';
const ORANGE = '#D4751A';
const FALLBACK_TEXT = 'stratumcore.com.au/toolkit';

/**
 * Build the QR as a single SVG <path>. One path rather than thousands of
 * <rect>s keeps the file small and prints crisply at any scale.
 * Returns the path data plus the module count, so callers can size it.
 */
function qrPath(url, ec, sizeMm, quietModules = 4) {
  const qr = QRCode.create(url, { errorCorrectionLevel: ec });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const total = n + quietModules * 2;
  const m = sizeMm / total; // mm per module, quiet zone included

  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!data[y * n + x]) continue;
      const px = (x + quietModules) * m;
      const py = (y + quietModules) * m;
      // Slight overlap (0.02mm) closes hairline seams between adjacent
      // modules that some RIPs render at high zoom.
      d += `M${px.toFixed(3)},${py.toFixed(3)}h${(m + 0.02).toFixed(3)}v${(m + 0.02).toFixed(3)}h-${(m + 0.02).toFixed(3)}z`;
    }
  }
  return { d, modules: n, total, moduleMm: m, version: qr.version };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ─── Co-brand lockup ──────────────────────────────────────────────
 * StratumCore × Joblin Partners, as an equal-weight pairing.
 *
 * The Joblin mark is embedded as a base64 PNG so each SVG stays a single
 * self-contained file the printer can drop straight in.
 */
const JOBLIN = {
  light: readFileSync('public/brand_assets/joblin-partners-light-bg.png').toString('base64'),
  dark:  readFileSync('public/brand_assets/joblin-partners-dark-bg.png').toString('base64'),
};

const JOBLIN_ASPECT = 282 / 110; // 2.564

// Georgia metrics, measured rather than estimated: "StratumCore" in bold is
// 6.695em wide with a 0.71em cap height; the × glyph is 0.643em wide.
const SC_WIDTH_EM = 6.695;
const SC_CAP_EM   = 0.71;
const X_WIDTH_EM  = 0.643;

/**
 * Joblin logo height as a multiple of the StratumCore font size.
 *
 * Deliberately below cap-height parity (which would be ~2.17). The Joblin
 * mark sets its name on two lines, so matching cap heights exactly would give
 * it roughly double the visual mass of a single-line wordmark and make
 * StratumCore read as the junior partner. 1.7 is where the two balance.
 */
const JOBLIN_H_RATIO = 1.7;

/** How far the lockup extends above / below the StratumCore baseline. */
const lockupRise = (fs) => SC_CAP_EM * fs / 2 + JOBLIN_H_RATIO * fs / 2;
const lockupDrop = (fs) => JOBLIN_H_RATIO * fs / 2 - SC_CAP_EM * fs / 2;

/**
 * Fail the build if two elements overlap. The lockup is taller than the
 * wordmark it replaced — it extends above the baseline as well as below — so
 * a baseline that looks safe can still collide with the line above it.
 */
function assertClear(label, topOfLower, bottomOfUpper, min = 3) {
  const gap = topOfLower - bottomOfUpper;
  if (gap < min) {
    throw new Error(`${label}: elements overlap or crowd — gap is ${gap.toFixed(2)}mm, need >= ${min}mm`);
  }
}

/** Total lockup width for a given StratumCore font size. */
function cobrandWidth(fs) {
  return SC_WIDTH_EM * fs + fs * 0.62 * 2 + X_WIDTH_EM * (fs * 0.72) + JOBLIN_H_RATIO * fs * JOBLIN_ASPECT;
}

/**
 * Build the lockup with the StratumCore baseline at `y`. Pass either `cx` to
 * centre it or `left` to align its leading edge. `fs` is the StratumCore font
 * size in user units (mm for print artwork, px for the screen).
 */
function cobrand({ cx, left, y, fs, dark = false, scColor = INK }) {
  const scW = SC_WIDTH_EM * fs;
  const xFs = fs * 0.72;                 // the × recedes; it is a joiner, not a mark
  const xW  = X_WIDTH_EM * xFs;
  const gap = fs * 0.62;

  const jH = JOBLIN_H_RATIO * fs;
  const jW = jH * JOBLIN_ASPECT;

  const x0 = left !== undefined ? left : cx - cobrandWidth(fs) / 2;

  // Align the logo's centre to the wordmark's cap centre, not its baseline —
  // baseline alignment would leave the two-line mark sitting visibly low.
  const capCentre = y - SC_CAP_EM * fs / 2;
  const jY = capCentre - jH / 2;

  const xPos = x0 + scW + gap + xW / 2;
  // × is centred on the maths axis, ~0.31em above the baseline.
  const xBaseline = capCentre + 0.31 * xFs;

  return `<text x="${x0.toFixed(2)}" y="${y.toFixed(2)}" font-family="Georgia, serif" font-size="${fs.toFixed(2)}" font-weight="bold" fill="${scColor}">Stratum<tspan fill="${TEAL}">Core</tspan></text>
  <text x="${xPos.toFixed(2)}" y="${xBaseline.toFixed(2)}" text-anchor="middle" font-family="Georgia, serif" font-size="${xFs.toFixed(2)}" fill="${dark ? 'rgba(255,255,255,0.30)' : 'rgba(28,28,30,0.28)'}">&#215;</text>
  <image x="${(x0 + scW + gap + xW + gap).toFixed(2)}" y="${jY.toFixed(2)}" width="${jW.toFixed(2)}" height="${jH.toFixed(2)}" href="data:image/png;base64,${dark ? JOBLIN.dark : JOBLIN.light}" preserveAspectRatio="xMidYMid meet"/>`;
}

/**
 * Card 1 — seat card. A5 portrait tent card, EC H, largest code.
 *
 * A5 rather than A6: the 1m scan target needs ~2.4mm modules, which means a
 * ~110mm code. That will not fit on an A6 card alongside the headline and
 * fallback line, so the card grows instead of the code shrinking.
 */
function seatCard() {
  const W = 148, H = 210; // A5
  // 104mm keeps ~2.5mm modules (still past the 1m target) while leaving room
  // below the code for the fallback line and the wordmark.
  const qrSize = 104;
  const q = qrPath(URL_TO_ENCODE, 'H', qrSize);
  const qx = (W - qrSize) / 2;
  const qy = 75;

  // Bottom block: fallback URL, then the co-brand lockup.
  const fallbackFs = 5.2;
  const fallbackY  = qy + qrSize + 6;
  const lockFs     = 5.8;
  const lockY      = H - 12;

  assertClear('seat-card fallback → lockup',
    lockY - lockupRise(lockFs),      // top of the lockup
    fallbackY + fallbackFs * 0.21,   // descender of the fallback line
    4);
  assertClear('seat-card lockup → trim', H, lockY + lockupDrop(lockFs), 8);

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="0" y="0" width="${W}" height="4" fill="${TEAL}"/>

  <text x="${W / 2}" y="26" text-anchor="middle" font-family="Georgia, serif" font-size="4.1" font-weight="bold" letter-spacing="0.7" fill="${ORANGE}">THE COMMERCIAL EDGE — SESSION 01</text>

  <text x="${W / 2}" y="43" text-anchor="middle" font-family="Georgia, serif" font-size="10.6" font-weight="bold" fill="${INK}">The overheads</text>
  <text x="${W / 2}" y="56" text-anchor="middle" font-family="Georgia, serif" font-size="10.6" font-weight="bold" fill="${INK}">review toolkit</text>

  <rect x="${W / 2 - 11}" y="64" width="22" height="1" fill="${TEAL}"/>

  <text x="${W / 2}" y="74" text-anchor="middle" font-family="Georgia, serif" font-size="4.7" fill="#555555">Scan for today’s toolkit. Two minutes to your inbox.</text>

  <g transform="translate(${qx}, ${qy})"><path d="${q.d}" fill="${INK}"/></g>

  <text x="${W / 2}" y="${fallbackY}" text-anchor="middle" font-family="Georgia, serif" font-size="${fallbackFs}" fill="${INK}">${FALLBACK_TEXT}</text>

  ${cobrand({ cx: W / 2, y: lockY, fs: lockFs })}
</svg>`, meta: { name: 'seat-card', ...q, widthMm: W, heightMm: H, qrSizeMm: qrSize, ec: 'H' } };
}

/** Card 2 — holding screen. 1920×1080, dark brand background. */
function holdingScreen() {
  const W = 1920, H = 1080;
  // Screens are emissive and high-contrast, so EC Q buys margin without
  // pushing the module count as far as H does.
  const qrSize = 520;
  const q = qrPath(URL_TO_ENCODE, 'Q', qrSize);
  const panel = qrSize + 60;
  const px = W - panel - 150;
  const py = (H - panel) / 2;

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <rect x="0" y="0" width="${W}" height="8" fill="${TEAL}"/>

  <text x="150" y="330" font-family="Georgia, serif" font-size="26" font-weight="bold" letter-spacing="4.6" fill="${ORANGE}">THE COMMERCIAL EDGE — SESSION 01</text>

  <text x="150" y="430" font-family="Georgia, serif" font-size="86" font-weight="bold" fill="#FFFFFF">The overheads</text>
  <text x="150" y="524" font-family="Georgia, serif" font-size="86" font-weight="bold" fill="#FFFFFF">review toolkit</text>

  <rect x="150" y="566" width="76" height="5" fill="${TEAL}"/>

  <text x="150" y="632" font-family="Georgia, serif" font-size="31" fill="rgba(255,255,255,0.72)">Scan the code for today’s toolkit.</text>
  <text x="150" y="678" font-family="Georgia, serif" font-size="31" fill="rgba(255,255,255,0.72)">Two minutes to your inbox.</text>

  <text x="150" y="762" font-family="Georgia, serif" font-size="27" fill="rgba(255,255,255,0.5)">${FALLBACK_TEXT}</text>

  ${cobrand({ left: 150, y: 905, fs: 38, dark: true, scColor: '#FFFFFF' })}

  <!-- QR always sits on a white panel: never invert a QR on a dark ground -->
  <rect x="${px}" y="${py}" width="${panel}" height="${panel}" rx="10" fill="#FFFFFF"/>
  <g transform="translate(${px + 30}, ${py + 30})"><path d="${q.d}" fill="${INK}"/></g>
</svg>`, meta: { name: 'holding-screen', ...q, widthMm: W, heightMm: H, qrSizeMm: qrSize, ec: 'Q', unit: 'px' } };
}

/** Card 3 — name-card back. 85×55mm, standard business card. */
function nameCardBack() {
  const W = 85, H = 55;
  // 36mm is the largest code that still leaves a usable 35mm text column.
  // A business card cannot reach the 1m target at any size — see README.
  const qrSize = 36;
  const q = qrPath(URL_TO_ENCODE, 'H', qrSize);
  const qx = W - qrSize - 5;
  const qy = (H - qrSize) / 2;
  const textW = qx - 7; // 35mm of usable column; type is sized to fit it

  // Largest lockup that fits the text column without crowding the QR.
  const nameCardFs = Math.min(3.3, (textW - 1) / (cobrandWidth(1)));
  const nameLockY = 48;

  assertClear('name-card fallback → lockup',
    nameLockY - lockupRise(nameCardFs),
    40 + 2.5 * 0.21,                     // fallback line sits at y=40, fs 2.5
    2.5);
  assertClear('name-card lockup → trim', H, nameLockY + lockupDrop(nameCardFs), 4);

  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <rect x="0" y="0" width="2" height="${H}" fill="${TEAL}"/>

  <text x="7" y="13.5" font-family="Georgia, serif" font-size="2.2" font-weight="bold" letter-spacing="0.3" fill="${ORANGE}">THE COMMERCIAL EDGE</text>

  <text x="7" y="23" font-family="Georgia, serif" font-size="4.3" font-weight="bold" fill="${INK}">The overheads</text>
  <text x="7" y="28.6" font-family="Georgia, serif" font-size="4.3" font-weight="bold" fill="${INK}">review toolkit</text>

  <rect x="7" y="32.4" width="9" height="0.55" fill="${TEAL}"/>

  <text x="7" y="40" font-family="Georgia, serif" font-size="2.5" fill="#555555">${FALLBACK_TEXT}</text>

  ${cobrand({ left: 7, y: nameLockY, fs: nameCardFs })}

  <g transform="translate(${qx}, ${qy})"><path d="${q.d}" fill="${INK}"/></g>
</svg>`, meta: { name: 'name-card-back', ...q, widthMm: W, heightMm: H, qrSizeMm: qrSize, ec: 'H', textW } };
}

console.log(`Encoding: ${URL_TO_ENCODE}\n`);
const rows = [];
for (const build of [seatCard, holdingScreen, nameCardBack]) {
  const { svg, meta } = build();
  writeFileSync(join(outDir, `${meta.name}.svg`), svg);
  rows.push(meta);
}

console.log('artwork            EC  ver  modules  QR size  module   scan: good light / dim light');
for (const m of rows) {
  const unit = m.unit === 'px' ? 'px' : 'mm';
  let reach;
  if (unit === 'mm') {
    // Planning heuristic: a code scans at roughly 10× its own width in good
    // light. Dim light costs camera exposure and adds motion blur, so derate
    // to ~6×. These are estimates — only a printed test settles it.
    reach = `${((m.qrSizeMm * 10) / 1000).toFixed(1)}m / ${((m.qrSizeMm * 6) / 1000).toFixed(1)}m`;
  } else {
    // On a 55" display (~1220mm wide) a 1920px-wide image scales 0.635mm/px.
    const physMm = m.qrSizeMm * 0.635;
    reach = `${((physMm * 10) / 1000).toFixed(1)}m / ${((physMm * 6) / 1000).toFixed(1)}m on a 55" screen`;
  }
  console.log(
    `${m.name.padEnd(18)} ${m.ec}   v${String(m.version).padEnd(3)} ${String(m.modules).padEnd(8)} ` +
    `${String(m.qrSizeMm + unit).padEnd(8)} ${(m.moduleMm.toFixed(2) + unit).padEnd(8)} ${reach}`,
  );
}
console.log(`\nSVGs written to ${outDir}/`);
