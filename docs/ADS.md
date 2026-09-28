# Ad revenue setup — NightDream.xyz

The site is **LIVE with AdSense** (verified 2026-09-27).

- Publisher ID: `ca-pub-3316742664595468`
- AdSense script tag + `google-adsense-account` meta tag are in `<head>` (index.html).
- `ads.txt` at root: `google.com, pub-3316742664595468, DIRECT, f08c47fec0942fa0`
- `js/ads.js` fills the slots below automatically (it skips injecting the library
  tag since `<head>` already has it — never load it twice).

## Slots (all CLS-safe)

Unit IDs are created in AdSense and wired in `js/ads.js` (`AD_UNITS`).

| Slot | Ad unit ID | Location |
| --- | --- | --- |
| `ov-top` | `3123419917` | Overview, under the hero |
| `ov-bottom` | `8156254747` | Overview, bottom of page |
| `mk-top` | `6843173077` | Markets, under the page head |
| `tk-bottom` | `6634280358` | Token page, under content |
| `ft-top` | `6027027266` | Above the footer, every page |

Add more anywhere with: `<div class="ad-slot" data-ad="unique-key" aria-hidden="true"></div>`

## Later (when traffic grows)

- **Ezoic / Mediavine Journey**: higher RPMs than AdSense once you clear their
  traffic minimums — same `ads.txt` mechanism, they give you the lines to add.
- **Crypto-native networks** (e.g. Coinzilla, Bitmedia) accept crypto dashboards
  and often pay better for this niche; they use their own script tags, which can
  slot into `js/ads.js` the same way.

## Rules of the road

- Never click your own ads — fastest way to get banned.
- One ad system at a time per slot (no stacking AdSense + another network in
  the same container).
- Keep `ads.txt` at the domain root; AdSense crawls it during review.
