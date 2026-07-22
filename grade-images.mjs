// Bakes the house colour grade into optimised image assets.
//
// One grade for every photograph on the site so the phone-shot portraits and
// the site candid read as a single deliberate system:
//   · gentle contrast lift          · saturation pulled back to ~0.80
//   · warm tone tied to --bg        · matching paper grain
// Baked here rather than applied as runtime CSS filters — filters cost a
// composite layer on every paint and can't be cached.
//
//   node grade-images.mjs
//
// Ungraded originals live in assets-src/ (outside public/) so the large source
// files are not shipped to production — only the derived, optimised output is.
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const OUT = 'public/images';
mkdirSync(OUT, { recursive: true });

// --bg #F6F4EF as a highlight wash; a warm shadow to match --ink #1C1B19
const WARM_HIGH = { r: 246, g: 238, b: 222 };
const WARM_LOW  = { r: 32,  g: 28,  b: 22  };

const grainSVG = (w, h, opacity) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
     <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
     <feColorMatrix type="saturate" values="0"/></filter>
     <rect width="${w}" height="${h}" filter="url(#n)" opacity="${opacity}"/>
   </svg>`);

// Radial falloff, transparent at centre to dark at the corners. The studio
// headshot has this naturally; the outdoor frame is flat and high-key, so a
// matched vignette is what settles the two into the same tonal world.
const vignetteSVG = (w, h, strength) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
     <defs><radialGradient id="v" cx="50%" cy="42%" r="78%">
       <stop offset="45%" stop-color="rgb(26,22,18)" stop-opacity="0"/>
       <stop offset="100%" stop-color="rgb(26,22,18)" stop-opacity="${strength}"/>
     </radialGradient></defs>
     <rect width="${w}" height="${h}" fill="url(#v)"/>
   </svg>`);

