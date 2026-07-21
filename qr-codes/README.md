# QR artwork — The Commercial Edge, session 01

Co-branded **StratumCore × Joblin Partners**. Every piece carries the lockup:
the two marks sit at equal weight, joined by a recessive ×, with neither
subordinate to the other.

The Joblin mark is embedded in each SVG as a base64 PNG, so the files stay
self-contained — hand the printer one SVG per piece and nothing else.

## ⚠️ The Joblin logo is raster, not vector

The supplied asset is a **282 × 110px PNG**. That caps how large it can print:

| printed width | effective resolution |
|---|---|
| 20mm | 358 dpi |
| **25mm** (seat card) | **283 dpi** ✓ |
| 30mm | 239 dpi |
| 40mm | 179 dpi |

The current artwork is sized to stay at or near 300dpi, so it will print
cleanly as-is. **But if any piece is scaled up — a pull-up banner, an A4
flyer, a larger tent card — the logo will visibly soften.** For anything
bigger than the current set, ask Joblin Partners for vector artwork (SVG,
EPS, AI or PDF) and swap it into `generate-qr.mjs`.

Joblin's brand gold is `#BBA263`, sampled from the supplied asset.

Regenerate with:

```
node generate-qr.mjs     # writes SVG to qr-codes/short-url/
node render-qr-png.mjs   # renders those SVGs to PNG
```

Add `--full-url` to either command to produce the `full-url/` set instead.

The SVG is the print master — true vector, scales to any size. The PNGs are
rendered from those same SVGs, so the two cannot drift apart.

## Which set to print: `short-url/`

Both sets land the visitor in the same place with the same tracking. They
differ only in what the code physically encodes:

| | encodes | modules @ EC H | module size on the seat card |
|---|---|---|---|
| `short-url/` | `stratumcore.com.au/t` | 33 | **2.44mm** |
| `full-url/` | the full tagged URL | 57 | 1.41mm |

`/t` is a 301 redirect defined in `astro.config.mjs` that reattaches
`?src=card` and all four UTM parameters server-side. The subscriber still
lands in `commercial-edge-01`, and GA4 still attributes the campaign.

Shorter URL → fewer modules → bigger modules at the same print size → scans
from further away. That is the whole reason the short set exists, and it is
the difference between meeting the 1m target and missing it.

**`short-url/` depends on `/t` being deployed.** If the site ships without
that redirect, every printed short-URL code is dead. Deploy first, scan the
proof, then send to print. `full-url/` has no such dependency — it is the
fallback if the redirect cannot ship in time.

## The three pieces

| artwork | size | QR | EC | module | scan: good light / dim |
|---|---|---|---|---|---|
| `seat-card` | A5, 148×210mm | 104mm | H | 2.44mm | **~1.0m / ~0.6m** |
| `holding-screen` | 1920×1080px | 520px | Q | — | ~3.3m / ~2.0m on a 55" screen |
| `name-card-back` | 85×55mm | 36mm | H | 0.88mm | ~0.36m / ~0.22m |

Print PNGs are 300dpi. The holding screen is native 1920×1080 — use the PNG
for slide decks, the SVG if the venue can take vector.

### Scan distances are estimates, not measurements

These come from the planning heuristic that a code scans at roughly 10× its
own width in good light, derated to ~6× for dim light. **Nobody has run the
printed test.** Print one seat card, stand 1m away in the actual venue
lighting, and scan it with a mid-range phone before committing to a run.

### The name card will not scan from 1m

This is physics, not layout. At 1m a code needs ~2.4mm modules, which means a
~100mm code. An 85×55mm card cannot carry one at any error-correction level —
36mm is already the largest that leaves a usable text column. It reaches
~0.36m, which is correct for how a name card is actually used: handed over and
scanned at arm's length. If you need 1m from a card-sized piece, the card has
to get bigger.

## Print notes

- **Quiet zone** — 4 modules of white is built into every code. Do not crop
  or place anything inside it.
- **Contrast** — codes are near-black `#1C1C1E` on white. Do not print on
  coloured or textured stock, and never invert (light code on dark ground):
  most scanners will not read it.
- **Logo variants** — the seat card and name card use Joblin's light-background
  logo (black wordmark); the holding screen uses the dark-background variant
  (white wordmark). Do not swap them: the wrong variant disappears into its
  own background.
- **Finish** — matte. Gloss under venue lighting causes specular glare that
  defeats the scan.
- **Bleed** — the SVGs are trim-size with no bleed. The teal edge bars run to
  the trim edge, so ask the printer to add 3mm bleed, or accept a white
  hairline if trimming drifts.

## Typed fallback

Every piece carries `stratumcore.com.au/toolkit` as the human-readable line.
Note that typing it lands the visitor in the **`toolkit-organic`** group, not
`commercial-edge-01` — the group is driven by `?src=card`, which a typed URL
does not carry. Scans attribute correctly; typed visits do not. Use
`stratumcore.com.au/t` as the printed fallback instead if event attribution
matters more than the line being self-explanatory.
