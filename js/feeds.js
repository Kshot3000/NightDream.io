/* ============================================================
   NightDream.io - feeds.js
   Multi-source Cardano data layer (browser-safe; CORS-verified).

   1. Minswap Aggregator  (agg-api.minswap.org/aggregator)
      Primary live prices — USD + ADA — for ANY Cardano asset ID,
      in one batch call. Works without a key.
   2. tokens.cardano.org  (Cardano Token Registry, CIP-26 / CIP-68)
      Official, signature-verified token metadata: name, ticker,
      decimals, project URL. Used to resolve and enrich assets.
   3. Charli3 API         (api.charli3.io/api/v1)
      Optional, key-gated, best-effort: multi-DEX current prices
      and history for 17k+ tokens. Only used when the visitor
      pastes a Charli3 API key in Feed settings.

   4. CoinGecko (app.js)  Fallback price + 24h change / volume /
      market cap / 7d sparkline for the tokens it lists. Keyless;
      free tier is rate-limited, so the site stays gentle with it.
   5. DIA Data API        (api.diadata.org/v1)
      Independent, signed oracle. CORS-open (*), no key.
      GET /assetQuotation/Cardano/0x000…0 → ADA price + 24h change +
      per-exchange volume. Covers ADA but NOT the CNT long tail,
      so it's a second ADA source (Minswap → DIA → CoinGecko), not a
      general price feed.

   EVALUATED, NOT IN THE BOARD (all verified, see README table)
   - Minswap MAIN API : full TapTools-style dataset, but sends NO
                        Access-Control-Allow-Origin → a static site
                        can't read it from the browser.
   - CoinMarketCap    : free data-api has no CORS (browser blocks it);
                        Pro is key-gated, needs a CMC id/slug per
                        token (we key by CoinGecko id + asset ID), and
                        the unkeyed 401 carries no CORS headers.
   - TradingView      : scanner is CORS-open and prices exact
                        exchange symbols (BINANCE:ADAUSDT), but Cardano
                        tokens are exchange-specific/on-chain and there
                        is no reliable ticker→symbol resolver → poor
                        general CNT fit without a fragile symbol map.
   - OKX              : CORS-open but lists only ADA among Cardano
                        tokens (SUNDAE/MIN → "instrument doesn't
                        exist") → useless for the long tail.
   - Pyth Network     : Hermes DNS-flaky + public v2 is a marketing
                        site; majors-focused, no long-tail CNTs.
   - Sundaeswap/TapTools/DexHunters/Orcfax : retired/offline/no REST.

   Net: Minswap (any asset ID) + CoinGecko (stats/charts) + optional
   Charli3 (rescue) + official Registry (metadata) is the optimal,
   robust, browser-safe pipeline for Cardano.

   This file has no DOM access. app.js owns rendering and storage.
   ============================================================ */
