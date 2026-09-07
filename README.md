# NightDream.io

Cardano + Midnight analytics desk — built to fill the TapTools gap and beat [Sundae Float](https://float.sundae.fi) on daily usefulness.

**Live:** https://kshot3000.github.io/NightDream.io/

> **DEMO data** — figures are realistic sample datasets, clearly labeled. Live Cardano/Midnight APIs are not wired yet.

## Why NightDream

| Capability | Float | TapTools (down) | NightDream |
|---|---|---|---|
| Token markets + charts + trades | ✓ | ✓ | ✓ (+sparklines, asset id search) |
| Portfolio (multi-wallet, LP, P&L) | — | ✓ | ✓ DEMO |
| Holder concentration | — | partial | ✓ |
| Wallet-size / smart-money trade tags | — | cues | ✓ |
| News aggregator | — | ✓ | ✓ |
| Midnight NIGHT / DUST hub | — | — | ✓ |
| Watchlist (localStorage) | saved | ✓ | ✓ |
| ⌘K command palette | — | — | ✓ |

## Sections

1. **Overview** — morning desk (ADA + NIGHT pulse, movers, trending, liquidity, news strip, portfolio mini, watchlist)
2. **Markets** — Tokens / Pools / Exchanges / Trades tabs (Float baseline + denser columns)
3. **Token** — deep page (`#token/SUNDAE`) with Chart, Trades (expandable + fish badges), Pools, Holders, About
4. **Portfolio** — multi-wallet demo, allocation, tokens/NFTs/LP, trade history, best/worst
5. **DEX / Liquidity** — volume share + pool table
6. **News** — Cardano + Midnight tagged headlines
7. **Midnight** — NIGHT overview, DUST calculator (5 DUST max / NIGHT), stake status checker, bridge model
8. **Watchlist** — persisted favorites

## Stack

Static SPA — HTML / CSS / vanilla JS. No build step. GitHub Pages from `main` root. Relative paths (`./css/...`) for `/NightDream.io/` base.

## Local

Open `index.html` or serve the folder:

```bash
python3 -m http.server 8080 --directory .
```

## License

MIT © NightDream / Kshot3000
