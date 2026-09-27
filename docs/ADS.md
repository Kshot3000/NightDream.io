# Ad revenue setup — NightDream.io

The site is **ad-ready**. Slots are in place; nothing renders until you add a
publisher ID.

## Slots (all CLS-safe, hidden until ads are enabled)

| Slot | Location |
| --- | --- |
| `ov-top` | Overview, under the hero |
| `ov-bottom` | Overview, bottom of page |
| `mk-top` | Markets, under the page head |
| `tk-bottom` | Token page, under content |
| `ft-top` | Above the footer, every page |

Add more anywhere with: `<div class="ad-slot" data-ad="unique-key" aria-hidden="true"></div>`

## Going live (Google AdSense)

1. Apply at <https://www.google.com/adsense/> using the live site URL.
   Approval usually takes a few days; AdSense wants real content and traffic,
   so keep the site live and linked from your X post.
2. In your AdSense account find your publisher ID: `ca-pub-XXXXXXXXXXXXXXXX`.
3. Paste it into `js/ads.js` → `ADS_CLIENT`.
4. Update `ads.txt` at the repo root:
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f75f9b6736ff2d3f`
5. Commit + push. Slots fill automatically on next deploy.

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
