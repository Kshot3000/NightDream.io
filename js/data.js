/* NightDream.io — DEMO datasets. Figures labeled DEMO in UI; not live market feeds. */
window.ND = window.ND || {};

ND.META = {
  demo: true,
  label: "DEMO",
  updatedAt: "2026-09-06T21:00:00-05:00",
  network: "Cardano mainnet + Midnight preview",
};

ND.PULSE = {
  ada: { price: 0.482, change24h: 2.84, change7d: -1.12, volume24h: 312_400_000, mcap: 17_200_000_000 },
  night: { price: 0.0684, change24h: 6.12, change7d: 14.8, volume24h: 4_820_000, mcap: 164_000_000, fdv: 684_000_000, circulating: 2_400_000_000, maxSupply: 10_000_000_000 },
};

/* Midnight economics (documented concepts — DEMO calculator inputs) */
ND.MIDNIGHT = {
  dustPerNightMax: 5,
  generationNote: "Each NIGHT can sustain up to 5 DUST capacity. Generation rate depends on holdings and network parameters (demo estimates).",
  bridgeNote: "Cardano hosts NIGHT; Midnight uses DUST for shielded tx fees. Bridge moves value Cardano ↔ Midnight while preserving the NIGHT→DUST generation model.",
  stakeDemo: {
    "stake1uydemo0nightdream": { status: "active", nightStaked: 125000, dustCapacity: 625000, genRatePerDay: 1820, epoch: 512 },
    "addr1qydemo0nightdream": { status: "active", nightStaked: 42000, dustCapacity: 210000, genRatePerDay: 612, epoch: 512 },
  },
};

ND.TOKENS = [
  { id: "ADA", name: "Cardano", ticker: "ADA", price: 0.482, ch24: 2.84, ch7d: -1.12, vol: 312400000, liq: 890000000, mcap: 17200000000, fdv: 17200000000, holders: 4200000, category: "L1", policy: "lovelace", watch: true },
  { id: "NIGHT", name: "Midnight", ticker: "NIGHT", price: 0.0684, ch24: 6.12, ch7d: 14.8, vol: 4820000, liq: 18500000, mcap: 164000000, fdv: 684000000, holders: 84200, category: "Midnight", policy: "night_policy_demo", watch: true },
  { id: "SUNDAE", name: "SundaeSwap", ticker: "SUNDAE", price: 0.0142, ch24: -3.41, ch7d: 5.2, vol: 1280000, liq: 4200000, mcap: 18400000, fdv: 42000000, holders: 31200, category: "DEX", policy: "sundae_policy_demo", watch: true },
  { id: "MIN", name: "Minswap", ticker: "MIN", price: 0.0288, ch24: 1.92, ch7d: -0.4, vol: 2100000, liq: 9100000, mcap: 41200000, fdv: 98000000, holders: 48500, category: "DEX", policy: "min_policy_demo", watch: false },
  { id: "IUSD", name: "Indigo iUSD", ticker: "iUSD", price: 0.998, ch24: 0.02, ch7d: 0.01, vol: 5400000, liq: 22000000, mcap: 48000000, fdv: 48000000, holders: 12400, category: "Stable", policy: "iusd_policy_demo", watch: false },
  { id: "DJED", name: "Djed", ticker: "DJED", price: 1.001, ch24: -0.05, ch7d: 0.02, vol: 3200000, liq: 15000000, mcap: 22000000, fdv: 22000000, holders: 8900, category: "Stable", policy: "djed_policy_demo", watch: false },
  { id: "HOSKY", name: "Hosky", ticker: "HOSKY", price: 0.00000042, ch24: 12.4, ch7d: 28.1, vol: 890000, liq: 2100000, mcap: 8400000, fdv: 8400000, holders: 125000, category: "Meme", policy: "hosky_policy_demo", watch: false },
  { id: "SNEK", name: "Snek", ticker: "SNEK", price: 0.00185, ch24: 4.6, ch7d: -8.2, vol: 1560000, liq: 3800000, mcap: 136000000, fdv: 136000000, holders: 98000, category: "Meme", policy: "snek_policy_demo", watch: true },
  { id: "WMTX", name: "World Mobile", ticker: "WMTX", price: 0.165, ch24: -1.8, ch7d: 3.4, vol: 720000, liq: 2900000, mcap: 92000000, fdv: 165000000, holders: 45600, category: "Infra", policy: "wmtx_policy_demo", watch: false },
  { id: "LENFI", name: "Lenfi", ticker: "LENFI", price: 0.42, ch24: 8.1, ch7d: 15.6, vol: 640000, liq: 1800000, mcap: 21000000, fdv: 42000000, holders: 9800, category: "Lending", policy: "lenfi_policy_demo", watch: false },
  { id: "LQ", name: "Liqwid", ticker: "LQ", price: 0.095, ch24: -2.3, ch7d: -6.1, vol: 410000, liq: 1200000, mcap: 7200000, fdv: 19000000, holders: 7200, category: "Lending", policy: "lq_policy_demo", watch: false },
  { id: "COPI", name: "Cornucopias", ticker: "COPI", price: 0.031, ch24: 0.9, ch7d: 2.1, vol: 280000, liq: 950000, mcap: 18500000, fdv: 31000000, holders: 21000, category: "Gaming", policy: "copi_policy_demo", watch: false },
  { id: "DUST", name: "Midnight DUST", ticker: "DUST", price: 0.0, ch24: 0, ch7d: 0, vol: 0, liq: 0, mcap: 0, fdv: 0, holders: 0, category: "Midnight", policy: "dust_native_demo", watch: false, note: "Fee resource — not a tradable CNT; generated from NIGHT" },
  { id: "AGIX", name: "SingularityNET", ticker: "AGIX", price: 0.312, ch24: 3.2, ch7d: -4.5, vol: 980000, liq: 4100000, mcap: 380000000, fdv: 620000000, holders: 67000, category: "AI", policy: "agix_policy_demo", watch: false },
  { id: "BOOK", name: "Book.io", ticker: "BOOK", price: 0.0088, ch24: -0.6, ch7d: 1.4, vol: 120000, liq: 480000, mcap: 4400000, fdv: 8800000, holders: 5400, category: "RWA", policy: "book_policy_demo", watch: false },
];

