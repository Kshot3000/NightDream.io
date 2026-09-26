/* NightDream — live data layer.
   Sources (all keyless, CORS-open, verified 2026-09-26):
   - CoinGecko  /api/v3            → prices, mcap, volume, charts, OHLC, metadata
   - DexScreener /latest/dex       → DEX pairs, buys/sells, liquidity
   - Koios      /api/v1            → on-chain asset info, holders, address/wallet data
   - MinSwap aggregator            → ADA/USD reference price
   - NightForge mainnet.nightforge.jp → Midnight network analytics
   Every fetch is cached (memory + localStorage) and fails soft → null.
   UI must always handle null with skeletons / error states + retry. */
window.LIVE = (function () {
  const CG = "https://api.coingecko.com/api/v3";
  const KOIOS = "https://api.koios.rest/api/v1";
  const DEXS = "https://api.dexscreener.com";
  const MINAGG = "https://agg-api.minswap.org/aggregator";

  const mem = new Map();
  const LS_PREFIX = "nd.live.v1.";

  function cacheGet(key) {
    const m = mem.get(key);
    if (m && m.exp > Date.now()) return m.val;
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) return undefined;
      const o = JSON.parse(raw);
      if (o.exp > Date.now()) { mem.set(key, o); return o.val; }
    } catch (_) {}
    return undefined;
  }
  function cacheSet(key, val, ttlMs) {
    const o = { val, exp: Date.now() + ttlMs };
    mem.set(key, o);
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(o)); } catch (_) {}
  }
  function cacheDel(key) {
    mem.delete(key);
    try { localStorage.removeItem(LS_PREFIX + key); } catch (_) {}
  }

  async function jget(url, ttlMs, init) {
    const cached = cacheGet(url);
    if (cached !== undefined) return cached;
    try {
      const r = await fetch(url, init);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      cacheSet(url, j, ttlMs);
      return j;
    } catch (e) {
      return null;
    }
  }
  async function jpost(url, body, ttlMs) {
    const key = "POST " + url + " " + JSON.stringify(body);
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      cacheSet(key, j, ttlMs);
      return j;
    } catch (e) {
      return null;
    }
  }

  const MIN5 = 5 * 60 * 1000, MIN30 = 30 * 60 * 1000, HOUR6 = 6 * 3600 * 1000;

  /* ——— Token markets (ONE batched CoinGecko call) ——— */
  let _marketsInflight = null;
  function allIds() {
    const ids = window.NDU.TOKENS.map((t) => t.cg);
    ids.push("cardano");
    return [...new Set(ids)].join(",");
  }
  async function markets(force) {
    if (force) { /* fall through and refetch */ }
    if (_marketsInflight) return _marketsInflight;
    _marketsInflight = (async () => {
      const url = `${CG}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(allIds())}` +
        `&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d`;
      const key = "markets";
      if (!force) {
        const c = cacheGet(key);
        if (c !== undefined) { _marketsInflight = null; return c; }
      }
      const rows = await jget(url, MIN5);
      const out = [];
      if (rows && rows.length) {
        for (const r of rows) {
          const uni = window.NDU.byCg[r.id];
          const ticker = r.id === "cardano" ? "ADA" : (uni ? uni.ticker : (r.symbol || "").toUpperCase());
          const unit = uni && uni.policy ? uni.policy + uni.asset : (r.id === "cardano" ? "lovelace" : "");
          out.push({
            id: ticker, ticker, name: r.name, cg: r.id,
            policy: uni ? uni.policy : "", asset: uni ? uni.asset : "", unit,
            price: r.current_price, ch1h: r.price_change_percentage_1h_in_currency,
            ch24: r.price_change_percentage_24h, ch7d: r.price_change_percentage_7d_in_currency,
            mcap: r.market_cap, fdv: r.fully_diluted_valuation, vol: r.total_volume,
            liq: null, holders: null,
            image: r.image, spark: (r.sparkline && r.sparkline.price) || [],
            rank: r.market_cap_rank, ath: r.ath, atl: r.atl,
            category: categoryFor(r.id, ticker),
          });
        }
        cacheSet(key, out, MIN5);
      }
      _marketsInflight = null;
      return out.length ? out : cacheGet(key) || null;
    })();
    return _marketsInflight;
  }

  const CATS = {
    cardano: "L1", "midnight-3": "Privacy", sundaeswap: "DEX", minswap: "DEX",
    wingriders: "DEX", "muesliswap-milk": "DEX", dexhunter: "DEX", cswap: "DEX",
    usd: "Stable", "usdm-2": "Stable", djed: "Stable", "anzens-usda": "Stable",
    "cicle-xreserve-bridged-usdc-cardano": "Stable", "wanchain-bridged-usdc-cardano": "Stable",
    snek: "Meme", hosky: "Meme", babysnek: "Meme", "charles-the-chad": "Meme", "ada-peepos": "Meme",
    "aada-finance": "Lending", "liqwid-finance": "Lending", "flow-lending": "Lending",
    "indigo-dao-governance-token": "DeFi", "optim-finance": "DeFi", fluidtokens: "DeFi",
    "world-mobile-token": "Infra", iagon: "Infra", "orcfax": "Infra", "nft-maker": "Infra",
    "jpg-store": "NFT", "clay-nation": "NFT",
    cornucopias: "Gaming", "palm-economy": "Gaming",
    "fetch-ai": "AI", "singularitynet": "AI", "rejuve-ai": "AI", talos: "AI", "cardanogpt": "AI", "nunet": "AI",
    "gold-fgld-finest-tokenized-gold": "RWA", "book-2": "RWA",
    meld: "DeFi", "paribus": "DeFi", "genius-yield": "DeFi",
  };
  function categoryFor(cgId, ticker) {
    return CATS[cgId] || "Token";
  }

  /* ——— Price charts ——— */
  async function chart(cgId, days) {
    const d = days === "1H" ? 1 : days === "24H" ? 1 : days === "7D" ? 7 : days === "30D" ? 30 : days === "1Y" ? 365 : 7;
    const url = `${CG}/coins/${cgId}/market_chart?vs_currency=usd&days=${d}`;
    const j = await jget(url, MIN5);
    if (!j || !j.prices) return null;
    return j.prices.map((p) => ({ t: p[0], v: p[1] }));
  }
  async function ohlc(cgId, days) {
    const d = days === "24H" ? 1 : days === "7D" ? 7 : days === "30D" ? 30 : 7;
    const url = `${CG}/coins/${cgId}/ohlc?vs_currency=usd&days=${d}`;
    const j = await jget(url, MIN5);
    if (!j || !j.length) return null;
    return j.map((c) => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4] }));
  }

  /* ——— Coin detail (links, description, supplies) ——— */
  async function detail(cgId) {
    const url = `${CG}/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    return jget(url, MIN30);
  }

  /* ——— DexScreener: pairs, buys/sells, liquidity ——— */
  async function dexPairs(unit) {
    if (!unit || unit === "lovelace") return null;
    const url = `${DEXS}/latest/dex/tokens/${unit}`;
    const j = await jget(url, 2 * 60 * 1000);
    if (!j || !j.pairs || !j.pairs.length) return null;
    const pairs = j.pairs.filter((p) => p.chainId === "cardano");
    if (!pairs.length) return null;
    let buys = 0, sells = 0, buyVol = 0, sellVol = 0, liq = 0, vol24 = 0;
    const rows = pairs.map((p) => {
      const tx = p.txns || {};
      const b5 = (tx.m5 && tx.m5.buys) || 0, s5 = (tx.m5 && tx.m5.sells) || 0;
      const b1 = (tx.h1 && tx.h1.buys) || 0, s1 = (tx.h1 && tx.h1.sells) || 0;
      const b6 = (tx.h6 && tx.h6.buys) || 0, s6 = (tx.h6 && tx.h6.sells) || 0;
      const b24 = (tx.h24 && tx.h24.buys) || 0, s24 = (tx.h24 && tx.h24.sells) || 0;
      buys += b24; sells += s24;
      const v = (p.volume && p.volume.h24) || 0;
      vol24 += v;
      const lq = (p.liquidity && p.liquidity.usd) || 0;
      liq += lq;
      // rough buy/sell volume split from counts
      const tot = b24 + s24;
      const bv = tot ? (v * b24) / tot : v / 2;
      buyVol += bv; sellVol += v - bv;
      return {
        dex: p.dexId, pair: (p.baseToken && p.baseToken.symbol) + "/" + (p.quoteToken && p.quoteToken.symbol),
        priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
        priceNative: p.priceNative, liq: lq, vol24: v,
        ch24: p.priceChange && p.priceChange.h24, ch5m: p.priceChange && p.priceChange.m5,
        buys24: b24, sells24: s24, buys1h: b1, sells1h: s1,
        url: p.url, pairAddress: p.pairAddress,
      };
    });
    rows.sort((a, b) => b.liq - a.liq);
    return { pairs: rows, buys, sells, buyVol, sellVol, liquidity: liq, vol24 };
  }

  /* ——— Koios on-chain ——— */
  async function koiosAsset(policy, assetName) {
    if (!policy) return null;
    const j = await jpost(`${KOIOS}/asset_info`, { _asset_list: [[policy, assetName || ""]] }, HOUR6);
    return j && j.length ? j[0] : null;
  }
  async function koiosHolders(policy, assetName) {
    if (!policy) return null;
    const j = await jpost(`${KOIOS}/asset_addresses`, { _asset_list: [[policy, assetName || ""]] }, MIN30);
    if (!j) return null;
    return j.length;
  }
  async function koiosAddressInfo(addresses) {
    return jpost(`${KOIOS}/address_info`, { _addresses: addresses }, 60 * 1000);
  }
  async function koiosAccountAssets(stakeAddresses) {
    return jpost(`${KOIOS}/account_assets`, { _stake_addresses: stakeAddresses }, 60 * 1000);
  }
  async function koiosAddressTxs(address, limit) {
    const url = `${KOIOS}/address_txs?_address=${encodeURIComponent(address)}&limit=${limit || 25}&order=block_time.desc`;
    return jget(url, 60 * 1000);
  }
  async function koiosTip() {
    return jget(`${KOIOS}/tip`, 60 * 1000);
  }

  /* ——— ADA/USD reference ——— */
  async function adaPrice() {
    const j = await jget(`${MINAGG}/ada-price?currency=usd`, MIN5);
    if (j && j.value && j.value.price) return { price: j.value.price, ch24: j.value.change_24h };
    const s = await jget(`${CG}/simple/price?ids=cardano&vs_currencies=usd&include_24hr_change=true`, MIN5);
    if (s && s.cardano) return { price: s.cardano.usd, ch24: s.cardano.usd_24h_change };
    return null;
  }

  /* ——— Wallet token pricing helper ——— */
  async function priceForUnit(unit, adaUsd) {
    if (!unit) return null;
    if (unit === "lovelace") return adaUsd ? { usd: adaUsd, src: "ada" } : null;
    const uni = window.NDU.byUnit[unit];
    if (uni) {
      const mk = cacheGet("markets");
      const hit = mk && mk.find((t) => t.cg === uni.cg);
      if (hit && hit.price) return { usd: hit.price, ch24: hit.ch24, ticker: hit.ticker, name: hit.name, image: hit.image };
    }
    // long-tail: DexScreener quote
    const d = await dexPairs(unit);
    if (d && d.pairs.length && d.pairs[0].priceUsd) {
      const p = d.pairs[0];
      return { usd: p.priceUsd, ticker: uni ? uni.ticker : unit.slice(0, 8), name: uni ? uni.name : "Unknown token" };
    }
    return null;
  }


  /* ——— Midnight network (NightForge explorer) ——— */
  const NF = "https://mainnet.nightforge.jp/api";
  async function nightforgeOverview() {
    return jget(`${NF}/analytics/overview`, 60 * 1000);
  }
  async function nightforgeHealth() {
    return jget(`${NF}/health`, 60 * 1000);
  }

  return {
    markets, chart, ohlc, detail, dexPairs,
    koiosAsset, koiosHolders, koiosAddressInfo, koiosAccountAssets, koiosAddressTxs, koiosTip,
    adaPrice, priceForUnit, categoryFor,
    nightforgeOverview, nightforgeHealth,
    cacheGet, cacheSet, cacheDel,
    CG, KOIOS, DEXS, NF,
  };
})();
