# NightDream.io ☀ ☾

**Cardano by day. Midnight by night.** An open, no-ads, fully static dashboard for the Cardano and
Midnight communities — live markets for Cardano Native Tokens (CNTs) in the daylight, a 554-token CNT
registry, and a Midnight privacy-chain watchlist after dark.

Built as the successor to the old community token dashboards that went dark (see the TapTools heritage
section on the site). No accounts, no trackers, no server-side state: everything runs in the visitor's
browser.

> **CNT = Cardano Native Token** — the on-chain assets (policy ID + name) that make up the Cardano
> token market, as opposed to ADA itself.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | The whole page: live tape, hero, stats, market table, add-token panel, registry, Midnight watchlist, TapTools heritage, about, donation card, token drawer, footer |
| `css/styles.css` | Day/Night (yin/yang) design system, glass panels, tape, drawer, responsive rules |
| `js/feeds.js` | Multi-source data layer: Minswap Aggregator (primary prices), tokens.cardano.org (official metadata), Charli3 (optional, key-gated) — no DOM access |
| `js/app.js` | Feed orchestration + merge, token discovery, registry engine, drawer, tape, refresh scheduler, watchlist persistence, QR + copy tools |
| `js/registry.js` | Bundled static data: 554-token CNT registry (tickers + asset IDs, from the Minswap community registry) and the curated 26-token top-board seed (DEXs, lending & synths, infra & oracles, gaming & launchpads, community & meme) |
| `js/qr.js` | Vendored QR code generator (qrcodejs) — donation QR works with zero external calls |
| `favicon.svg` | The yin/yang day-night mark |

## Features