ND.TRENDING = ["NIGHT", "HOSKY", "LENFI", "SUNDAE", "SNEK"];
ND.TOP_MOVERS = ["HOSKY", "LENFI", "NIGHT", "SNEK", "MIN"];
ND.NEW_TOKENS = [
  { ticker: "SHADOW", name: "ShadowFi", age: "2h", price: 0.0042, ch24: 48.2 },
  { ticker: "VOID", name: "Void Labs", age: "6h", price: 0.019, ch24: 12.8 },
  { ticker: "AETHER", name: "Aether CNT", age: "14h", price: 0.00088, ch24: -6.4 },
];

ND.NEWS = [
  { id: 1, source: "Cardano Spot", tag: "Cardano", title: "DeFi TVL on Cardano climbs as DEX volumes rebound", ts: "2026-09-06T18:20:00-05:00", url: "#" },
  { id: 2, source: "Midnight Blog", tag: "Midnight", title: "NIGHT generation mechanics: DUST capacity explained for builders", ts: "2026-09-06T16:05:00-05:00", url: "#" },
  { id: 3, source: "CoinDesk", tag: "Cardano", title: "Cardano ecosystem funds expand grants for Midnight tooling", ts: "2026-09-06T14:40:00-05:00", url: "#" },
  { id: 4, source: "CoinTelegraph", tag: "Markets", title: "ADA holds range as traders eye Midnight mainnet milestones", ts: "2026-09-06T12:15:00-05:00", url: "#" },
  { id: 5, source: "Sundae Labs", tag: "DEX", title: "Float liquidity incentives refresh for ADA pairs", ts: "2026-09-06T10:00:00-05:00", url: "#" },
  { id: 6, source: "Minswap", tag: "DEX", title: "Aggregator routing update reduces slippage on mid-caps", ts: "2026-09-05T22:30:00-05:00", url: "#" },
  { id: 7, source: "IOG", tag: "Midnight", title: "Shielded transaction primitives reach public preview", ts: "2026-09-05T19:00:00-05:00", url: "#" },
  { id: 8, source: "Cardano Foundation", tag: "Cardano", title: "Governance participation metrics for the latest epoch", ts: "2026-09-05T15:45:00-05:00", url: "#" },
  { id: 9, source: "The Tap House", tag: "Markets", title: "CNT market-cap methodology note: circulating vs total supply", ts: "2026-09-05T11:20:00-05:00", url: "#" },
  { id: 10, source: "Midnight Dev", tag: "Midnight", title: "Bridge UX patterns for Cardano ↔ Midnight asset flow", ts: "2026-09-04T21:10:00-05:00", url: "#" },
];