const solid = (w, h, c, alpha) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
     <rect width="${w}" height="${h}" fill="rgb(${c.r},${c.g},${c.b})" opacity="${alpha}"/>
   </svg>`);

/**
 * Neutralise a backdrop by hue instead of desaturating the whole frame.
 *
 * Wen's frame is a bright green lawn; Calvin's is a warm neutral studio wall.
 * Pulling global saturation down far enough to kill the lawn also drains the
 * skin, which is what made the first attempt look washed out. Foliage sits at
 * roughly 60–185° and skin sits at 10–50°, so the two do not overlap: this
 * targets only the green band, leaving face, shirt, suit and tie untouched.
 *
 * The mask is feathered at both hue edges and weighted by saturation, so
 * near-neutral pixels (the sky, the light pole, shadow) are left alone and
 * green spill around the subject's edges falls off smoothly rather than
 * cutting a hard outline.
 */
async function neutraliseBackdrop(buf, { loHue = 74, hiHue = 190, feather = 14,
                                         satKeep = 0.13, warmHue = 44, warmPull = 0.65 } = {}) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;

  for (let i = 0; i < data.length; i += ch) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const s = mx === 0 ? 0 : d / mx;
    if (d === 0 || s < 0.12) continue;            // already neutral, leave it

    let hue;
    if (mx === r)      hue = 60 * (((g - b) / d) % 6);
    else if (mx === g) hue = 60 * ((b - r) / d + 2);
    else               hue = 60 * ((r - g) / d + 4);
    if (hue < 0) hue += 360;

    // feathered membership of the green band
    let m = 0;
    if (hue > loHue - feather && hue < hiHue + feather) {
      m = 1;
      if (hue < loHue) m = (hue - (loHue - feather)) / feather;
      else if (hue > hiHue) m = ((hiHue + feather) - hue) / feather;
    }
    if (m <= 0) continue;
    m *= Math.min(1, (s - 0.12) / 0.18);          // ramp in with saturation
    if (m <= 0) continue;

    // desaturate hard, and warm what little chroma survives so the backdrop
    // lands on the same stone/khaki as the studio wall rather than grey-green
    const nS = s * (1 - m * (1 - satKeep));
    let dh = warmHue - hue;
    if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
    const nH = (hue + m * warmPull * dh + 360) % 360;

    const v = mx, c = v * nS, x = c * (1 - Math.abs(((nH / 60) % 2) - 1)), mm = v - c;
    const k = Math.floor(nH / 60) % 6;
    const rgb = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
    data[i]     = Math.round((rgb[0] + mm) * 255);
    data[i + 1] = Math.round((rgb[1] + mm) * 255);
    data[i + 2] = Math.round((rgb[2] + mm) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png().toBuffer();
}

/**
 * The house grade: contrast lift, desaturate, warm, grain.
 * The `duotone` branch is kept but no longer emitted — colour was chosen for
 * every image on the site. Pass `duotone: true` to an emit() call to revive it.
 */
async function grade(input, { w, h, position = 'centre', duotone = false, sat = 0.80,
                              wash = 0.10, a = 1.09, b = -9, backdrop = null, vignette = 0 } = {}) {
  let img = sharp(input).resize({ width: w, height: h, fit: 'cover', position });
  if (backdrop) img = sharp(await neutraliseBackdrop(await img.png().toBuffer(), backdrop));

  if (duotone) {
    // Warm monochrome: strips the phone-camera colour cast entirely and
    // reads as an editorial plate rather than a snapshot.
    // A real two-point ramp, not a tint. recomb() collapses to luminance and
    // scales each channel in one pass (greyscale() would drop to one band and
    // linear cannot expand it back), then the offsets set the shadow end:
    //   luminance 0   -> (30, 26, 20)   warm near-black
    //   luminance 255 -> (232, 216, 188) warm cream
    // Compositing a dark colour in multiply only spread the channels ~4%,
    // which is why the first attempt still read as plain greyscale.
    const lum = [0.2126, 0.7152, 0.0722];
    const gain = [0.792, 0.745, 0.659];
    img = img.linear(1.22, -26)
             .recomb(gain.map(a => lum.map(l => l * a)))
             .linear([1, 1, 1], [30, 26, 20]);
    const base = await img.png().toBuffer();
    img = sharp(base).composite([
      { input: grainSVG(w, h, 0.05), blend: 'overlay' },
    ]);
  } else {
    // linear(a, b) defaults to the house contrast lift, but portraits pass in
    // per-image values solved by matchStats() so both land on one target.
    img = img.modulate({ saturation: sat, brightness: 1.0 }).linear(a, b);
    const base = await img.png().toBuffer();
    img = sharp(base).composite([
      ...(vignette ? [{ input: vignetteSVG(w, h, vignette), blend: 'over' }] : []),
      { input: solid(w, h, WARM_HIGH, wash), blend: 'soft-light' },
      { input: grainSVG(w, h, 0.045),        blend: 'overlay'    },
    ]);
  }
  return img;
}

/**
 * Mean / stddev of luminance and mean saturation over a region.
 * `box` is fractional [x0, y0, x1, y1]; the default covers the whole frame.
 * Portraits are compared over the FACE box only — matching whole-frame
 * averages just averages in two legitimately different backdrops.
 */
async function stats(input, ratio, position, box = [0, 0, 1, 1], pre = null) {
  let pipe = sharp(input).resize({ width: 560, height: Math.round(560 / ratio), fit: 'cover', position });
  if (pre) pipe = sharp(await neutraliseBackdrop(await pipe.png().toBuffer(), pre));
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  const [fx0, fy0, fx1, fy1] = box;
  const X0 = Math.floor(info.width * fx0),  X1 = Math.ceil(info.width * fx1);
  const Y0 = Math.floor(info.height * fy0), Y1 = Math.ceil(info.height * fy1);
  let n = 0, sumL = 0, sumL2 = 0, sumS = 0;
  for (let y = Y0; y < Y1; y += 2) {
    for (let x = X0; x < X1; x += 2) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      sumL += L; sumL2 += L * L; sumS += mx === 0 ? 0 : (mx - mn) / mx; n++;
    }
  }
  const mean = sumL / n;
  return { mean, sd: Math.sqrt(sumL2 / n - mean * mean), sat: sumS / n };
}

/**
 * Solve the per-image saturation factor and linear(a, b) that land a source on
 * a shared target. Applying one identical transform to two photographs shot in
 * different conditions cannot match them — Wen's frame measured 0.489 mean
 * saturation and 56.1 sd against Calvin's 0.267 and 40.9, so the same grade
 * leaves the gap roughly where it started. Normalising each toward the target
 * is what actually produces a matched pair.
 */
async function matchStats(input, ratio, position, target, box, pre) {
  const s = await stats(input, ratio, position, box, pre);
  // Clamped: an unclamped solve is what flattened Wen (a=0.713 crushed his
  // contrast and b=+34.8 lifted the blacks into grey). Exposure and contrast
  // may be nudged to match, not rebuilt.
  const a = Math.min(1.18, Math.max(0.88, target.sd / s.sd));
  const b = Math.min(34, Math.max(-34, target.mean - a * s.mean));
  console.log(`    ${input.split('/').pop().padEnd(30)} face meanL=${s.mean.toFixed(1)} sd=${s.sd.toFixed(1)} sat=${s.sat.toFixed(3)}  ->  linear a=${a.toFixed(3)} b=${b.toFixed(1)}`);
  return { a, b };
}

async function emit(input, name, opts, widths) {
  for (const w of widths) {
    const h = Math.round(w / opts.ratio);
    const g = await grade(input, { w, h, position: opts.position, duotone: opts.duotone,
                                   sat: opts.sat, wash: opts.wash, a: opts.a, b: opts.b,
                                   backdrop: opts.backdrop, vignette: opts.vignette });
    const buf = await g.png().toBuffer();
    await sharp(buf).webp({ quality: 78, effort: 6 }).toFile(`${OUT}/${name}-${w}.webp`);
    await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}-${w}.jpg`);
  }
  console.log(`  ${name}  ${widths.join(', ')}`);
}

