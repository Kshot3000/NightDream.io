# NightDream.xyz — Cardano + Midnight Analytics Desk

Live Cardano market analytics in the spirit of the late TapTools: token screener, token deep-dives with
candlestick charts, DEX liquidity analytics, real wallet portfolios (CIP-30), and a Midnight (NIGHT/DUST) desk.


**Live site:** https://nightdream.xyz/

## What it does

- **Overview** — live ADA + NIGHT pulse, price charts, top movers, trending by volume, liquidity snapshot, portfolio mini
- **Markets** — sortable/filterable screener over 84 curated Cardano assets (search by ticker, name, policy ID, or asset unit)
- **Token pages** — live price, line/candle charts (24H/7D/30D/1Y), market stats, buys-vs-sells, DEX markets table, on-chain data (policy ID, fingerprint, decimals, supply, holder count), project links, description
- **Portfolio** — connect Nami / Eternl / Lace / Flint / Vespr (any CIP-30 wallet) for a live read-only portfolio: net worth, allocation, positions, NFTs, on-chain activity; or track any `addr1…`/`stake1…` address without connecting
- **DEX analytics** — 24h volume aggregated from DexScreener across tracked tokens, per-DEX share, top pairs table
- **Staking pools** — live stake-pool rankings from Koios: active stake, saturation, margin, pledge, delegators, blocks; sortable + searchable, with oversaturation warnings
- **Governance** — on-chain governance actions with Yes/No/Abstain vote tallies and a DRep voting-power leaderboard, from Koios
- **Midnight desk** — live NIGHT stats + chart, NIGHT redemption tracker (live countdown to the Dec 4, 2026 close, thaw-schedule calculator), DUST generation model calculator, Cardano ↔ Midnight bridge explainer
- **Watchlist + ⌘K command palette** — persisted locally

## Data sources (no backend)

| Source | Used for |
|---|---|
| [CoinGecko](https://www.coingecko.com) | Prices, mcap, volume, % changes, sparklines, charts, OHLC candles, token metadata — requested with the owner's free demo key (sent as a query param, visible in served JS by design) |
| [DexScreener](https://dexscreener.com) | Cardano DEX pairs, liquidity, 24h buys/sells |
| [Koios](https://www.koios.rest) | On-chain asset info, holder counts, address/wallet balances, stake pool rankings, governance proposals, votes, DReps |
| [MinSwap aggregator](https://minswap.org) | ADA/USD reference price |
| [NightForge](https://nightforge.jp/api/docs) | Midnight network analytics (blocks, TPS, shielded, bridge) |

Responses are cached (60 seconds to 6 hours depending on endpoint, persisted in localStorage) and every panel
degrades gracefully with loading skeletons and plain-language error states. No demo or placeholder
figures are shown anywhere.

## Privacy

- Wallet connection is **read-only** via CIP-30 (`enable()` only requests address access). Nothing is ever signed.
- Balances resolve through your wallet's public addresses via Koios. No keys, no seeds, no tracking.
- Watchlist and tracked addresses stay in your browser's localStorage.

## Run locally

```bash
git clone https://github.com/Kshot3000/nightdream.xyz
cd nightdream.xyz
python3 -m http.server 8000
# open http://localhost:8000/
```

No build step — static HTML/CSS/JS, deployable to any static host (GitHub Pages serves `main`).

## Project layout

```
index.html        app shell + all pages
css/styles.css    dark purple/teal theme
css/fx.css        visual FX layer (living background, cinematic hero, glow hovers)
js/tokens.js      curated Cardano token universe (CoinGecko IDs + on-chain policy IDs)
js/live.js        cached data layer (CoinGecko / DexScreener / Koios / MinSwap)
js/data.js        shared state + formatters
js/wallet.js      CIP-30 discovery, bech32, Koios-backed portfolio builder
js/charts.js      canvas charts (line, candles, bars, donut, sparklines)
js/app.js         router + page renderers
js/bg.js          animated full-viewport background canvas (₳ embers, hexagon motif, node network)
js/ads.js         AdSense slot activation (user-approved, live)
```

## Limitations

- CoinGecko's free tier rate-limits aggressively; the app caches heavily and backs off, but very rapid
  refreshing may briefly show stale data (the freshness pill always shows data age).
- Holder counts come from Koios `asset_addresses` and can be slow on first load for large assets.
- NFT floor prices and LP position valuations are not currently sourced — NFTs list without prices.
- DUST generation figures on the Midnight page are a tunable model, not network data.

## Custom domain (DNS)

**Live since 2026-09-27** at https://nightdream.xyz/ — apex resolves, GitHub Pages
HTTPS certificate is issued and "Enforce HTTPS" is on. The working record set is
documented in **[docs/DNS.md](docs/DNS.md)**.

## Data sources (Midnight network)

NightForge public explorer API powers the **Midnight network** strip (blocks, TPS, shielded ratio, bridge ops, committee) on the Midnight page, with soft empty-state fallback.

## Attribution / branding

Built by [@kshot9000](https://x.com/kshot9000).

**Donate ADA:**

```
addr1q8hnl6vl5a6k3rw3n5g3jtte696zcl76kfatzv7gpswa9r0dj7fma6klq55y4ffm7tf0em09udnyhuk4ah92pl5x9jpqjae44v
```

**Donate Bitcoin (BTC):**

```
3GnR7TWBXAB3pPztBWpNF4LMNEX5yX8vZK
```