ND.NEWS_SOURCES = ["Cardano Spot", "Midnight Blog", "CoinDesk", "CoinTelegraph", "Sundae Labs", "Minswap", "IOG", "Cardano Foundation", "The Tap House", "Midnight Dev"];

ND.DEXES = [
  { name: "Minswap", vol24: 18400000, pools: 420, share: 38.2 },
  { name: "SundaeSwap", vol24: 9200000, pools: 280, share: 19.1 },
  { name: "WingRiders", vol24: 6100000, pools: 190, share: 12.7 },
  { name: "VyFinance", vol24: 4800000, pools: 150, share: 10.0 },
  { name: "Spectrum", vol24: 3900000, pools: 210, share: 8.1 },
  { name: "Other", vol24: 5700000, pools: 340, share: 11.9 },
];

ND.POOLS = [
  { pair: "ADA/NIGHT", dex: "Minswap", tvl: 4200000, vol24: 890000, apr: 18.4, fee: 0.3 },
  { pair: "ADA/SUNDAE", dex: "SundaeSwap", tvl: 2100000, vol24: 410000, apr: 22.1, fee: 0.3 },
  { pair: "ADA/MIN", dex: "Minswap", tvl: 3800000, vol24: 720000, apr: 14.2, fee: 0.3 },
  { pair: "ADA/iUSD", dex: "Minswap", tvl: 9100000, vol24: 2100000, apr: 6.8, fee: 0.05 },
  { pair: "ADA/SNEK", dex: "Minswap", tvl: 1600000, vol24: 520000, apr: 31.5, fee: 0.3 },
  { pair: "ADA/DJED", dex: "WingRiders", tvl: 5400000, vol24: 980000, apr: 5.4, fee: 0.05 },
  { pair: "NIGHT/iUSD", dex: "Minswap", tvl: 980000, vol24: 210000, apr: 24.0, fee: 0.3 },
  { pair: "ADA/LENFI", dex: "Minswap", tvl: 720000, vol24: 180000, apr: 28.6, fee: 0.3 },
];

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

ND.genSeries = function (base, points, volatility, seed) {
  const rnd = seededRand(seed || 42);
  const out = [];
  let v = base;
  const now = Date.now();
  const step = (24 * 3600 * 1000) / Math.max(points / 7, 1);
  for (let i = 0; i < points; i++) {
    const drift = (rnd() - 0.48) * volatility * v;
    v = Math.max(v * 0.15, v + drift);
    out.push({ t: now - (points - i) * step, v });
  }
  return out;
};

ND.CHARTS = {
  ADA: ND.genSeries(0.45, 168, 0.018, 11),
  NIGHT: ND.genSeries(0.055, 168, 0.035, 22),
  SUNDAE: ND.genSeries(0.013, 168, 0.04, 33),
  MIN: ND.genSeries(0.027, 168, 0.025, 44),
  SNEK: ND.genSeries(0.0017, 168, 0.05, 55),
  HOSKY: ND.genSeries(0.00000035, 168, 0.08, 66),
  LENFI: ND.genSeries(0.36, 168, 0.045, 77),
  iUSD: ND.genSeries(0.999, 168, 0.002, 88),
  DJED: ND.genSeries(1.0, 168, 0.002, 99),
};