- **Day · Cardano market** — live prices for the curated top of the ecosystem (26 tokens across DEXs
  & liquidity, lending & stablecoins, infrastructure & oracles, gaming & launchpads, and community &
  meme — MIN, SUNDAE, WRT, SPLASH, MILK, CSWAP, ADAX, USDM, INDY, LQ, iBTC, LENFI, WMTX, IAG, C3,
  NEXO, GERO, STUFF, RISE, OCC, CardStarter, REVU, SNEK, HOSKY, PEPE, DUM) plus any token you add —
  straight from Minswap's aggregated DEX pools (works for ANY Cardano asset ID), with 24h change /
  volume / market cap from CoinGecko where it lists the token. A small diamond by each price shows
  which source answered (hover for the tooltip; the ADA price is in the cell's title). Filter,
  sort (including **Category → volume**), and an on-chain asset link on every known asset.
- **Category badges** — every curated row wears a quiet pill (DEX / Lending & Synths / Infra &
  Oracles / Gaming & Launchpads / Community & Meme), the same grouping the community uses; the
  category sort groups the board in that exact order.
- **7-day charts in the table** — every CoinGecko-listed token carries an inline 7d sparkline
  (CoinGecko `sparkline=true`, 168 points) right in the market board.
- **Token dossier drawer** — click any market row for a sliding detail panel: price + source, ADA
  equivalent, 7d chart, 24h change / volume / market cap, on-chain asset ID with copy, and CExplorer /
  ADAstats / CoinGecko / project links. `Esc` closes it.
- **Live tape** — a scrolling price ticker across the top of the page, always current with the board.
- **Price flash** — on every refresh, prices that moved flash green/red so changes are visible at a
  glance without staring at the numbers.
- **Refresh now + countdown** — a manual refresh button with a busy spinner, plus a live
  "updated Xs ago · next in Ys" readout in the stats strip.
- **Header ADA pill** — live ADA price and 24h change always visible in the nav bar.
- **Add Token** — search by name or symbol (verified to actually live on Cardano), **or paste a full
  asset ID** (policy + name hex) to resolve it against the official Cardano Token Registry and Minswap
  and track it live — even tokens no index lists. Your list persists in `localStorage`; remove any
  token with one click.
- **CNT registry** — 554 Cardano Native Tokens with asset IDs, searchable client-side (matches are
  highlighted), with copy buttons, CExplorer / ADAstats links, and a **Track** button on every row
  that adds the token to the live market board. Ships with the page, so it needs no network at all.
- **Night · Midnight** — T1/T2/T3 privacy tier explainer with a public→private dial, a personal
  watchlist of upcoming Midnight tokens (saved in `localStorage`), and a "live data hook" where a
  future public Midnight market endpoint can be pasted and tested. The Midnight section stays dark in
  *both* themes — a window into the night side.
- **TapTools heritage** — what taptools.io was, its full API surface (documented before shutdown), an
  honest status on the old data, and a feature map of what NightDream keeps.
- **Feed engine** — three independent sources fired in parallel each minute (Minswap Aggregator,
  CoinGecko, optional Charli3), each degrading gracefully on its own: a single failing source never
  blanks the board. Pauses in hidden tabs, automatic rate-limit backoff, graceful "stale" state
  instead of blank screens. The feed note always tells you which sources answered. Optional keys
  (CoinGecko, Charli3) are stored only in the browser.
- **Day / Night theme** — one yin/yang toggle (public light / private dark), persisted per browser,
  defaults to night.
- **Keyboard shortcuts** — `/` jumps to the market filter, `Esc` closes the drawer.
- **Donation card** — Cardano mainnet address with copy button and scannable QR code (generated
  locally by the vendored `js/qr.js`, so it works even if all CDNs are blocked).

## Deploy to GitHub Pages

1. Create (or use) your `NightDream.io` repository.
2. Put these files at the **root of the repo** (`index.html`, `css/`, `js/`, `favicon.svg`):
   - easiest: upload the folder contents directly, or
   - `git init && git add . && git commit -m "NightDream.io" && git push` from this folder.
3. In the repo: **Settings → Pages → Source: `main` branch, root `/`** → Save.
4. Within a couple of minutes the site is live at `https://<your-user-or-org>.github.io/NightDream.io/`
   (or your custom domain if configured under repo **Custom domain**).

No build step, no dependencies to install. The only external fetch at runtime is Google Fonts
(everything else — including the QR library — ships with the page, so the site degrades gracefully
even fully offline).

## How the data works

The old `taptools.io` backend is offline (all its API endpoints now answer 404), so NightDream is built
on live public sources instead. Per tracked token, the first source that answers wins:

1. **Minswap Aggregator** (`https://agg-api.minswap.org/aggregator`) — primary live prices:
   - `POST /tokens` `{query:"", only_verified:false, assets:[<assetId>, …]}` — one batched call for
     ALL tracked asset IDs → `price_by_usd`, `price_by_ada`, ticker, name, logo, decimals.
     Prices come from Cardano DEX pools; this works for any asset ID, listed or not.
   - `GET /ada-price?currency=usd` — ADA stat (price + 24h change).
   - CORS-verified: sends `Access-Control-Allow-Origin: *` and answers preflight.
2. **CoinGecko** (`https://api.coingecko.com/api/v3`) — fallback price **plus the only browser-safe
   provider of 24h change / volume / market cap / 7d sparkline** for tracked tokens that have a
   CoinGecko id: one batched `GET /coins/markets?vs_currency=usd&ids=…&sparkline=true` per minute
   (refreshes every 60 s, pauses in hidden tabs, exponential backoff on HTTP 429).
3. **Charli3** (`https://api.charli3.io/api/v1`) — optional, **requires an API key** (Feed settings on
   the site; stored in `localStorage` as `nd-c3-key`). Used only as a rescue for tokens the first two
   can't price: `GET /tokens/current?policy=<policy>` then `GET /history?symbol=<TICKER>&resolution=1d`.
   Treated as best-effort: any failure is silent and the other sources carry the board.

- **Official metadata** — `https://tokens.cardano.org` (Cardano Token Registry, CIP-26/CIP-68,
  Cardano Foundation): `POST /metadata/query` / `GET /metadata/{assetId}` return signature-verified
  name, ticker, decimals and project URL. Used when resolving a pasted asset ID (Add-token panel).
  CORS-verified the same way as the Aggregator.
- **Tracked token universe** — `ND_SEED` in `js/registry.js` (the curated 26-token top board: every
  asset ID verified live on Minswap pools, plus a CoinGecko id **only where the CoinGecko entry
  unambiguously IS the Cardano asset** — e.g. Cardano's PEPE is NOT the CEX `pepe`, and the Cardano
  DEX `NEXO` is NOT the multichain Nexo, so those rows ship asset-ID-only and carry Minswap prices
  without CG stats) + the visitor's custom list (`localStorage` key `nd-custom-v1`; entries may carry
  a `id`, an `assetId`, or both) + ADA (`cardano`) for the stats strip. A row needs at least one
  source id; the table grows as visitors add tokens; nothing is server-side.
