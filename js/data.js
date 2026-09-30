/* NightDream — shared state + formatters. Market data is LIVE (see live.js);
   ND.TOKENS is populated from CoinGecko on boot. No demo figures anywhere. */
window.ND = window.ND || {};

ND.META = {
  live: true,
  network: "Cardano mainnet",
  sources: ["CoinGecko", "DexScreener", "Koios", "MinSwap"],
};

/* Midnight economics (documented concepts — model inputs, not market data) */
ND.MIDNIGHT = {
  dustPerNightMax: 5,
  generationNote: "Each NIGHT can sustain up to 5 DUST capacity. Generation rate depends on holdings and Midnight network parameters (model estimates).",
  bridgeNote: "Cardano hosts NIGHT; Midnight uses DUST for shielded tx fees. A bridge moves value Cardano ↔ Midnight while preserving the NIGHT→DUST generation model.",
};

/* Live token list (filled by ND.ensureMarkets) */
ND.TOKENS = [];
ND._marketsAt = 0;

ND.ensureMarkets = async function (force) {
  const rows = await LIVE.markets(force);
  ND._marketsTried = true; /* at least one fetch attempt has completed */
  if (rows && rows.length) {
    ND.TOKENS = rows;
    ND._marketsAt = Date.now();
    ND._marketsError = false;
  } else if (!ND.TOKENS.length) {
    /* Only count as an error when there is no usable data at all;
       a failed refresh with a stale table in place stays quiet. */
    ND._marketsError = true;
  }
  return ND.TOKENS;
};

ND.getToken = function (id) {
  if (!id) return null;
  const q = String(id).toUpperCase();
  return ND.TOKENS.find((t) => t.ticker === q || t.id === q || t.cg === String(id).toLowerCase()) || null;
};

ND.getTokenByCg = function (cg) {
  return ND.TOKENS.find((t) => t.cg === cg) || null;
};

ND.fmt = {
  usd(n, d = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    if (n === 0) return "$0.00";
    if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    if (Math.abs(n) < 0.0001) return "$" + n.toExponential(2);
    if (Math.abs(n) < 0.01) return "$" + n.toFixed(6);
    if (Math.abs(n) < 1) return "$" + n.toFixed(4);
    return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
  },
  ada(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ₳";
  },
  pct(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  },
  num(n) {
    if (n == null) return "—";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  },
  exactUsd(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 20 });
  },
  exactNum(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 20 });
  },
  // Abbreviated number with the exact value in a title tooltip (no tooltip when identical).
  numx(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const abbr = this.num(n), exact = this.exactNum(n);
    return exact === abbr ? abbr : `<span title="${exact}">${abbr}</span>`;
  },
  // Abbreviated USD with the exact value in a title tooltip (no tooltip when identical).
  usdx(n, d = 2) {
    if (n == null || Number.isNaN(n)) return "—";
    if (n === 0) return this.usd(0);
    const abbr = this.usd(n, d), exact = this.exactUsd(n);
    return exact === abbr ? abbr : `<span title="${exact}">${abbr}</span>`;
  },
  // Price with the exact value in a title tooltip (no tooltip when identical).
  prx(n, d = 4) {
    if (n == null || Number.isNaN(n)) return "—";
    if (n === 0) return this.usd(0);
    const abbr = this.usd(n, d), exact = this.exactUsd(n);
    return exact === abbr ? abbr : `<span title="${exact}">${abbr}</span>`;
  },
  timeAgo(ts) {
    const t = typeof ts === "number" ? ts : new Date(ts).getTime();
    const d = (Date.now() - t) / 1000;
    if (d < 0) return "just now";
    if (d < 60) return Math.floor(d) + "s ago";
    if (d < 3600) return Math.floor(d / 60) + "m ago";
    if (d < 86400) return Math.floor(d / 3600) + "h ago";
    return Math.floor(d / 86400) + "d ago";
  },
  date(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  },
  hexShort(h, n = 12) {
    if (!h) return "—";
    return h.length > n * 2 + 1 ? h.slice(0, n) + "…" + h.slice(-n) : h;
  },
};