ND.TRADES = {
  SUNDAE: [
    { side: "buy", price: 0.01422, amount: 84200, ada: 1197, wallet: "whale", ago: "12s", tx: "a1b2…" },
    { side: "sell", price: 0.01418, amount: 12400, ada: 175.8, wallet: "fish", ago: "34s", tx: "c3d4…" },
    { side: "buy", price: 0.01420, amount: 3100, ada: 44.0, wallet: "shrimp", ago: "51s", tx: "e5f6…" },
    { side: "buy", price: 0.01415, amount: 220000, ada: 3113, wallet: "whale", ago: "1m", tx: "g7h8…" },
    { side: "sell", price: 0.01410, amount: 45800, ada: 645.8, wallet: "dolphin", ago: "2m", tx: "i9j0…" },
    { side: "buy", price: 0.01408, amount: 8900, ada: 125.3, wallet: "fish", ago: "3m", tx: "k1l2…" },
    { side: "sell", price: 0.01405, amount: 15600, ada: 219.2, wallet: "fish", ago: "4m", tx: "m3n4…" },
    { side: "buy", price: 0.01402, amount: 980, ada: 13.7, wallet: "shrimp", ago: "5m", tx: "o5p6…" },
  ],
  NIGHT: [
    { side: "buy", price: 0.0688, amount: 42000, ada: 2889, wallet: "whale", ago: "8s", tx: "n1…" },
    { side: "buy", price: 0.0685, amount: 8500, ada: 582, wallet: "dolphin", ago: "22s", tx: "n2…" },
    { side: "sell", price: 0.0682, amount: 1200, ada: 81.8, wallet: "shrimp", ago: "40s", tx: "n3…" },
    { side: "buy", price: 0.0680, amount: 95000, ada: 6460, wallet: "whale", ago: "1m", tx: "n4…" },
    { side: "sell", price: 0.0678, amount: 18000, ada: 1220, wallet: "fish", ago: "2m", tx: "n5…" },
  ],
  ADA: [
    { side: "buy", price: 0.4825, amount: 12000, ada: 5790, wallet: "whale", ago: "5s", tx: "a…" },
    { side: "sell", price: 0.4818, amount: 3400, ada: 1638, wallet: "dolphin", ago: "18s", tx: "b…" },
  ],
};

ND.HOLDERS = {
  SUNDAE: [
    { label: "Top 10", pct: 28 },
    { label: "11–50", pct: 22 },
    { label: "51–200", pct: 18 },
    { label: "201–1k", pct: 16 },
    { label: "Retail", pct: 16 },
  ],
  NIGHT: [
    { label: "Top 10", pct: 35 },
    { label: "11–50", pct: 20 },
    { label: "51–200", pct: 15 },
    { label: "201–1k", pct: 14 },
    { label: "Retail", pct: 16 },
  ],
  default: [
    { label: "Top 10", pct: 30 },
    { label: "11–50", pct: 20 },
    { label: "51–200", pct: 18 },
    { label: "201–1k", pct: 15 },
    { label: "Retail", pct: 17 },
  ],
};

ND.PORTFOLIO = {
  wallets: [
    { id: "w1", label: "Main (Eternl)", address: "addr1qy…dream01", connected: true },
    { id: "w2", label: "DeFi (Lace)", address: "addr1qy…dream02", connected: true },
    { id: "w3", label: "NFTs (Vespr)", address: "addr1qy…dream03", connected: false },
  ],
  netWorth: [
    { t: -30, v: 42800 }, { t: -25, v: 44100 }, { t: -20, v: 43500 },
    { t: -15, v: 46200 }, { t: -10, v: 45800 }, { t: -5, v: 48100 }, { t: 0, v: 51240 },
  ],
  allocation: [
    { id: "ADA", pct: 42, value: 21520 },
    { id: "NIGHT", pct: 18, value: 9223 },
    { id: "SUNDAE", pct: 8, value: 4099 },
    { id: "SNEK", pct: 7, value: 3586 },
    { id: "MIN", pct: 6, value: 3074 },
    { id: "LP", pct: 12, value: 6148 },
    { id: "NFT", pct: 5, value: 2562 },
    { id: "Other", pct: 2, value: 1028 },
  ],
  tokens: [
    { id: "ADA", amount: 44650, value: 21520, cost: 19800, pnlPct: 8.7 },
    { id: "NIGHT", amount: 134800, value: 9223, cost: 7100, pnlPct: 29.9 },
    { id: "SUNDAE", amount: 288700, value: 4099, cost: 5200, pnlPct: -21.2 },
    { id: "SNEK", amount: 1938000, value: 3586, cost: 2900, pnlPct: 23.7 },
    { id: "MIN", amount: 106700, value: 3074, cost: 3100, pnlPct: -0.8 },
    { id: "LENFI", amount: 2100, value: 882, cost: 640, pnlPct: 37.8 },
  ],
  nfts: [
    { name: "SpaceBudz #4821", collection: "SpaceBudz", floor: 180, value: 195 },
    { name: "Clay Nation #1204", collection: "Clay Nation", floor: 95, value: 102 },
    { name: "Midnight Pass #88", collection: "Midnight Pass", floor: 420, value: 450 },
  ],
  lps: [
    { pair: "ADA/NIGHT", dex: "Minswap", value: 2840, apr: 18.4, pnlPct: 6.2 },
    { pair: "ADA/iUSD", dex: "Minswap", value: 2100, apr: 6.8, pnlPct: 1.1 },
    { pair: "ADA/SUNDAE", dex: "SundaeSwap", value: 1208, apr: 22.1, pnlPct: -4.5 },
  ],
  trades: [
    { side: "buy", token: "NIGHT", amount: 25000, price: 0.061, ada: 1525, when: "Sep 5, 2:14 PM CT" },
    { side: "sell", token: "SUNDAE", amount: 40000, price: 0.0151, ada: 604, when: "Sep 4, 9:02 AM CT" },
    { side: "buy", token: "LENFI", amount: 800, price: 0.38, ada: 304, when: "Sep 3, 6:40 PM CT" },
    { side: "buy", token: "SNEK", amount: 500000, price: 0.0016, ada: 800, when: "Sep 2, 11:20 AM CT" },
  ],
  best: { id: "LENFI", pnlPct: 37.8 },
  worst: { id: "SUNDAE", pnlPct: -21.2 },
};