- **Token discovery by name (keyless)** — CoinGecko `GET /search?query=…` for candidates, then up to
  5 spaced `GET /coins/{id}` calls to confirm the `cardano` platform. Spaced 2.5 s apart to stay
  polite to the free tier.
- **Token discovery by name (with API key)** — one `GET /coins/list?include_platform=cardano` call,
  cached 10 minutes, filtered client-side. Key is stored only in `localStorage` (`nd-cg-key`) and
  sent to CoinGecko as `x-cg-demo-api-key`.
- **Token discovery by asset ID** — no CoinGecko involved: resolve via tokens.cardano.org (official
  name/ticker) + Minswap Aggregator (live price), then add with the asset ID.
- **Registry** — fully static, bundled in `js/registry.js`; zero network.

**Honest limitation (CORS):** the Minswap MAIN API (`api-mainnet-prod.minswap.org`, e.g.
`POST /v1/assets/metrics`) carries the full TapTools-style dataset — 1h/24h/7d price change, volume,
liquidity, market cap, categories — but it sends **no `Access-Control-Allow-Origin` header**, so a
browser blocks it and a fully static site cannot read it. That's why 24h change / volume / market cap
are only shown for tokens CoinGecko lists (and why some rows show "—"), and why per-token liquidity
isn't on the board. If that matters, the fix is a tiny serverless proxy for the main API (or key-gated
Charli3, which includes TVL in its history series). Tapped-and-dead sources checked and ruled out:
taptools.io (404), DexHunters (parked domain), Muesli API (DNS dead), Orcfax (on-chain oracle, no
public REST API).

### Sources we evaluated (and why each is — or isn't — in the board)

Every major public Cardano feed was probed for browser safety (CORS), Cardano-token coverage and key
requirements. This is the honest, verified result — the reason the board runs on Minswap + CoinGecko
(+ optional Charli3) rather than "every API we could name."

| Source | Browser-safe (CORS)? | Cardano coverage | Verdict |
| --- | --- | --- | --- |
| **Minswap Aggregator** | ✅ `*` | ✅ any asset ID (DEX pools) | **In the board — primary prices + ADA** |
| **Minswap MAIN API** | ❌ no `Access-Control-Allow-Origin` | ✅ full dataset | Blocked for a static site (needs a proxy) |
| **CoinGecko** | ✅ (rate-limited free tier) | ✅ listed tokens | **In the board — 24h/vol/mcap + 7d sparkline** |
| **Cardano Token Registry** | ✅ `*` | ✅ official metadata | **In the board — verified names/decimals** |
| **Charli3** | ✅ (key-gated) | ✅ 17k+ tokens | **Optional key slot — rescue prices** |
| **DIA Data API** | ✅ `*` (no key) | ⚠️ ADA only (no CNT long tail) | **Integrated — independent signed ADA oracle** |
| **CoinMarketCap** (free) | ❌ no CORS | ✅ good data | Browser can't read it |
| **CoinMarketCap** (Pro) | ⚠️ key-gated; unkeyed 401 has no CORS | ⚠️ needs a CMC id/slug per token | Optional only; needs ids we don't hold |
| **TradingView** scanner | ✅ | ⚠️ CEX-listed only, exact exchange symbol | No reliable ticker→symbol resolver → poor general CNT fit |
| **OKX** | ✅ | ❌ ADA only (SUNDAE/MIN → "instrument doesn't exist") | Useless for the long tail |
| **Pyth Network** | ⚠️ Hermes DNS-flaky; v2 is marketing | ⚠️ majors-focused | No long-tail CNTs |
| **Sundaeswap** | ❌ api.sundae.fi 404; sundaeswap.io DNS-dead | — | Retired |
| **TapTools / DexHunters / Orcfax / Muesli** | — | — | Offline / parked / no public REST |