(function (root) {
  "use strict";

  var AGG_BASE = "https://agg-api.minswap.org/aggregator";
  var REG_BASE = "https://tokens.cardano.org";
  var C3_BASE = "https://api.charli3.io/api/v1";
  var DIA_BASE = "https://api.diadata.org/v1";
  var DIA_ADA_ADDRESS = "0x0000000000000000000000000000000000000000";
  var DEFAULT_TIMEOUT_MS = 12000;
  var C3_TIMEOUT_MS = 7000;

  function FeedError(message, status) {
    var e = new Error(message);
    e.name = "FeedError";
    e.status = status || null;
    return e;
  }

  async function jfetch(url, opts, timeoutMs) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, timeoutMs || DEFAULT_TIMEOUT_MS);
    var res;
    try {
      res = await fetch(url, Object.assign(
        { signal: ctl.signal, headers: { accept: "application/json" } },
        opts || {}
      ));
    } catch (err) {
      if (err && err.name === "AbortError") throw FeedError("timeout", null);
      throw FeedError("network error", null);
    } finally {
      clearTimeout(t);
    }
    if (res.status === 429) {
      var rl = FeedError("rate limit", 429);
      rl.rateLimited = true;
      throw rl;
    }
    if (!res.ok) throw FeedError("HTTP " + res.status, res.status);
    try {
      return await res.json();
    } catch (e) {
      throw FeedError("bad JSON response", res.status);
    }
  }

  /* ---------- 1) Minswap Aggregator ---------- */

  /* ADA price + 24h change. GET /ada-price?currency=usd
     -> {"currency":"usd","value":{"change_24h":9.7,"price":0.19}} */
  async function getAdaPrice(currency) {
    var cur = currency || "usd";
    var data = await jfetch(AGG_BASE + "/ada-price?currency=" + encodeURIComponent(cur));
    var v = data && data.value;
    if (!v || v.price == null) throw FeedError("bad ada-price payload", null);
    return {
      currency: cur,
      price: v.price,
      usd: cur === "usd" ? v.price : null,
      change24h: v.change_24h != null ? v.change_24h : null
    };
  }

  /* ---------- DIA Data API (independent signed oracle; ADA on Cardano) ----------
     CORS-open (*), no key. GET /assetQuotation/Cardano/<addr>.
     Covers ADA (Cardano native) and many other chains, but NOT the Cardano
     CNT long tail (SUNDAE/MIN/etc. -> "no rows in result set"). Used as a
     second, independent source for the ADA stat. */
  async function getDiaAda() {
    var d = await jfetch(DIA_BASE + "/assetQuotation/Cardano/" + DIA_ADA_ADDRESS);
    if (!d || d.Price == null) throw FeedError("bad dia payload", null);
    var price = d.Price;
    var change = (d.PriceYesterday != null && d.PriceYesterday > 0)
      ? (price / d.PriceYesterday - 1) * 100 : null;
    return {
      usd: price,
      price: price,
      change24h: change,
      volume: (d.VolumeYesterdayUSD != null ? d.VolumeYesterdayUSD : null),
      signature: d.Signature || null
    };
  }

  /* Batch live prices for asset IDs (<policyId><tokenName> hex).
     POST /tokens {query:"", only_verified:false, assets:[...]}
     -> {tokens:[{token_id, logo, ticker, is_verified, price_by_ada,
                  price_by_usd, project_name, decimals}], ...}
     Returns an object keyed by lowercase asset ID. */
  async function getPrices(assets) {
    var list = (assets || []).filter(Boolean).map(String).slice(0, 100);
    if (!list.length) return {};
    var data = await jfetch(AGG_BASE + "/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "", only_verified: false, assets: list })
    }, DEFAULT_TIMEOUT_MS);
    var out = {};
    var arr = (data && data.tokens) || [];
    for (var i = 0; i < arr.length; i++) {
      var t = arr[i];
      if (!t || !t.token_id) continue;
      out[String(t.token_id).toLowerCase()] = {
        assetId: t.token_id,
        ticker: t.ticker || null,
        name: t.project_name || null,
        logo: t.logo || null,
        usd: t.price_by_usd != null ? t.price_by_usd : null,
        ada: t.price_by_ada != null ? t.price_by_ada : null,
        decimals: t.decimals != null ? t.decimals : null,
        verified: !!t.is_verified
      };
    }
    return out;
  }

  /* ---------- 2) Cardano Token Registry (tokens.cardano.org) ---------- */

  function pickVal(node) {
    if (node == null) return null;
    if (typeof node === "object" && "value" in node) return node.value;
    return node;
  }

  function metaFromEntry(e) {
    if (!e) return null;
    var name = pickVal(e.name);
    var ticker = pickVal(e.ticker);
    return {
      subject: e.subject || null,
      name: name != null ? String(name) : null,
      ticker: ticker != null ? String(ticker) : null,
      decimals: pickVal(e.decimals),
      url: pickVal(e.url),
      description: pickVal(e.description)
    };
  }

  /* Batch official metadata. POST /metadata/query
     {subjects:[...], properties:[...]} -> {subjects:[{...}]} */
  async function getMetadata(subjects) {
    var list = (subjects || []).filter(Boolean).map(String).slice(0, 100);
    if (!list.length) return {};
    var data = await jfetch(REG_BASE + "/metadata/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subjects: list,
        properties: ["name", "ticker", "decimals", "url", "description"]
      })
    }, DEFAULT_TIMEOUT_MS);
    var out = {};
    var arr = (data && data.subjects) || [];
    for (var i = 0; i < arr.length; i++) {
      var m = metaFromEntry(arr[i]);
      if (m && m.subject) out[String(m.subject).toLowerCase()] = m;
    }
    return out;
  }

  /* Single official metadata entry. GET /metadata/{subject} */
  async function getMetadataOne(subject) {
    var data = await jfetch(REG_BASE + "/metadata/" + encodeURIComponent(subject));
    return metaFromEntry(data) || null;
  }

  /* ---------- 3) Charli3 (optional, key-gated, best-effort) ---------- */

  function num(v) {
    return (typeof v === "number" && isFinite(v)) ? v : null;
  }

  /* Defensive price extraction: Charli3's exact payload shape is
     documented as TradingView-brokerage style, so we look for the
     last close / a plausible price field without assuming depth. */
  function extractPrice(json, depth) {
    if (depth == null) depth = 0;
    if (depth > 5 || json == null) return null;
    var n = num(json);
    if (n != null) return n;
    if (Array.isArray(json)) {
      if (!json.length) return null;
      var last = json[json.length - 1];
      var p = extractPrice(last, depth + 1);
      return p != null ? p : (num(last) != null ? last : null);
    }
    if (typeof json === "object") {
      var keys = ["price", "value", "close", "last", "usd_price", "usd"];
      for (var i = 0; i < keys.length; i++) {
        var v = num(json[keys[i]]);
        if (v != null) return v;
      }
      var containers = ["data", "result", "series", "current", "token", "tokens", "quote"];
      for (var j = 0; j < containers.length; j++) {
        var c = json[containers[j]];
        if (c != null) {
          var r = extractPrice(c, depth + 1);
          if (r != null) return r;
        }
      }
      /* TradingView-style flat series: {t:[...], c:[...]} */
      if (Array.isArray(json.t) && Array.isArray(json.c) && json.c.length) {
        return num(json.c[json.c.length - 1]);
      }
    }
    return null;
  }

  /* Best-effort current USD price for a token. Tries, in order:
     GET /tokens/current?policy=<56-hex policy>
     GET /history?symbol=<TICKER>&resolution=1d  (last close)
     Returns a number, or null when the key is missing, the request
     fails, or no plausible price can be parsed. Never throws. */
  async function charli3Price(symbol, assetId, key) {
    if (!key) return null;
    var headers = { accept: "application/json", authorization: "Bearer " + key };
    var policy = String(assetId || "").toLowerCase().slice(0, 56);

    if (policy.length === 56 && /^[0-9a-f]{56}$/.test(policy)) {
      try {
        var d1 = await jfetch(C3_BASE + "/tokens/current?policy=" + policy, { headers: headers }, C3_TIMEOUT_MS);
        var p1 = extractPrice(d1);
        if (p1 != null) return p1;
      } catch (e) { /* try the history route */ }
    }

    if (symbol) {
      try {
        var to = Math.floor(Date.now() / 1000);
        var from = to - 3 * 86400;
        var url = C3_BASE + "/history?symbol=" + encodeURIComponent(String(symbol).toUpperCase()) +
          "&resolution=1d&from=" + from + "&to=" + to + "&include_tvl=";
        var d2 = await jfetch(url, { headers: headers }, C3_TIMEOUT_MS);
        var p2 = extractPrice(d2);
        if (p2 != null) return p2;
      } catch (e) { /* give up quietly */ }
    }
    return null;
  }

  root.ND_FEEDS = {
    getAdaPrice: getAdaPrice,
    getPrices: getPrices,
    getMetadata: getMetadata,
    getMetadataOne: getMetadataOne,
    charli3Price: charli3Price,
    getDiaAda: getDiaAda,
    FeedError: FeedError
  };
})(typeof window !== "undefined" ? window : this);