ND.getToken = (id) => ND.TOKENS.find((t) => t.id === id || t.ticker === id);
ND.fmt = {
  usd(n, d = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    if (Math.abs(n) < 0.0001 && n !== 0) return "$" + n.toExponential(2);
    if (Math.abs(n) < 0.01 && n !== 0) return "$" + n.toFixed(6);
    return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
  },
  pct(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const s = (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
    return s;
  },
  num(n) {
    if (n == null) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Number(n).toLocaleString();
  },
  timeAgo(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return Math.floor(d) + "s ago";
    if (d < 3600) return Math.floor(d / 60) + "m ago";
    if (d < 86400) return Math.floor(d / 3600) + "h ago";
    return Math.floor(d / 86400) + "d ago";
  },
};

/* Float-aligned extras */
ND.TOKEN_EXTRA = {
  ADA:    { assetId: "lovelace", pools: 0, trades24: 18420, about: "Native Cardano asset. Settlement currency for most CNT pairs." },
  NIGHT:  { assetId: "night1…policy.NIGHT", pools: 12, trades24: 3840, about: "Midnight economic token. Sustains DUST capacity for shielded fees on the Midnight partner chain." },
  SUNDAE: { assetId: "9a9693a9…SUNDAE", pools: 18, trades24: 2104, about: "SundaeSwap governance / utility CNT. Deep-link demo comparable to Float's SUNDAE page." },
  MIN:    { assetId: "29d222ce…MIN", pools: 24, trades24: 2890, about: "Minswap DEX token." },
  iUSD:   { assetId: "f66d78b4…iUSD", pools: 14, trades24: 1560, about: "Indigo synthetic USD stablecoin." },
  DJED:   { assetId: "8db26911…DJED", pools: 11, trades24: 980, about: "Overcollateralized stablecoin on Cardano." },
  HOSKY:  { assetId: "a0028f35…HOSKY", pools: 9, trades24: 4200, about: "Community meme token." },
  SNEK:   { assetId: "279c909f…SNEK", pools: 16, trades24: 5100, about: "Cardano meme / community token." },
  WMTX:   { assetId: "1d7f33bd…WMTX", pools: 7, trades24: 640, about: "World Mobile Token." },
  LENFI:  { assetId: "da8c3085…LENFI", pools: 6, trades24: 720, about: "Lenfi lending protocol token." },
  LQ:     { assetId: "da8c3085…LQ", pools: 5, trades24: 410, about: "Liqwid governance token." },
  COPI:   { assetId: "b6a7461e…COPI", pools: 4, trades24: 220, about: "Cornucopias gaming metaverse." },
  DUST:   { assetId: "dust.native", pools: 0, trades24: 0, about: "Midnight fee resource generated from NIGHT — not a tradable CNT." },
  AGIX:   { assetId: "f43a62fd…AGIX", pools: 8, trades24: 880, about: "SingularityNET AI token (multi-chain)." },
  BOOK:   { assetId: "book1…BOOK", pools: 3, trades24: 95, about: "Book.io RWA / eBook token." },
};

ND.enrichTokens = function () {
  ND.TOKENS.forEach((t) => {
    const x = ND.TOKEN_EXTRA[t.id] || {};
    t.assetId = x.assetId || (t.policy + "." + t.ticker);
    t.pools = x.pools != null ? x.pools : 0;
    t.trades24 = x.trades24 != null ? x.trades24 : 0;
    t.about = x.about || (t.name + " on Cardano.");
  });
};
ND.enrichTokens();

ND.GLOBAL_TRADES = [
  { token: "NIGHT", side: "buy", price: 0.0688, amount: 42000, ada: 2889, wallet: "whale", ago: "8s", dex: "Minswap" },
  { token: "SUNDAE", side: "sell", price: 0.01418, amount: 12400, ada: 175.8, wallet: "fish", ago: "14s", dex: "SundaeSwap" },
  { token: "SNEK", side: "buy", price: 0.00186, amount: 890000, ada: 1655, wallet: "dolphin", ago: "22s", dex: "Minswap" },
  { token: "HOSKY", side: "buy", price: 0.00000043, amount: 5.2e9, ada: 2236, wallet: "whale", ago: "31s", dex: "Minswap" },
  { token: "MIN", side: "sell", price: 0.0287, amount: 18000, ada: 516.6, wallet: "fish", ago: "45s", dex: "Minswap" },
  { token: "LENFI", side: "buy", price: 0.421, amount: 1200, ada: 505, wallet: "dolphin", ago: "1m", dex: "Minswap" },
  { token: "ADA", side: "buy", price: 0.4825, amount: 12000, ada: 5790, wallet: "whale", ago: "1m", dex: "—" },
  { token: "SUNDAE", side: "buy", price: 0.01422, amount: 84200, ada: 1197, wallet: "whale", ago: "2m", dex: "SundaeSwap" },
  { token: "iUSD", side: "sell", price: 0.998, amount: 4500, ada: 4491, wallet: "fish", ago: "2m", dex: "Minswap" },
  { token: "NIGHT", side: "sell", price: 0.0682, amount: 1200, ada: 81.8, wallet: "shrimp", ago: "3m", dex: "Minswap" },
  { token: "SNEK", side: "sell", price: 0.00184, amount: 210000, ada: 386, wallet: "fish", ago: "4m", dex: "WingRiders" },
  { token: "DJED", side: "buy", price: 1.001, amount: 8000, ada: 8008, wallet: "whale", ago: "5m", dex: "WingRiders" },
];

/* Expand SUNDAE trades for expandable tape */
ND.TRADES.SUNDAE = ND.TRADES.SUNDAE.concat([
  { side: "buy", price: 0.01398, amount: 55000, ada: 768.9, wallet: "dolphin", ago: "7m", tx: "q7r8…" },
  { side: "sell", price: 0.01395, amount: 2100, ada: 29.3, wallet: "shrimp", ago: "9m", tx: "s9t0…" },
  { side: "buy", price: 0.01390, amount: 180000, ada: 2502, wallet: "whale", ago: "12m", tx: "u1v2…" },
  { side: "sell", price: 0.01388, amount: 33400, ada: 463.6, wallet: "fish", ago: "15m", tx: "w3x4…" },
  { side: "buy", price: 0.01385, amount: 6700, ada: 92.8, wallet: "fish", ago: "18m", tx: "y5z6…" },
]);

ND.TRADES.MIN = [
  { side: "buy", price: 0.0289, amount: 12000, ada: 346.8, wallet: "dolphin", ago: "20s", tx: "m1…" },
  { side: "sell", price: 0.0287, amount: 4500, ada: 129.2, wallet: "fish", ago: "1m", tx: "m2…" },
  { side: "buy", price: 0.0286, amount: 88000, ada: 2516, wallet: "whale", ago: "3m", tx: "m3…" },
];

ND.TRADES.SNEK = [
  { side: "buy", price: 0.00186, amount: 500000, ada: 930, wallet: "whale", ago: "15s", tx: "s1…" },
  { side: "sell", price: 0.00184, amount: 120000, ada: 220.8, wallet: "fish", ago: "40s", tx: "s2…" },
  { side: "buy", price: 0.00183, amount: 8000, ada: 14.6, wallet: "shrimp", ago: "2m", tx: "s3…" },
];
