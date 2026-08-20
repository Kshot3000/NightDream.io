/* ============================================================
   NightDream.io — app.js
   Day:   live Cardano CNT markets — multi-source: Minswap Aggregator
          (primary prices, js/feeds.js) + CoinGecko (24h stats, 7d
          sparklines, fallback price) + optional Charli3 (key-gated)
   Night: Midnight watchlist (local) + future data hook
   UI:    live tape, price flashes, token drawer, countdown, reveal
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const CG_BASE = "https://api.coingecko.com/api/v3";
  const REFRESH_MS = 60 * 1000;        // price refresh cadence (rate-limit friendly)
  const PROBE_GAP_MS = 2500;           // spacing between keyless platform probes
  const PROBE_LIMIT = 5;               // max /coins/{id} probes per search (keyless)
  const LIST_CACHE_MS = 10 * 60 * 1000; // cardano coin list cache (API-key mode)

  const KEYS = {
    theme: "nd-theme",
    watch: "nd-midnight-watch-v1",
    endpoint: "nd-midnight-endpoint",
    custom: "nd-custom-v1",
    cgkey: "nd-cg-key",
    c3key: "nd-c3-key",
  };

  /* Bundled data (js/registry.js) */
  const REGISTRY = Array.isArray(window.ND_REGISTRY) ? window.ND_REGISTRY : [];
  const SEED = Array.isArray(window.ND_SEED) ? window.ND_SEED : [];

  /* Registry lookups: ticker (lowercase) -> {t, a} */
  const registryByTicker = new Map();
  for (const r of REGISTRY) {
    const k = String(r.t).toLowerCase();
    if (k && !registryByTicker.has(k)) registryByTicker.set(k, r);
  }
  const seedBySymbol = new Map();
  const seedById = new Map();
  const seedByAsset = new Map();
  for (const s of SEED) {
    seedBySymbol.set(String(s.sym).toLowerCase(), s);
    seedById.set(s.id, s);
    if (s.assetId) seedByAsset.set(String(s.assetId).toLowerCase(), s);
  }

  const DONATION_ADDRESS =
    "addr1q8hnl6vl5a6k3rw3n5g3jtte696zcl76kfatzv7gpswa9r0dj7fma6klq55y4ffm7tf0em09udnyhuk4ah92pl5x9jpqjae44v";

  const els = {
    themeToggle: $("#themeToggle"),
    tapeTrack: $("#tapeTrack"),
    marketBody: $("#marketBody"),
    feedNote: $("#feedNote"),
    tokenSearch: $("#tokenSearch"),
    sortSelect: $("#sortSelect"),
    refreshBtn: $("#refreshBtn"),
    adaPrice: $("#adaPrice"),
    adaChange: $("#adaChange"),
    adaSpark: $("#adaSpark"),
    pillAda: $("#pillAda"),
    pillChg: $("#pillChg"),
    statCount: $("#statCount"),
    statWatch: $("#statWatch"),
    statFeed: $("#statFeed"),
    statUpdated: $("#statUpdated"),
    tokenAddInput: $("#tokenAddInput"),
    tokenAddBtn: $("#tokenAddBtn"),
    tokenAddStatus: $("#tokenAddStatus"),
    tokenAddResults: $("#tokenAddResults"),
    customWrap: $("#customWrap"),
    customChips: $("#customChips"),
    cgKeyInput: $("#cgKeyInput"),
    cgKeySave: $("#cgKeySave"),
    cgKeyClear: $("#cgKeyClear"),
    cgKeyStatus: $("#cgKeyStatus"),
    c3KeyInput: $("#c3KeyInput"),
    c3KeySave: $("#c3KeySave"),
    c3KeyClear: $("#c3KeyClear"),
    c3KeyStatus: $("#c3KeyStatus"),
    regSearch: $("#regSearch"),
    regTotal: $("#regTotal"),
    regBody: $("#regBody"),
    regMeta: $("#regMeta"),
    regMore: $("#regMore"),
    watchBody: $("#watchBody"),
    watchForm: $("#watchForm"),
    midnightEndpoint: $("#midnightEndpoint"),
    testEndpoint: $("#testEndpoint"),
    endpointStatus: $("#endpointStatus"),
    copyAddr: $("#copyAddr"),
    qrBox: $("#qrBox"),
    toast: $("#toast"),
    drawer: $("#tokenDrawer"),
    drawerScrim: $("#drawerScrim"),
    drawerClose: $("#drawerClose"),
    drawerImg: $("#drawerImg"),
    drawerName: $("#drawerName"),
    drawerSub: $("#drawerSub"),
    drawerPrice: $("#drawerPrice"),
    drawerSrc: $("#drawerSrc"),
    drawerAda: $("#drawerAda"),
    drawerChartWrap: $("#drawerChartWrap"),
    drawerChart: $("#drawerChart"),
    drawerChg: $("#drawerChg"),
    drawerVol: $("#drawerVol"),
    drawerMcap: $("#drawerMcap"),
    drawerSrcLabel: $("#drawerSrcLabel"),
    drawerMetaWrap: $("#drawerMetaWrap"),
    drawerAsset: $("#drawerAsset"),
    drawerCopyAsset: $("#drawerCopyAsset"),
    drawerLinkCE: $("#drawerLinkCE"),
    drawerLinkAS: $("#drawerLinkAS"),
    drawerLinkCG: $("#drawerLinkCG"),
    drawerLinkWeb: $("#drawerLinkWeb"),
  };

  const state = {
    tokens: [],
    ada: null,
    feedInfo: null, // which sources answered (for the feed note)
    lastUpdated: null,
    nextRefreshAt: null,
    feedLive: false,
    backoff: 1,
    timer: null,
    search: "",
    sort: "volume",
    flashes: {},   // key -> "up" | "down" for the latest refresh
    adaSpark: null,
  };

  const MAX_ROWS = 100; // cap on rendered market rows (tracked list is small anyway)

  const regState = { q: "", shown: 25 };
  let cardanoListCache = null; // {ts, list} for /coins/list?include_platform=cardano
  let drawerLastFocus = null;

  /* ---------------- formatters ---------------- */

  const nfWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const nfStd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfTiny = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 8 });
  const nfCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

  function fmtPrice(v) {
    if (v == null || !isFinite(v)) return "—";
    if (v >= 0.01) return nfStd.format(v);
    return nfTiny.format(v);
  }

  function fmtBig(v) {
    if (v == null || !isFinite(v) || v <= 0) return "—";
    return "$" + nfCompact.format(v);
  }

  function fmtPct(v) {
    if (v == null || !isFinite(v)) return "—";
    const sign = v > 0 ? "+" : "";
    return sign + v.toFixed(2) + "%";
  }

  function timeAgo(ts) {
    if (!ts) return "—";
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 10) return "just now";
    if (s < 60) return s + "s ago";
    const m = Math.round(s / 60);
    if (m < 60) return m + " min ago";
    return Math.round(m / 60) + " h ago";
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function copyText(text, okMsg) {
    const done = (ok) => toast(ok ? okMsg : "Copy failed — please select the text manually");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => done(true),
        () => fallbackCopy(text, done)
      );
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    done(ok);
  }

  /* ---------------- sparklines (7d, from CoinGecko) ---------------- */

  function sparkSVG(points, w, h, opts) {
    opts = opts || {};
    if (!points || points.length < 2) return "";
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p < min) min = p;
      if (p > max) max = p;
    }
    const range = (max - min) || 1;
    const n = points.length;
    const step = w / (n - 1);
    let d = "";
    for (let i = 0; i < n; i++) {
      const x = (i * step).toFixed(2);
      const y = (h - 2 - ((points[i] - min) / range) * (h - 6)).toFixed(2);
      d += (i ? " L" : "M") + x + " " + y;
    }
    const up = points[n - 1] >= points[0];
    const color = up ? "var(--up)" : "var(--down)";
    let inner = "";
    if (opts.area) {
      inner += '<path d="' + d + " L" + w + " " + h + " L0 " + h + ' Z" fill="' + color + '" fill-opacity="0.09"/>';
    }
    inner += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' + inner + "</svg>";
  }

  /* ---------------- theme ---------------- */

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "day" ? "day" : "night";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEYS.theme, theme); } catch (e) { /* private mode */ }
    const toDay = theme === "day";
    els.themeToggle.setAttribute("aria-pressed", String(toDay));
    els.themeToggle.setAttribute("aria-label", toDay ? "Switch to night theme" : "Switch to day theme");
    renderQR();
  }

  els.themeToggle.addEventListener("click", () => {
    setTheme(currentTheme() === "night" ? "day" : "night");
  });

  /* ---------------- feed status ---------------- */

  function setFeed(status, note) {
    els.statFeed.textContent =
      status === "live" ? "Live" :
      status === "refreshing" ? "Refreshing" :
      status === "stale" ? "Stale" :
      status === "waiting" ? "Waiting" : "Error";
    els.statFeed.dataset.status = status;
    state.feedLive = status === "live" || status === "refreshing";
    if (note != null) els.feedNote.textContent = note;
    if (state.lastUpdated) {
      els.statUpdated.textContent = "updated " + timeAgo(state.lastUpdated);
    }
  }

  /* ---------------- data layer ---------------- */

  function cgKey() {
    try { return (localStorage.getItem(KEYS.cgkey) || "").trim(); } catch (e) { return ""; }
  }

  async function cgFetch(path) {
    const headers = { accept: "application/json" };
    const key = cgKey();
    if (key) headers["x-cg-demo-api-key"] = key;
    const res = await fetch(CG_BASE + path, { headers });
    if (res.status === 429) {
      const err = new Error("CoinGecko rate limit reached");
      err.rateLimited = true;
      throw err;
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  /* Tracked universe = verified seed + user's custom list + ADA */
  function customTokens() {
    try {
      const raw = localStorage.getItem(KEYS.custom);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* fall through */ }
    return [];
  }

  function saveCustom(list) {
    try { localStorage.setItem(KEYS.custom, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  /* Tracked universe = verified seed + user's custom list. Each entry
     carries a CoinGecko id (24h stats + fallback price) and/or a Cardano
     asset ID (live Minswap price) — either source can carry a row. */
  function trackedTokens() {
    const out = [];
    const seenId = new Set();
    const seenAsset = new Set();
    const push = (t) => {
      if (!t) return;
      const id = t.id || null;
      const asset = t.assetId ? String(t.assetId).toLowerCase() : null;
      if (id && seenId.has(id)) return;
      if (asset && seenAsset.has(asset)) return;
      if (id) seenId.add(id);
      if (asset) seenAsset.add(asset);
      out.push({ id: id, assetId: asset || null, name: t.name || null, symbol: t.symbol || t.sym || null, cat: t.cat || null });
    };
    for (const s of SEED) push(s);
    for (const c of customTokens()) push(c);
    return out;
  }

  function trackedCgIds() {
    const ids = trackedTokens().filter((t) => t.id).map((t) => t.id);
    if (!ids.includes("cardano")) ids.push("cardano");
    return ids;
  }

  function trackedAssets() {
    return trackedTokens().filter((t) => t.assetId).map((t) => t.assetId);
  }

  function isTracked(t) {
    if (!t) return false;
    const id = t.id || null;
    const asset = t.assetId ? String(t.assetId).toLowerCase() : null;
    const customs = customTokens();
    if (id && (seedById.has(id) || customs.some((c) => c.id === id))) return true;
    if (asset && (seedByAsset.has(asset) || customs.some((c) => c.assetId && String(c.assetId).toLowerCase() === asset))) return true;
    return false;
  }

  function c3Key() {
    try { return (localStorage.getItem(KEYS.c3key) || "").trim(); } catch (e) { return ""; }
  }

  function shortId(a) {
    const s = String(a || "");
    return s.length > 12 ? s.slice(0, 6) + "…" + s.slice(-4) : s;
  }

  function assetIdForToken(t) {
    if (t.assetId) return t.assetId;
    const sym = String(t.symbol || "").toLowerCase();
    const seed = seedBySymbol.get(sym);
    if (seed && seed.assetId) return seed.assetId;
    const reg = registryByTicker.get(sym);
    if (reg && reg.a) return reg.a;
    return null;
  }

  /* ---------------- multi-source market load ---------------- */
  /*
   * Source order per price (first hit wins):
   *   1. Minswap Aggregator  — live DEX-pool prices for any asset ID (js/feeds.js)
   *   2. CoinGecko           — fallback, plus the only browser-safe provider
   *                            of 24h change / volume / market cap / 7d sparkline
   *   3. Charli3 (optional)  — key-gated rescue for tokens the first two
   *                            can't price (only when the visitor added a key)
   * The Minswap MAIN API carries the same volume/mcap data but sends no CORS
   * headers, so a static site cannot read it — see README, "How the data works".
   */

  async function loadMarket() {
    const F = window.ND_FEEDS;
    const toks = trackedTokens();
    const assets = trackedAssets();
    const cgIds = trackedCgIds();
    const key = c3Key();

    /* Prices from the previous round — for the up/down flash. */
    const prevPrices = {};
    for (const r of state.tokens) {
      if (r.key && r.current_price != null) prevPrices[r.key] = r.current_price;
    }

    /* Fire the independent sources in parallel; each degrades on its own. */
    const [aggR, adaR, diaR, cgR] = await Promise.allSettled([
      assets.length && F ? F.getPrices(assets) : Promise.resolve(null),
      F ? F.getAdaPrice("usd") : Promise.resolve(null),
      F ? F.getDiaAda() : Promise.resolve(null),
      cgIds.length ? cgFetch(
        "/coins/markets?vs_currency=usd&ids=" + encodeURIComponent(cgIds.join(",")) +
        "&per_page=250&sparkline=true"
      ) : Promise.resolve(null)
    ]);

    const agg = (aggR.status === "fulfilled" && aggR.value) ? aggR.value : null;
    const adaAgg = (adaR.status === "fulfilled") ? adaR.value : null;
    const diaAda = (diaR.status === "fulfilled") ? diaR.value : null;
    const cg = (cgR.status === "fulfilled" && Array.isArray(cgR.value)) ? cgR.value : null;
    const cgMap = {};
    if (cg) for (const r of cg) cgMap[r.id] = r;

    /* Merge into one row per tracked token (renderer-friendly shape). */
    const rows = toks.map((t) => {
      const a = t.assetId ? (agg || {})[t.assetId] : null;
      const c = (t.id && cgMap) ? cgMap[t.id] : null;
      const name = (a && a.name) || (c && c.name) || t.name || (t.id || t.assetId);
      const symbol = ((a && a.ticker) || (c && c.symbol) || t.symbol || "").toUpperCase();
      const logo = (a && a.logo) || (c && c.image) || null;

      let price = null;
      let source = null;
      let adaPrice = null;
      if (a && a.usd != null) { price = a.usd; adaPrice = a.ada; source = "minswap"; }
      if (price == null && c && c.current_price != null) { price = c.current_price; source = "coingecko"; }

      /* /coins/markets reports the 24h change as price_change_percentage_24h;
         the /coins/{id} endpoint uses the _in_currency suffix. Accept both. */
      const cgChg = (c && c.price_change_percentage_24h_in_currency != null)
        ? c.price_change_percentage_24h_in_currency
        : (c && c.price_change_percentage_24h != null ? c.price_change_percentage_24h : null);

      return {
        key: t.id || ("asset:" + (t.assetId || "")),
        id: t.id,
        assetId: t.assetId,
        name: name,
        symbol: symbol,
        image: logo,
        cat: t.cat || null,
        current_price: price,
        price_ada: adaPrice,
        price_change_percentage_24h_in_currency: cgChg,
        total_volume: (c && c.total_volume != null) ? c.total_volume : null,
        market_cap: (c && c.market_cap != null) ? c.market_cap : null,
        spark: (c && c.sparkline_in_7d && c.sparkline_in_7d.price) ? c.sparkline_in_7d.price : null,
        source: source,
        verified: !!(a && a.verified)
      };
    });

    /* Charli3 rescue pass — only for rows still without a price. */
    if (key && F) {
      const missing = rows.filter((r) => r.current_price == null && (r.symbol || r.assetId)).slice(0, 6);
      for (const r of missing) {
        try {
          const p = await F.charli3Price(r.symbol, r.assetId, key);
          if (p != null) { r.current_price = p; r.source = "charli3"; }
        } catch (e) { /* best-effort — stay quiet */ }
      }
    }

    /* Up/down flash map for the renderer. */
    const flashes = {};
    for (const r of rows) {
      const p0 = prevPrices[r.key];
      if (p0 != null && r.current_price != null && p0 !== r.current_price) {
        flashes[r.key] = r.current_price > p0 ? "up" : "down";
      }
    }
    state.flashes = flashes;

    /* ADA stat: Minswap Aggregator first, CoinGecko as fallback. */
    let ada = null;
    let adaSource = null;
    if (adaAgg && adaAgg.usd != null) {
      ada = {
        current_price: adaAgg.usd,
        price_change_percentage_24h_in_currency: adaAgg.change24h,
        source: "minswap"
      };
      adaSource = "minswap";
    } else if (diaAda && diaAda.usd != null) {
      ada = {
        current_price: diaAda.usd,
        price_change_percentage_24h_in_currency: diaAda.change24h,
        source: "dia"
      };
      adaSource = "dia";
    } else if (cgMap) {
      const c = cgMap["cardano"];
      if (c) {
        ada = {
          current_price: c.current_price,
          price_change_percentage_24h_in_currency: c.price_change_percentage_24h_in_currency,
          source: "coingecko"
        };
        adaSource = "coingecko";
      }
    }

    state.ada = ada;
    state.adaSpark = cgMap && cgMap["cardano"] &&
      cgMap["cardano"].sparkline_in_7d && cgMap["cardano"].sparkline_in_7d.price
      ? cgMap["cardano"].sparkline_in_7d.price : null;
    state.tokens = rows;
    state.lastUpdated = Date.now();
    state.feedInfo = {
      ada: adaSource,
      price: rows.some((r) => r.source === "minswap") ? "minswap" : (rows.some((r) => r.current_price != null) ? "coingecko" : null),
      stats: rows.some((r) => r.total_volume != null || r.market_cap != null) ? "coingecko" : null
    };

    /* Only a total failure is a hard error. */
    if (!ada && rows.every((r) => r.current_price == null)) {
      let err = null;
      for (const r of [aggR, adaR, diaR, cgR]) {
        if (r.status === "rejected" && r.reason) {
          err = err || r.reason;
          if (r.reason && r.reason.rateLimited) { err = r.reason; break; }
        }
      }
      throw (err || new Error("all feeds unreachable"));
    }
  }

  function feedNoteFor() {
    const info = state.feedInfo || {};
    const name = (s) => s === "minswap" ? "Minswap" : s === "charli3" ? "Charli3" : s === "dia" ? "DIA oracle" : s === "coingecko" ? "CoinGecko" : null;
    const bits = [];
    if (info.price) bits.push("prices: " + name(info.price) + (info.price === "minswap" ? " (DEX pools)" : ""));
    if (info.stats) bits.push("24h/vol/mcap/7d: " + name(info.stats));
    if (info.ada) bits.push("ADA: " + name(info.ada));
    if (!bits.length) bits.push("no source answered this round — retrying");
    return "Live — " + bits.join(" · ") + " · refreshed every minute · not financial advice";
  }

  async function refreshMarket(initial) {
    if (!initial) setFeed("refreshing");
    try {
      await loadMarket();
      state.backoff = 1;
      setFeed("live", feedNoteFor());
      render();
    } catch (err) {
      if (err.rateLimited) {
        state.backoff = Math.min(state.backoff * 2, 10);
        const wait = REFRESH_MS * state.backoff;
        setFeed("stale", "CoinGecko rate limit — " +
          (state.tokens.length ? "keeping last data, " : "") +
          "retrying in " + Math.round(wait / 1000) + "s");
      } else if (state.tokens.length) {
        setFeed("stale", "Feed hiccup (" + err.message + ") — showing last good data, retrying soon");
      } else {
        setFeed("error", "Couldn't reach the data feed (" + err.message + "). Check your connection — retrying…");
      }
    }
  }

  function scheduleNext(ms) {
    clearTimeout(state.timer);
    state.nextRefreshAt = Date.now() + ms;
    state.timer = setTimeout(() => {
      refreshMarket(false).then(() => scheduleNext(REFRESH_MS * state.backoff));
    }, ms);
  }

  /* ---------------- live tape ---------------- */

  function renderTape() {
    if (!els.tapeTrack) return;
    const toks = state.tokens
      .filter((t) => t.current_price != null)
      .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
      .slice(0, 20);
    if (!toks.length) return;
    const items = toks.map((t) => {
      const ch = t.price_change_percentage_24h_in_currency;
      let chHtml = "";
      if (ch != null) {
        chHtml = ' <span class="' + (ch >= 0 ? "pos" : "neg") + '">' +
          (ch >= 0 ? "▲" : "▼") + " " + Math.abs(ch).toFixed(1) + "%</span>";
      }
      return '<span class="tape-item"><b>' + escapeHtml((t.symbol || "?").toUpperCase()) +
        "</b> " + escapeHtml(fmtPrice(t.current_price)) + chHtml + "</span>";
    });
    const half = '<span class="tape-half">' + items.join('<span class="tape-sep">·</span>') + "</span>";
    els.tapeTrack.innerHTML = half + half; /* two identical halves => seamless loop */
  }

  /* ---------------- market rendering ---------------- */

  /* Curated board categories, in the order the community groups them. */
  const CAT_ORDER = ["DEX", "Lending & Synths", "Infra & Oracles", "Gaming & Launchpads", "Community & Meme"];

  function visibleTokens() {
    let list = state.tokens.slice();
    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => (t.name || "").toLowerCase().includes(q) || (t.symbol || "").toLowerCase().includes(q)
      );
    }
    const sorters = {
      volume: (a, b) => (b.total_volume || 0) - (a.total_volume || 0),
      price: (a, b) => (b.current_price || 0) - (a.current_price || 0),
      mcap: (a, b) => (b.market_cap || 0) - (a.market_cap || 0),
      change: (a, b) => (b.price_change_percentage_24h_in_currency || 0) - (a.price_change_percentage_24h_in_currency || 0),
      name: (a, b) => (a.name || "").localeCompare(b.name || ""),
      category: (a, b) => {
        const ia = CAT_ORDER.indexOf(a.cat), ib = CAT_ORDER.indexOf(b.cat);
        const ca = ia === -1 ? CAT_ORDER.length : ia;
        const cb = ib === -1 ? CAT_ORDER.length : ib;
        return (ca - cb) || ((b.total_volume || 0) - (a.total_volume || 0));
      },
    };
    list.sort(sorters[state.sort] || sorters.volume);
    return list.slice(0, MAX_ROWS);
  }

  function renderSkeletons() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 5; i++) {
      const tr = document.createElement("tr");
      for (let j = 0; j < 7; j++) {
        const td = document.createElement("td");
        td.appendChild(skeletonSpan());
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    els.marketBody.replaceChildren(frag);
  }

  function skeletonSpan() {
    const s = document.createElement("span");
    s.className = "skeleton";
    s.style.width = "5em";
    return s;
  }

  function render() {
    /* stats strip */
    if (state.ada) {
      els.adaPrice.textContent = fmtPrice(state.ada.current_price);
      const ch = state.ada.price_change_percentage_24h_in_currency;
      els.adaChange.textContent = fmtPct(ch) + " · 24h";
      els.adaChange.className = "stat-sub " + (ch == null ? "" : ch >= 0 ? "pos" : "neg");
      /* header pill */
      els.pillAda.textContent = fmtPrice(state.ada.current_price);
      els.pillChg.textContent = fmtPct(ch);
      els.pillChg.className = "ada-pill-chg" + (ch == null ? "" : ch >= 0 ? " pos" : " neg");
    }
    els.adaSpark.innerHTML = state.adaSpark ? sparkSVG(state.adaSpark, 120, 26) : "";
    els.statCount.textContent = String(trackedTokens().length);
    els.statWatch.textContent = String(watchList().length);

    /* live tape */
    renderTape();

    /* table */
    const rows = visibleTokens();
    const frag = document.createDocumentFragment();

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = state.tokens.length
        ? "No tokens match your search."
        : "Waiting for the first price feed…";
      tr.appendChild(td);
      frag.appendChild(tr);
    }

    rows.forEach((t, i) => {
      const tr = document.createElement("tr");
      tr.classList.add("row-click");
      tr.dataset.key = t.key;
      tr.title = "Click for the full token dossier";

      const rankTd = document.createElement("td");
      rankTd.className = "rank" + (i < 3 ? " r" + (i + 1) : "");
      rankTd.textContent = String(i + 1);

      const tokenTd = document.createElement("td");
      const a = document.createElement("a");
      a.className = "token-link";
      a.href = t.id
        ? "https://www.coingecko.com/en/coins/" + encodeURIComponent(t.id)
        : "https://cexplorer.com/asset/" + encodeURIComponent(t.assetId || "");
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      const cell = document.createElement("span");
      cell.className = "token-cell";
      if (t.image) {
        const img = document.createElement("img");
        img.src = t.image;
        img.alt = "";
        img.loading = "lazy";
        cell.appendChild(img);
      }
      const names = document.createElement("span");
      names.style.display = "grid";
      const nameSpan = document.createElement("span");
      nameSpan.className = "token-name";
      nameSpan.textContent = t.name || t.id;
      const symSpan = document.createElement("span");
      symSpan.className = "token-sym";
      symSpan.textContent = (t.symbol || "").toUpperCase();
      names.appendChild(nameSpan);
      names.appendChild(symSpan);
      cell.appendChild(names);

      /* ecosystem category (DEX / Lending / Infra / Gaming / Meme) */
      if (t.cat) {
        const catBadge = document.createElement("span");
        catBadge.className = "cat-badge";
        catBadge.textContent = t.cat;
        catBadge.title = "Ecosystem category";
        cell.appendChild(catBadge);
      }

      /* on-chain asset link when we know the asset ID */
      const assetId = t.assetId || assetIdForToken(t);
      if (assetId) {
        const asset = document.createElement("a");
        asset.className = "asset-link";
        asset.href = "https://cexplorer.com/asset/" + assetId;
        asset.target = "_blank";
        asset.rel = "noopener noreferrer";
        asset.title = "View asset " + assetId + " on CExplorer";
        asset.textContent = "⛓";
        cell.appendChild(asset);
      }

      a.appendChild(cell);
      tokenTd.appendChild(a);

      const priceTd = document.createElement("td");
      priceTd.className = "num";
      const pv = document.createElement("span");
      pv.className = "price-val";
      pv.textContent = fmtPrice(t.current_price);
      priceTd.appendChild(pv);
      if (t.price_ada != null) {
        priceTd.title = "≈ " + Number(t.price_ada).toPrecision(6) + " ADA · live Minswap pool price";
      }
      if (t.source) {
        const b = document.createElement("span");
        b.className = "src src-" + t.source;
        b.textContent = "◆";
        b.title = "Price source: " +
          (t.source === "minswap" ? "Minswap Aggregator (Cardano DEX pools)" :
           t.source === "coingecko" ? "CoinGecko" :
           "Charli3 (multi-DEX oracle, key-gated)");
        priceTd.appendChild(b);
      }
      if (state.flashes[t.key]) {
        priceTd.classList.add("flash-" + state.flashes[t.key]);
      }

      const ch = t.price_change_percentage_24h_in_currency;
      const chTd = document.createElement("td");
      chTd.className = "num " + (ch == null ? "" : ch >= 0 ? "pos" : "neg");
      chTd.textContent = (ch != null && ch >= 0 ? "▲ " : ch != null ? "▼ " : "") + fmtPct(ch);

      const sparkTd = document.createElement("td");
      sparkTd.className = "num spark-cell";
      if (t.spark) {
        sparkTd.innerHTML = sparkSVG(t.spark, 96, 30);
        const up = t.spark[t.spark.length - 1] >= t.spark[0];
        sparkTd.title = "7d trend: " + (up ? "up" : "down") + " (CoinGecko)";
      } else {
        const d = document.createElement("span");
        d.className = "spark-dash";
        d.textContent = "—";
        sparkTd.appendChild(d);
      }

      const volTd = document.createElement("td");
      volTd.className = "num";
      volTd.textContent = fmtBig(t.total_volume);

      const mcapTd = document.createElement("td");
      mcapTd.className = "num";
      mcapTd.textContent = fmtBig(t.market_cap);

      tr.append(rankTd, tokenTd, priceTd, chTd, sparkTd, volTd, mcapTd);
      frag.appendChild(tr);
    });

    els.marketBody.replaceChildren(frag);
  }

  els.tokenSearch.addEventListener("input", () => {
    state.search = els.tokenSearch.value;
    render();
  });
  els.sortSelect.addEventListener("change", () => {
    state.sort = els.sortSelect.value;
    render();
  });

  els.refreshBtn.addEventListener("click", async () => {
    if (els.refreshBtn.disabled) return;
    els.refreshBtn.disabled = true;
    els.refreshBtn.classList.add("busy");
    try {
      await refreshMarket(true);
      toast("Refreshed from the live feeds");
    } finally {
      els.refreshBtn.disabled = false;
      els.refreshBtn.classList.remove("busy");
    }
  });

  /* ---------------- token drawer ---------------- */

  function srcLabel(s) {
    return s === "minswap" ? "Minswap (DEX pools)" :
      s === "coingecko" ? "CoinGecko" :
      s === "charli3" ? "Charli3 (multi-DEX)" :
      s === "dia" ? "DIA oracle (signed)" : "—";
  }

  function openDrawer(t) {
    drawerLastFocus = document.activeElement;

    els.drawerImg.src = t.image || "";
    els.drawerImg.hidden = !t.image;
    els.drawerName.textContent = t.name || "—";
    els.drawerSub.textContent = (t.symbol || "").toUpperCase() +
      (t.cat ? "  ·  " + t.cat : "") +
      (t.verified ? "  ·  Minswap verified" : "");

    els.drawerPrice.textContent = fmtPrice(t.current_price);
    if (t.source) {
      els.drawerSrc.hidden = false;
      els.drawerSrc.className = "src src-" + t.source;
      els.drawerSrc.title = "Price source: " + srcLabel(t.source);
    } else {
      els.drawerSrc.hidden = true;
    }

    if (t.price_ada != null) {
      els.drawerAda.hidden = false;
      els.drawerAda.textContent = "≈ " + Number(t.price_ada).toPrecision(6) + " ADA in Minswap pools";
    } else {
      els.drawerAda.hidden = true;
    }

    if (t.spark) {
      els.drawerChartWrap.hidden = false;
      els.drawerChart.innerHTML = sparkSVG(t.spark, 360, 96, { area: true });
    } else {
      els.drawerChartWrap.hidden = true;
    }

    const ch = t.price_change_percentage_24h_in_currency;
    els.drawerChg.textContent = (ch != null && ch >= 0 ? "▲ " : ch != null ? "▼ " : "") + fmtPct(ch);
    els.drawerChg.className = (ch == null ? "" : ch >= 0 ? "pos" : "neg").trim();
    els.drawerVol.textContent = fmtBig(t.total_volume);
    els.drawerMcap.textContent = fmtBig(t.market_cap);
    els.drawerSrcLabel.textContent = srcLabel(t.source);

    const assetId = t.assetId || assetIdForToken(t);
    let metaVisible = false;
    if (assetId) {
      metaVisible = true;
      els.drawerAsset.textContent = assetId;
      els.drawerLinkCE.hidden = false;
      els.drawerLinkCE.href = "https://cexplorer.com/asset/" + assetId;
      els.drawerLinkAS.hidden = false;
      els.drawerLinkAS.href = "https://adastats.net/assets/" + assetId;
    } else {
      els.drawerLinkCE.hidden = true;
      els.drawerLinkAS.hidden = true;
    }
    if (t.id) {
      metaVisible = true;
      els.drawerLinkCG.hidden = false;
      els.drawerLinkCG.href = "https://www.coingecko.com/en/coins/" + encodeURIComponent(t.id);
    } else {
      els.drawerLinkCG.hidden = true;
    }
    const seed = seedBySymbol.get(String(t.symbol || "").toLowerCase());
    if (seed && seed.web) {
      metaVisible = true;
      els.drawerLinkWeb.hidden = false;
      els.drawerLinkWeb.href = seed.web;
    } else {
      els.drawerLinkWeb.hidden = true;
    }
    els.drawerMetaWrap.hidden = !metaVisible;
    els.drawerCopyAsset.disabled = !assetId;

    /* show — force a reflow so the slide-in always runs, even where
       requestAnimationFrame is throttled or never fires (headless tabs) */
    els.drawerScrim.hidden = false;
    els.drawer.hidden = false;
    void els.drawer.offsetWidth;
    els.drawerScrim.classList.add("open");
    els.drawer.classList.add("open");
    els.drawerClose.focus();
  }

  function closeDrawer() {
    if (els.drawer.hidden) return;
    els.drawerScrim.classList.remove("open");
    els.drawer.classList.remove("open");
    setTimeout(() => {
      els.drawer.hidden = true;
      els.drawerScrim.hidden = true;
      if (drawerLastFocus && drawerLastFocus.focus) drawerLastFocus.focus();
    }, 380);
  }

  /* Click anywhere on a market row (outside links/buttons) opens the drawer. */
  els.marketBody.addEventListener("click", (ev) => {
    if (ev.target.closest && ev.target.closest("a, button")) return;
    const tr = ev.target.closest ? ev.target.closest("tr") : null;
    if (!tr || tr.classList.contains("empty-row")) return;
    const t = state.tokens.find((x) => x.key === tr.dataset.key);
    if (t) openDrawer(t);
  });

  els.drawerClose.addEventListener("click", closeDrawer);
  els.drawerScrim.addEventListener("click", closeDrawer);

  els.drawerCopyAsset.addEventListener("click", () => {
    const id = els.drawerAsset.textContent;
    if (id && id !== "—") copyText(id, "Asset ID copied");
  });

  /* ---------------- keyboard ---------------- */

  function initKeyboard() {
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !els.drawer.hidden) {
        closeDrawer();
        return;
      }
      if (ev.key === "/" && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        const el = ev.target;
        const tag = (el && el.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || (el && el.isContentEditable)) return;
        ev.preventDefault();
        els.tokenSearch.focus();
        els.tokenSearch.select();
      }
    });
  }

  /* ---------------- scroll reveal ---------------- */

  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    const reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("revealed"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("revealed");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------------- add-token discovery ---------------- */

  function addStatus(msg, cls) {
    els.tokenAddStatus.textContent = msg || "";
    els.tokenAddStatus.className = "add-status" + (cls ? " " + cls : "");
  }

  async function loadCardanoCoinList() {
    if (cardanoListCache && Date.now() - cardanoListCache.ts < LIST_CACHE_MS) {
      return cardanoListCache.list;
    }
    const list = await cgFetch("/coins/list?include_platform=cardano");
    if (!Array.isArray(list) || !list.length) throw new Error("empty Cardano coin list");
    cardanoListCache = { ts: Date.now(), list: list };
    return list;
  }

  async function searchCardano(query) {
    const q = query.trim();
    if (!q) return [];
    const ql = q.toLowerCase();

    /* API-key path: one call, full Cardano platform list, filtered client-side */
    if (cgKey()) {
      try {
        const list = await loadCardanoCoinList();
        return list
          .filter((c) => (c.name || "").toLowerCase().includes(ql) || (c.symbol || "").toLowerCase().includes(ql))
          .slice(0, 12)
          .map((c) => ({ id: c.id, name: c.name, symbol: String(c.symbol || "").toUpperCase() }));
      } catch (e) {
        if (e.rateLimited) throw e;
        /* fall through to the keyless path */
      }
    }

    /* Keyless path: /search for candidates, then verify the Cardano
       platform per coin. Spaced out so we stay polite to the free tier. */
    const found = await cgFetch("/search?query=" + encodeURIComponent(q));
    const cands = ((found && found.coins) || []).slice(0, PROBE_LIMIT);
    const out = [];
    for (const c of cands) {
      try {
        const coin = await cgFetch("/coins/" + encodeURIComponent(c.id));
        if (coin && coin.platforms && coin.platforms.cardano) {
          out.push({
            id: coin.id,
            name: coin.name || c.name,
            symbol: String(coin.symbol || c.symbol || "").toUpperCase(),
          });
        }
      } catch (e) {
        if (e.rateLimited) throw e;
        /* skip this candidate */
      }
      await sleep(PROBE_GAP_MS);
    }
    return out;
  }

  function renderAddResults(cands) {
    els.tokenAddResults.replaceChildren();
    if (!cands.length) {
      const p = document.createElement("p");
      p.className = "add-empty";
      p.textContent = "No Cardano coins found. Check the spelling, or paste an asset ID, or browse the registry below and press Track.";
      els.tokenAddResults.appendChild(p);
      return;
    }
    const hint = document.createElement("p");
    hint.className = "add-hint";
    hint.textContent = (cands[0] && cands[0].assetId)
      ? "Resolved on-chain — click to track it live (Minswap price):"
      : "Found on Cardano — click to track it live:";
    els.tokenAddResults.appendChild(hint);
    cands.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "add-result";
      const known = isTracked(c);
      if (known) btn.disabled = true;
      btn.textContent = (known ? "✓ " : "+ ") + (c.name || c.id) + " (" + (c.symbol || "?") + ")" +
        (c.assetId ? " · " + shortId(c.assetId) : "");
      btn.addEventListener("click", () => addToken(c));
      els.tokenAddResults.appendChild(btn);
    });
  }

  function addToken(c) {
    if (isTracked(c)) {
      toast((c.name || "This token") + " is already on your live list");
      return;
    }
    const list = customTokens();
    list.unshift({
      id: c.id || null,
      assetId: c.assetId || null,
      name: c.name || (c.id || c.assetId),
      symbol: c.symbol || ""
    });
    saveCustom(list);
    renderCustomChips();
    renderAddResults([]);
    renderRegistryTrackState();
    addStatus((c.name || "Token") + " added — first price arrives on the next refresh (≤ 1 min).", "ok");
    refreshMarket(true);
    scheduleNext(REFRESH_MS);
    toast((c.name || "Token") + " added to your live list ☀");
  }

  const ASSET_ID_RE = /^[0-9a-f]{40,130}$/i;

  /* Resolve a pasted asset ID (policy + name hex) against the official
     Cardano Token Registry (name/ticker) and Minswap (live price). */
  async function resolveAssetId(raw) {
    const F = window.ND_FEEDS;
    const id = raw.toLowerCase();
    const [metaR, priceR] = await Promise.allSettled([
      F ? F.getMetadataOne(id) : Promise.resolve(null),
      F ? F.getPrices([id]) : Promise.resolve(null)
    ]);
    const meta = (metaR.status === "fulfilled") ? metaR.value : null;
    const px = (priceR.status === "fulfilled" && priceR.value) ? priceR.value[id] : null;
    const name = (meta && meta.name) || (px && px.name) || id;
    const symbol = ((meta && meta.ticker) || (px && px.ticker) || "").toUpperCase();
    return {
      assetId: id,
      name: name,
      symbol: symbol || name,
      price: (px && px.usd) || null,
      verified: !!(px && px.verified)
    };
  }

  async function runTokenSearch() {
    const q = els.tokenAddInput.value;
    if (!q.trim()) {
      addStatus("Type a token name or symbol first.", "bad");
      return;
    }

    /* Fast path: the visitor pasted an asset ID — resolve it on-chain. */
    if (ASSET_ID_RE.test(q.trim())) {
      els.tokenAddBtn.disabled = true;
      els.tokenAddResults.replaceChildren();
      addStatus("Resolving asset ID — official registry + Minswap pools…");
      try {
        const cand = await resolveAssetId(q.trim());
        renderAddResults([cand]);
        addStatus(cand.price != null
          ? cand.name + " — live price $" + Number(cand.price).toPrecision(4) + " from Minswap pools."
          : cand.name + " resolved — no Minswap price right now (illiquid or unlisted?). You can still track it.",
          cand.price != null ? "ok" : "bad");
      } catch (err) {
        addStatus("Couldn't resolve that asset ID (" + err.message + "). It should be the policy ID + token name as one hex string (64+ chars).", "bad");
      } finally {
        els.tokenAddBtn.disabled = false;
      }
      return;
    }

    els.tokenAddBtn.disabled = true;
    els.tokenAddResults.replaceChildren();
    addStatus("Searching Cardano… (keyless mode verifies each coin — a few seconds)");
    try {
      const cands = await searchCardano(q);
      renderAddResults(cands);
      addStatus(cands.length
        ? cands.length + " Cardano coin" + (cands.length === 1 ? "" : "s") + " found."
        : "Nothing found.", cands.length ? "ok" : "bad");
    } catch (err) {
      if (err.rateLimited) {
        addStatus("CoinGecko rate limit hit — wait a minute or two and try again.", "bad");
      } else {
        addStatus("Search failed (" + err.message + "). Try again in a moment.", "bad");
      }
    } finally {
      els.tokenAddBtn.disabled = false;
    }
  }

  els.tokenAddBtn.addEventListener("click", () => runTokenSearch());
  els.tokenAddInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      runTokenSearch();
    }
  });

  function renderCustomChips() {
    const list = customTokens();
    els.customChips.replaceChildren();
    if (!list.length) {
      els.customWrap.hidden = true;
      return;
    }
    els.customWrap.hidden = false;
    list.forEach((c, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const base = c.id || shortId(c.assetId) || "token";
      const label = document.createElement("span");
      label.textContent = (c.symbol || base).toUpperCase() + " · " + (c.name || base);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "chip-del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Remove " + (c.name || base) + " from your live list");
      del.addEventListener("click", () => {
        const next = customTokens().filter((_, idx) => idx !== i);
        saveCustom(next);
        renderCustomChips();
        toast((c.name || c.id) + " removed from your live list");
        refreshMarket(true);
        scheduleNext(REFRESH_MS);
      });
      chip.append(label, del);
      els.customChips.appendChild(chip);
    });
  }

  /* ---------------- feed settings (optional API key) ---------------- */

  function cgKeyStatus(msg, cls) {
    els.cgKeyStatus.textContent = msg || "";
    els.cgKeyStatus.className = "add-status" + (cls ? " " + cls : "");
  }

  function renderKeyState() {
    const has = Boolean(cgKey());
    els.cgKeyInput.value = has ? "••••••••" : "";
    els.cgKeyInput.placeholder = has
      ? "Key saved — full Cardano coin list enabled"
      : "CG demo API key (optional)";
    cgKeyStatus(
      has
        ? "API key active. Discovery now uses the full Cardano platform list (1 call, cached 10 min)."
        : "No key — discovery uses spaced, verified lookups (a few seconds per search). Both work; the key is only stored in this browser.",
      has ? "ok" : ""
    );
  }

  els.cgKeySave.addEventListener("click", () => {
    const v = els.cgKeyInput.value.trim();
    if (!v) {
      cgKeyStatus("Paste a key first, or use the Remove button.", "bad");
      return;
    }
    try { localStorage.setItem(KEYS.cgkey, v); } catch (e) { /* ignore */ }
    cardanoListCache = null;
    els.cgKeyInput.value = "";
    renderKeyState();
    toast("CoinGecko API key saved — discovery unlocked ☀");
  });

  els.cgKeyClear.addEventListener("click", () => {
    try { localStorage.removeItem(KEYS.cgkey); } catch (e) { /* ignore */ }
    cardanoListCache = null;
    els.cgKeyInput.value = "";
    renderKeyState();
    toast("API key removed — back to keyless mode");
  });

  /* ---------------- feed settings (optional Charli3 key) ---------------- */

  function c3KeyStatus(msg, cls) {
    els.c3KeyStatus.textContent = msg || "";
    els.c3KeyStatus.className = "add-status" + (cls ? " " + cls : "");
  }

  function renderC3KeyState() {
    const has = Boolean(c3Key());
    els.c3KeyInput.value = has ? "••••••••" : "";
    els.c3KeyInput.placeholder = has
      ? "Key saved — Charli3 rescue pricing active"
      : "Charli3 API key (optional)";
    c3KeyStatus(
      has
        ? "Charli3 key active. Tokens that Minswap and CoinGecko can't price will also try Charli3's multi-DEX feed (17k+ tokens, history)."
        : "No key — Charli3 is skipped. It's an optional third source; get a key from charli3.io if you want wider coverage. Stored only in this browser.",
      has ? "ok" : ""
    );
  }

  els.c3KeySave.addEventListener("click", () => {
    const v = els.c3KeyInput.value.trim();
    if (!v) {
      c3KeyStatus("Paste a key first, or use the Remove button.", "bad");
      return;
    }
    try { localStorage.setItem(KEYS.c3key, v); } catch (e) { /* ignore */ }
    els.c3KeyInput.value = "";
    renderC3KeyState();
    toast("Charli3 API key saved — third source active ☀");
  });

  els.c3KeyClear.addEventListener("click", () => {
    try { localStorage.removeItem(KEYS.c3key); } catch (e) { /* ignore */ }
    els.c3KeyInput.value = "";
    renderC3KeyState();
    toast("Charli3 key removed — back to Minswap + CoinGecko");
  });

  /* ---------------- registry ---------------- */

  function filteredRegistry() {
    const q = regState.q.trim().toLowerCase();
    if (!q) return REGISTRY;
    return REGISTRY.filter((r) =>
      String(r.t).toLowerCase().includes(q) || String(r.a).includes(q)
    );
  }

  /* Split text around the first occurrence of q, wrapping it in <mark>. */
  function fillHighlighted(el, text, q) {
    if (!q) { el.textContent = text; return; }
    const lower = String(text).toLowerCase();
    const ql = q.toLowerCase();
    let i = 0;
    let idx = lower.indexOf(ql);
    while (idx !== -1) {
      if (idx > i) el.appendChild(document.createTextNode(text.slice(i, idx)));
      const m = document.createElement("mark");
      m.textContent = text.slice(idx, idx + q.length);
      el.appendChild(m);
      i = idx + q.length;
      idx = lower.indexOf(ql, i);
    }
    if (i < text.length) el.appendChild(document.createTextNode(text.slice(i)));
  }

  function renderRegistry() {
    const all = filteredRegistry();
    const rows = all.slice(0, regState.shown);
    const frag = document.createDocumentFragment();
    const q = regState.q.trim();

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No registry entries match “" + regState.q + "”.";
      tr.appendChild(td);
      frag.appendChild(tr);
    }

    rows.forEach((r) => {
      const tr = document.createElement("tr");

      const tTd = document.createElement("td");
      const tSpan = document.createElement("span");
      tSpan.className = "reg-ticker";
      fillHighlighted(tSpan, r.t, q);
      tTd.appendChild(tSpan);

      const aTd = document.createElement("td");
      const code = document.createElement("code");
      code.className = "reg-asset";
      fillHighlighted(code, r.a, q);
      code.title = r.a;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "chip-del reg-copy";
      copy.textContent = "⧉";
      copy.title = "Copy asset ID";
      copy.setAttribute("aria-label", "Copy asset ID for " + r.t);
      copy.addEventListener("click", () => copyText(r.a, "Asset ID copied — " + r.t));
      aTd.append(code, copy);

      const lTd = document.createElement("td");
      lTd.className = "num reg-links";
      const mk = (label, href) => {
        const a = document.createElement("a");
        a.textContent = label;
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        return a;
      };
      lTd.append(
        mk("CExplorer", "https://cexplorer.com/asset/" + r.a),
        document.createTextNode(" · "),
        mk("ADAstats", "https://adastats.net/assets/" + r.a)
      );

      /* Live-track button: adds this registry token to the market board. */
      const trackTd = document.createElement("td");
      trackTd.className = "num reg-track";
      const tb = document.createElement("button");
      tb.type = "button";
      tb.className = "reg-track-btn";
      tb.dataset.asset = r.a;
      tb.dataset.name = r.t;
      trackTd.appendChild(tb);

      tr.append(tTd, aTd, lTd, trackTd);
      frag.appendChild(tr);
    });

    els.regBody.replaceChildren(frag);
    els.regMeta.textContent = "Showing " + rows.length + " of " + all.length +
      " entries · source: Minswap community registry (GitHub: minswap/minswap-tokens)";
    els.regTotal.textContent = all.length + " CNTs";
    els.regMore.style.display = rows.length < all.length ? "" : "none";
  }

  els.regSearch.addEventListener("input", () => {
    regState.q = els.regSearch.value;
    regState.shown = 25;
    renderRegistry();
  });

  els.regMore.addEventListener("click", () => {
    regState.shown += 25;
    renderRegistry();
    renderRegistryTrackState();
  });

  /* One delegated listener covers every Track button (rows re-render). */
  els.regBody.addEventListener("click", (ev) => {
    const btn = (ev.target && ev.target.closest) ? ev.target.closest(".reg-track-btn") : null;
    if (!btn) return;
    addToken({ assetId: btn.dataset.asset, name: btn.dataset.name, symbol: btn.dataset.name });
  });

  function renderRegistryTrackState() {
    els.regBody.querySelectorAll(".reg-track-btn").forEach((b) => {
      const tracked = isTracked({ assetId: b.dataset.asset });
      b.classList.toggle("tracked", tracked);
      b.textContent = tracked ? "✓ Live" : "⊕ Track";
      b.title = tracked
        ? "Already on your live list"
        : "Add " + b.dataset.name + " to your live list (live Minswap price)";
    });
  }

  /* ---------------- midnight watchlist ---------------- */

  const DEFAULT_WATCH = [
    { name: "NIGHT — Midnight", symbol: "NIGHT", status: "Upcoming", target: "2026", note: "Midnight's native privacy token — the night twin of Cardano's day. A separate-chain asset, so it's tracked here rather than on the public price board." },
    { name: "Midnight Launchpool Tokens", symbol: "TBA", status: "Testnet", target: "2026", note: "Tokens expected on Midnight's testnet — replace with real names as they appear." },
    { name: "Your pick", symbol: "ME", status: "Announced", target: "TBA", note: "Example entry — add the Midnight tokens you care about." },
  ];

  function watchList() {
    try {
      const raw = localStorage.getItem(KEYS.watch);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* fall through to defaults */ }
    return DEFAULT_WATCH.slice();
  }

  function saveWatch(list) {
    try { localStorage.setItem(KEYS.watch, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function statusBadge(status) {
    const b = document.createElement("span");
    b.className = "status-badge";
    b.dataset.status = status;
    b.textContent = status;
    return b;
  }

  function renderWatch() {
    const list = watchList();
    const frag = document.createDocumentFragment();

    if (!list.length) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Nothing on the radar yet — add the first Midnight token below.";
      tr.appendChild(td);
      frag.appendChild(tr);
    }

    list.forEach((w, i) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.textContent = w.name;

      const symTd = document.createElement("td");
      symTd.textContent = (w.symbol || "").toUpperCase();

      const statusTd = document.createElement("td");
      statusTd.appendChild(statusBadge(w.status));

      const targetTd = document.createElement("td");
      targetTd.textContent = w.target || "—";

      const noteTd = document.createElement("td");
      noteTd.textContent = w.note || "—";
      noteTd.style.whiteSpace = "normal";
      noteTd.style.minWidth = "12em";

      const actTd = document.createElement("td");
      const del = document.createElement("button");
      del.type = "button";
      del.className = "remove-btn";
      del.setAttribute("aria-label", "Remove " + w.name + " from watchlist");
      del.title = "Remove from watchlist";
      del.textContent = "✕";
      del.addEventListener("click", () => {
        const next = watchList().filter((_, idx) => idx !== i);
        saveWatch(next);
        renderWatch();
        toast("Removed " + w.name + " from the watchlist");
      });
      actTd.appendChild(del);

      tr.append(nameTd, symTd, statusTd, targetTd, noteTd, actTd);
      frag.appendChild(tr);
    });

    els.watchBody.replaceChildren(frag);
    els.statWatch.textContent = String(list.length);
  }

  els.watchForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(els.watchForm);
    const entry = {
      name: String(fd.get("name") || "").trim(),
      symbol: String(fd.get("symbol") || "").trim().toUpperCase(),
      status: String(fd.get("status") || "Announced"),
      target: String(fd.get("target") || "").trim(),
      note: String(fd.get("note") || "").trim(),
    };
    if (!entry.name || !entry.symbol) return;
    const list = watchList();
    list.unshift(entry);
    saveWatch(list);
    els.watchForm.reset();
    renderWatch();
    toast(entry.name + " added to the Midnight watchlist ☾");
  });

  /* ---------------- midnight endpoint hook ---------------- */

  try {
    const saved = localStorage.getItem(KEYS.endpoint);
    if (saved) els.midnightEndpoint.value = saved;
  } catch (e) { /* ignore */ }

  els.testEndpoint.addEventListener("click", async () => {
    const url = els.midnightEndpoint.value.trim();
    els.endpointStatus.className = "hook-status";
    els.endpointStatus.textContent = "";
    if (!url) {
      els.endpointStatus.textContent = "Paste a Midnight JSON endpoint first.";
      els.endpointStatus.classList.add("bad");
      return;
    }
    try { localStorage.setItem(KEYS.endpoint, url); } catch (e) { /* ignore */ }
    els.endpointStatus.textContent = "Checking connection…";
    try {
      const res = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
      const text = await res.text();
      if (!res.ok) {
        els.endpointStatus.textContent = "Reached, but it answered HTTP " + res.status + ".";
        els.endpointStatus.classList.add("bad");
        return;
      }
      let kind = "text";
      try { JSON.parse(text); kind = "JSON"; } catch (e) { /* non-JSON */ }
      els.endpointStatus.textContent = "Connected ✓ endpoint returns " + kind + ". Saved — we'll keep an eye on it.";
      els.endpointStatus.classList.add("ok");
    } catch (err) {
      els.endpointStatus.textContent = "Unreachable from the browser (network or CORS). Endpoint saved anyway.";
      els.endpointStatus.classList.add("bad");
    }
  });

  /* ---------------- donation ---------------- */

  els.copyAddr.addEventListener("click", () => {
    copyText(DONATION_ADDRESS, "Cardano address copied — thank you ☀");
  });

  function renderQR() {
    if (!els.qrBox || typeof window.QRCode === "undefined") return;
    try {
      els.qrBox.innerHTML = "";
      new window.QRCode(els.qrBox, {
        text: DONATION_ADDRESS,
        width: 168,
        height: 168,
        colorDark: "#10142e",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    } catch (e) {
      els.qrBox.innerHTML = "";
    }
  }

  /* ---------------- boot ---------------- */

  renderSkeletons();
  renderWatch();
  renderCustomChips();
  renderKeyState();
  renderC3KeyState();
  renderQR();
  renderRegistry();
  renderRegistryTrackState();
  initReveal();
  initKeyboard();
  refreshMarket(true);
  scheduleNext(REFRESH_MS);

  /* Pause polling while the tab is hidden (be kind to the free API tier),
     then catch up and resume when it's visible again. */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(state.timer);
      state.timer = null;
    } else if (!state.timer) {
      refreshMarket(false).then(() => scheduleNext(REFRESH_MS * state.backoff));
    }
  });

  /* Keep "updated Xs ago · next in Ys" fresh. */
  setInterval(() => {
    if (!state.lastUpdated) return;
    const base = "updated " + timeAgo(state.lastUpdated);
    if (state.nextRefreshAt && state.feedLive) {
      const s = Math.max(0, Math.round((state.nextRefreshAt - Date.now()) / 1000));
      els.statUpdated.textContent = base + " · next in " + s + "s";
    } else {
      els.statUpdated.textContent = base;
    }
  }, 1000);
})();