Net: for a **browser-only, no-key** site the working set is Minswap (any on-chain asset) + CoinGecko
(stats + charts) + the DIA oracle (independent signed ADA price) + optional
Charli3 (wider rescue), joined to the official Registry. Every "extra" feed
is blocked by CORS, is majors-only, needs an id we don't hold, or is offline. If you have a CoinMarketCap
Pro key **and** a CoinGecko→CMC id map — or want a TradingView ADA cross-check — say the word and it
can be wired in as another optional source.

## Customizing

- **Donation address** — it appears in two places: the `<code id="donateAddr">` element in `index.html`
  and the `DONATION_ADDRESS` constant in `js/app.js` (used by the copy button and QR code). Change both.
- **Core live feed** — `ND_SEED` in `js/registry.js` (id = CoinGecko coin id — omit for asset-only
  rows, sym = symbol, name, assetId = on-chain asset ID, web = official site if it's live, cat =
  category badge text). Asset IDs must resolve to a real Cardano asset (check
  `cexplorer.com/asset/<id>`); CoinGecko ids only when the entry is genuinely the Cardano token —
  CEX tickers like `pepe`, `bank`, `coti` or `api3` usually point at *different* assets.
  Known-ambiguous asset on the board: **NEXO (Cardano)** — the DEX pool is unverified on Minswap
  and the price is far below the multichain Nexo; treat it as community data, not an index quote.
- **Registry** — regenerate `js/registry.js` from any list of `{ticker, assetId}` pairs (e.g. the
  Minswap token registry). Keep the `ND_REGISTRY` / `ND_SEED` globals and the file loads before `app.js`.
- **Midnight watchlist defaults** — `DEFAULT_WATCH` in `js/app.js` (visitors can edit their own list in-browser).
- **Midnight live data** — when a public Midnight market API exists, paste its JSON URL into the
  "Live data hook" on the site (or into `localStorage` key `nd-midnight-endpoint`). Wire it into
  `refreshMarket()` in `js/app.js` when you're ready to display it.
- **Colors** — all theming lives in the `:root` / `[data-theme="day"]` blocks at the top of `css/styles.css`.

## A note on the old taptools.io data

The old site's data is gone with the backend. Verified (August 2026):

- `www.taptools.io/api/…` endpoints (rankings, tickers, topMovers, OHLCV, stats, epoch…) all return **HTTP 404**;
  the domain now serves a shutdown page ("Thank You for Being Part of Our Journey").
- The Wayback Machine's archived API responses are stored **encrypted** (OpenSSL "Salted__" payloads),
  and normal playback returns only HTML wrapper pages.
- Common Crawl captured only the **HTML shells** of the site (a Next-style client app that fetched its
  data at runtime) — no API responses, and therefore no historical numbers, in any index queried.

So this project recreates the *functionality* with live public data rather than copying the old data.
If you hold an export of the old dataset (CSV, JSON, spreadsheets), drop it into this repo and it can
be folded into the heritage section as a preserved archive.

## Sources & attribution

- **Minswap Aggregator API** (`agg-api.minswap.org`) — primary live prices (DEX pools) for any
  Cardano asset ID, plus the ADA stat. Free, no key. Docs: `docs.minswap.org/developer/aggregator-api`.
- **CoinGecko** (public API) — 24h change / volume / market cap, 7d sparklines, fallback prices,
  token discovery. Free tier is rate-limited; the site stays deliberately gentle (one batched call per
  minute, spaced discovery probes, exponential backoff).
- **Cardano Token Registry** (`tokens.cardano.org`, Cardano Foundation; CIP-26/CIP-68) — official,
  signature-verified token metadata (name, ticker, decimals, URL) used for asset-ID resolution.
- **Charli3** (`api.charli3.io`) — optional multi-DEX price source (17k+ tokens, history, TVL),
  used only when a visitor supplies an API key. Key-gated by design.
- **Minswap community registry** (`minswap/minswap-tokens` on GitHub) — source of the bundled
  ticker/asset-ID registry. Factual token metadata; attribute upstream if you redistribute.
- **CExplorer / ADAstats** — on-chain asset links built from asset IDs.
- **qrcodejs** — vendored in `js/qr.js` (MIT); generates the donation QR locally.

## License / trust

Information provided as-is for community use; not financial advice. No cookies, no analytics, no ads.

Created by [@kshot9000](https://x.com/kshot9000).