// The mismatch is the BACKDROP, not the people. Wen's lawn is neutralised by
// hue so it lands on the same stone as Calvin's studio wall; both then take
// the same light house grade. Skin is never globally desaturated.
const FACE_BOX = [0.30, 0.12, 0.70, 0.46];   // fractional, head-and-shoulders
const LAWN = { loHue: 74, hiHue: 190, feather: 14, satKeep: 0.13, warmHue: 44, warmPull: 0.65 };
const HOUSE = { sat: 0.88, wash: 0.16 };     // light, shared by both

console.log('Portraits — backdrop neutralised by hue, faces matched:');
// `position: 'top'` keeps the head anchored; both source frames are
// head-and-shoulders with headroom, so a centre crop would cut foreheads.
const calvinFace = await stats('public/profile/Calvin Profile picture.jpg', 0.8, 'top', FACE_BOX);
console.log(`    target (Calvin's face)         meanL=${calvinFace.mean.toFixed(1)} sd=${calvinFace.sd.toFixed(1)} sat=${calvinFace.sat.toFixed(3)}`);

const wenFix = await matchStats('public/profile/Wen Khong Profile Pic 3.jpg', 0.8, 'top', calvinFace, FACE_BOX, LAWN);
await emit('public/profile/Wen Khong Profile Pic 3.jpg', 'portrait-wen',
  { ratio: 0.8, position: 'top', backdrop: LAWN, vignette: 0.30, ...HOUSE, ...wenFix }, [560, 840]);
await emit('public/profile/Calvin Profile picture.jpg', 'portrait-calvin',
  { ratio: 0.8, position: 'top', vignette: 0.12, ...HOUSE, a: 1.0, b: 0 }, [560, 840]);

console.log('Site candid (hero) — colour grade:');
await emit('assets-src/hero-open-cut.png', 'hero-open-cut-graded',
  { ratio: 1.5 }, [640, 1024, 1536]);

console.log('done');
