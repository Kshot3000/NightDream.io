/* NightDream — app shell. All market data is LIVE (CoinGecko/DexScreener/Koios).
   Boot paints skeletons, loads the token universe, then renders for real. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const fmt = ND.fmt;
  const chClass = (n) => (n > 0 ? "up" : n < 0 ? "down" : "flat");
  const watch = new Set(JSON.parse(localStorage.getItem("nd.watch") || "[]"));
  const chartRanges = { ADA: "30D", NIGHT: "30D", TOKEN: "7D" };
  let chartType = "line"; // line | candle
  let marketSort = { key: "mcap", dir: -1 };
  let currentToken = null;
  let currentRoute = "overview";
  let dexAggCache = null, dexAggAt = 0;

  function saveWatch() { localStorage.setItem("nd.watch", JSON.stringify([...watch])); }
  function toggleWatch(id) {
    if (watch.has(id)) watch.delete(id); else watch.add(id);
    saveWatch();
    $$(`[data-star="${CSS.escape(id)}"]`).forEach((b) => b.classList.toggle("on", watch.has(id)));
    if (currentRoute === "watchlist") renderWatchlist();
    if (currentRoute === "overview") renderWatchPanel();
  }

  function toast(msg) {
    const host = $("#toastHost") || document.body;
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function freshLabel() {
    if (!ND._marketsAt) return "connecting…";
    const s = Math.floor((Date.now() - ND._marketsAt) / 1000);
    if (s < 60) return `live · ${s}s ago`;
    return `live · ${Math.floor(s / 60)}m ago`;
  }
  function paintFresh() {
    const label = freshLabel();
    const df = $("#dataFresh");
    if (df) df.innerHTML = `<span class="pulse"></span> ${label}`;
    const mf = $("#marketsFresh");
    if (mf) mf.textContent = label;
    const lu = $("#lastUpdated");
    if (lu) lu.textContent = ND._marketsAt ? "Updated " + fmt.timeAgo(ND._marketsAt) : "";
  }

  /* token icon: CoinGecko image with letter fallback */
  function icon(t, sm) {
    const cls = "token-avatar" + (sm ? " sm" : "");
    const tick = (t && t.ticker ? t.ticker : "?").replace(/'/g, "");
    if (t && t.image) {
      return `<img class="${cls}" src="${t.image}" alt="" loading="lazy" onerror="this.outerHTML=window.ND.__fbIcon('${tick}','${cls}')">`;
    }
    return window.ND.__fbIcon(tick, cls);
  }
  ND.__fbIcon = (ticker, cls) => {
    const ch = String(ticker || "?").replace(/^\$/, "").charAt(0).toUpperCase() || "?";
    return `<span class="${cls}">${ch}</span>`;
  };

  /* DEX venue logos (self-hosted ecosystem assets) keyed by DexScreener dexId */
  const DEX_LOGOS = {
    minswap: "minswap.png",
    sundaeswap: "sundaeswap.png",
    wingriders: "wingriders.png",
    vyfi: "vyfi.png",
  };
  function dexCell(name) {
    const key = String(name || "").toLowerCase().replace(/[^a-z]/g, "");
    const file = DEX_LOGOS[key];
    const img = file ? `<img src="./assets/ecosystem/${file}" alt="" loading="lazy" />` : "";
    return `<span class="dex-cell">${img}<span>${name || "—"}</span></span>`;
  }
  function liqBar(liq, maxLiq) {
    const pct = maxLiq > 0 ? ((liq || 0) / maxLiq * 100).toFixed(1) : 0;
    return `<div>${fmt.usd(liq)}</div><div class="liq-bar"><i style="width:${pct}%"></i></div>`;
  }

  const skel = (n, h) => Array.from({ length: n }).map(() =>
    `<div class="skel" style="height:${h || 14}px;margin:8px 0"></div>`).join("");
  const skelCards = (n) => Array.from({ length: n }).map(() =>
    `<div class="stat-card"><div class="skel" style="height:11px;width:55%"></div><div class="skel" style="height:22px;width:75%;margin-top:10px"></div><div class="skel" style="height:11px;width:45%;margin-top:8px"></div></div>`).join("");
  /* Chart error overlay (canvas stays, dimmed): message + retry inside .chart-wrap */
  function chartError(canvas, msg, retry) {
    const wrap = canvas?.closest(".chart-wrap");
    if (!wrap) return;
    canvas.style.opacity = "0.25";
    let ov = wrap.querySelector(".chart-error");
    if (!ov) { ov = document.createElement("div"); ov.className = "chart-error"; wrap.appendChild(ov); }
    ov.innerHTML = `<div class="empty" style="padding:16px"><strong>${msg}</strong><br><button class="btn btn-sm" type="button">Retry</button></div>`;
    ov.querySelector("button")?.addEventListener("click", (e) => { e.stopPropagation(); clearChartError(canvas); retry(); });
  }
  function clearChartError(canvas) {
    canvas.style.opacity = "";
    canvas.closest(".chart-wrap")?.querySelector(".chart-error")?.remove();
  }

  /* ——— Router ——— */
  function parseHash() {
    const h = (location.hash || "#overview").replace(/^#/, "");
    const i = h.indexOf("/");
    return i < 0 ? { route: h || "overview", param: null }
      : { route: h.slice(0, i), param: decodeURIComponent(h.slice(i + 1)) };
  }
  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }
  const ROUTES = ["overview", "markets", "token", "portfolio", "dex", "midnight", "watchlist"];

  function render() {
    const { route, param } = parseHash();
    currentRoute = ROUTES.includes(route) ? route : "overview";
    closeSidebar();
    $$(".section").forEach((p) => p.classList.toggle("visible", p.dataset.section === currentRoute));
    $$("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === currentRoute));
    document.title = "NightDream.xyz — " + currentRoute.charAt(0).toUpperCase() + currentRoute.slice(1);
    if (currentRoute === "overview") renderOverview();
    if (currentRoute === "markets") renderMarkets();
    if (currentRoute === "token") renderToken(param);
    if (currentRoute === "portfolio") WALLET_UI.render();
    if (currentRoute === "dex") renderDex();
    if (currentRoute === "midnight") renderMidnight();
    if (currentRoute === "watchlist") renderWatchlist();
    syncToggleAria(); // reflect .active toggle state to assistive tech
  }

  // a11y: mirror .active toggle-button state onto aria-pressed
  function syncToggleAria() {
    $$(".seg-btn, .tab").forEach((b) => b.setAttribute("aria-pressed", b.classList.contains("active") ? "true" : "false"));
  }

  /* ——— Shared DEX aggregation (top tracked tokens → pairs) ——— */
  async function getDexAgg() {
    if (dexAggCache && Date.now() - dexAggAt < 10 * 60 * 1000) return dexAggCache;
    const top = [...ND.TOKENS].filter((t) => t.unit && t.unit !== "lovelace")
      .sort((a, b) => (b.mcap || 0) - (a.mcap || 0)).slice(0, 12);
    const pairs = [];
    for (let i = 0; i < top.length; i += 4) {
      const chunk = await Promise.all(top.slice(i, i + 4).map((t) => LIVE.dexPairs(t.unit)));
      chunk.forEach((d) => { if (d) pairs.push(...d.pairs); });
    }
    const byDex = new Map();
    const seen = new Set();
    const uniq = [];
    for (const p of pairs) {
      const k = p.pairAddress || p.url || (p.pair + "|" + p.dex);
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(p);
      const e = byDex.get(p.dex) || { name: p.dex, vol24: 0, liq: 0, pairs: 0 };
      e.vol24 += p.vol24; e.liq += p.liq; e.pairs++;
      byDex.set(p.dex, e);
    }
    dexAggCache = {
      pairs: uniq.sort((a, b) => b.vol24 - a.vol24),
      dexes: [...byDex.values()].sort((a, b) => b.vol24 - a.vol24),
    };
    dexAggAt = Date.now();
    return dexAggCache;
  }

  /* ——— Overview ——— */
  async function renderOverview() {
    const T = ND.TOKENS;
    if (!T.length) {
      $("#overviewStats").innerHTML = skelCards(8);
      $("#ovMovers").innerHTML = skel(6);
      $("#ovTrending").innerHTML = skel(5);
      $("#ovWatch").innerHTML = skel(3);
      return;
    }
    const ada = ND.getToken("ADA");
    const night = T.find((t) => t.cg === "midnight-3");
    const card = (t, extra) => t ? `
      <div class="stat-card"><div class="stat-label">${t.ticker} · ${extra[0]}</div>
      <div class="stat-value">${extra[1]}</div>
      <div class="stat-sub ${chClass(extra[3])}">${extra[2]}</div></div>` : "";
    const c24 = (t) => [ "price", fmt.usd(t.price, t.price < 1 ? 4 : 2), fmt.pct(t.ch24) + " 24h", t.ch24 ];
    $("#overviewStats").innerHTML =
      card(ada, c24(ada)) +
      (ada ? `<div class="stat-card"><div class="stat-label">ADA · mcap</div><div class="stat-value">${fmt.usd(ada.mcap)}</div><div class="stat-sub">${ada.rank ? "Rank #" + ada.rank : ""}</div></div>
      <div class="stat-card"><div class="stat-label">ADA · vol 24h</div><div class="stat-value">${fmt.usd(ada.vol)}</div><div class="stat-sub ${chClass(ada.ch7d)}">${fmt.pct(ada.ch7d)} 7d</div></div>
      <div class="stat-card"><div class="stat-label">Tracked assets</div><div class="stat-value">${T.length}</div><div class="stat-sub">CoinGecko universe</div></div>` : "") +
      card(night, c24(night)) +
      (night ? `<div class="stat-card"><div class="stat-label">NIGHT · mcap</div><div class="stat-value">${fmt.usd(night.mcap)}</div><div class="stat-sub">${night.rank ? "Rank #" + night.rank : ""}</div></div>
      <div class="stat-card"><div class="stat-label">NIGHT · vol 24h</div><div class="stat-value">${fmt.usd(night.vol)}</div><div class="stat-sub ${chClass(night.ch7d)}">${fmt.pct(night.ch7d)} 7d</div></div>
      <div class="stat-card"><div class="stat-label">NIGHT · ATH</div><div class="stat-value">${night.ath ? fmt.usd(night.ath, 4) : "—"}</div><div class="stat-sub"><a href="#midnight">Midnight desk →</a></div></div>` : "");
    paintFresh();
    drawOverviewChart("ADA", chartRanges.ADA);
    drawOverviewChart("NIGHT", chartRanges.NIGHT);

    const gainers = [...T].filter((t) => (t.ch24 || 0) > 0).sort((a, b) => b.ch24 - a.ch24).slice(0, 5);
    const losers = [...T].filter((t) => (t.ch24 || 0) < 0).sort((a, b) => a.ch24 - b.ch24).slice(0, 5);
    $("#ovMovers").innerHTML = [...gainers, ...losers].map((t) => `
      <div class="list-row" style="cursor:pointer" onclick="location.hash='#token/${t.ticker}'">
        <div class="token-cell">${icon(t, 1)}<strong>${t.ticker}</strong></div>
        <span class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</span>
      </div>`).join("");
    const trending = [...T].filter((t) => t.ticker !== "ADA").sort((a, b) => (b.vol || 0) - (a.vol || 0)).slice(0, 5);
    $("#ovTrending").innerHTML = trending.map((t, i) => `
      <div class="list-row" style="cursor:pointer" onclick="location.hash='#token/${t.ticker}'">
        <div class="token-cell"><span class="rank-badge${i < 3 ? " top" : ""}">#${i + 1}</span>${icon(t, 1)}<div class="token-meta"><strong>${t.ticker}</strong><span>${t.name}</span></div></div>
        <div style="text-align:right"><div>${fmt.usd(t.price, 6)}</div><div class="${chClass(t.ch24)}" style="font-size:12px">${fmt.pct(t.ch24)}</div></div>
      </div>`).join("");
    renderWatchPanel();
    renderPfMiniPanel();

    // liquidity snapshot
    $("#ovPools").querySelector("tbody").innerHTML = `<tr><td colspan="4">${skel(4)}</td></tr>`;
    getDexAgg().then((agg) => {
      if (currentRoute !== "overview") return;
      const rows = agg.pairs.slice(0, 5);
      const maxLiq = Math.max(...rows.map((p) => p.liq || 0), 1);
      $("#ovPools").querySelector("tbody").innerHTML = rows.map((p) => `
        <tr><td><strong>${p.pair}</strong></td><td>${dexCell(p.dex)}</td><td>${liqBar(p.liq, maxLiq)}</td><td>${fmt.usd(p.vol24)}</td></tr>`).join("")
        || `<tr><td colspan="4" class="muted">No pair data.</td></tr>`;
    });
  }

  async function drawOverviewChart(which, range) {
    const cg = which === "ADA" ? "cardano" : "midnight-3";
    const cv = which === "ADA" ? $("#ovAdaChart") : $("#ovNightChart");
    if (!cv) return;
    const days = range === "24H" ? 1 : range === "7D" ? 7 : 30;
    const series = await LIVE.chart(cg, days);
    if (currentRoute !== "overview" || !$(which === "ADA" ? "#ovAdaChart" : "#ovNightChart")) return;
    if (!series) { chartError(cv, `${which} chart unavailable`, () => { if (currentRoute === "overview") drawOverviewChart(which, range); }); return; }
    const opts = which === "NIGHT"
      ? { range, color: "#2ee6c5", fill: "rgba(46,230,197,0.10)" }
      : { range };
    NDCharts.drawLineChart(cv, series, opts);
  }

  function renderWatchPanel() {
    const el = $("#ovWatch");
    if (!el) return;
    const items = [...watch].map((id) => ND.getToken(id)).filter(Boolean).slice(0, 6);
    el.innerHTML = items.length ? items.map((t) => `
      <div class="list-row" style="cursor:pointer" onclick="location.hash='#token/${t.ticker}'">
        <div class="token-cell">${icon(t, 1)}<strong>${t.ticker}</strong>
          <button class="star-btn on" data-star="${t.ticker}" type="button" onclick="event.stopPropagation()">★</button></div>
        <span class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</span>
      </div>`).join("")
      : `<div class="empty" style="padding:20px"><strong>No favorites yet</strong>Star tokens from Markets.</div>`;
    el.querySelectorAll("[data-star]").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); toggleWatch(b.dataset.star); }));
  }

  function renderPfMiniPanel() {
    const el = $("#ovPortfolio");
    if (!el) return;
    const s = WALLET.state;
    if (s.connected && s.positions.length) {
      el.innerHTML = `
        <div class="pf-mini-worth">${fmt.usd(s.totalUsd)}<span class="muted"> net worth</span></div>
        ${s.positions.slice(0, 3).map((p) => `
          <div class="list-row"><div class="token-cell">${icon({ ticker: p.ticker, image: p.image }, 1)}<strong>${p.ticker}</strong></div>
          <span>${fmt.usd(p.value)}</span></div>`).join("")}
        <a class="btn btn-sm btn-ghost" href="#portfolio" style="margin-top:8px">Open portfolio</a>`;
    } else {
      el.innerHTML = `<p class="muted" style="font-size:13px;margin:0 0 10px">Connect a Cardano wallet to see your live net worth here.</p>
        <a class="btn btn-sm" href="#portfolio">Connect wallet</a>`;
    }
  }

  /* ——— Markets ——— */
  function marketCats() {
    return [...new Set(ND.TOKENS.map((t) => t.category))].sort();
  }
  function filteredMarketTokens() {
    const q = ($("#marketSearch")?.value || "").toLowerCase().trim();
    const cat = $("#marketCat")?.value || "";
    const tab = $("#marketTabs .tab.active")?.dataset.mtab || "all";
    const onlyWatch = $("#watchOnly")?.checked;
    let list = ND.TOKENS.filter((t) => t.ticker !== "ADA");
    if (tab !== "all") list = list.filter((t) => t.category === tab);
    if (cat) list = list.filter((t) => t.category === cat);
    if (onlyWatch) list = list.filter((t) => watch.has(t.ticker));
    if (q) list = list.filter((t) =>
      t.ticker.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) ||
      (t.policy && t.policy.includes(q)) || (t.unit && t.unit.includes(q)));
    const { key, dir } = marketSort;
    list.sort((a, b) => {
      const av = a[key], bv = b[key];
      if (typeof av === "string") return dir * String(av).localeCompare(String(bv));
      return dir * ((av || 0) - (bv || 0));
    });
    return list;
  }
  function renderMarkets() {
    if (!ND.TOKENS.length) {
      $("#marketsTable").querySelector("tbody").innerHTML = `<tr><td colspan="9">${skel(8)}</td></tr>`;
      return;
    }
    const sel = $("#marketCat");
    if (sel && !sel.dataset.built) {
      sel.dataset.built = "1";
      sel.innerHTML = `<option value="">All categories</option>` +
        marketCats().map((c) => `<option>${c}</option>`).join("");
    }
    renderMarketTokens();
    paintFresh();
  }
  function renderMarketTokens() {
    const tb = $("#marketsTable").querySelector("tbody");
    if (!tb) return;
    const list = filteredMarketTokens();
    const mc = $("#marketCount");
    if (mc) mc.textContent = `${list.length} assets`;
    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="9"><div class="empty" style="padding:40px 20px"><strong>No tokens match your search or filters</strong><span class="muted">Try a different search term or category.</span></div></td></tr>`;
      return;
    }
    tb.innerHTML = list.map((t, i) => `
      <tr>
        <td><button class="star-btn ${watch.has(t.ticker) ? "on" : ""}" data-star="${t.ticker}" type="button">★</button></td>
        <td class="rank-cell">${i + 1}</td>
        <td><div class="token-cell" data-goto="token/${t.ticker}">${icon(t, 1)}<div class="token-meta"><strong>${t.ticker}</strong><span>${t.name}</span></div></div></td>
        <td>${fmt.usd(t.price, t.price < 0.01 ? 6 : 4)}</td>
        <td class="${chClass(t.ch1h)}">${fmt.pct(t.ch1h)}</td>
        <td class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</td>
        <td class="${chClass(t.ch7d)}">${fmt.pct(t.ch7d)}</td>
        <td>${t.vol ? `<span title="${fmt.exactUsd(t.vol)}">${fmt.usd(t.vol)}</span>` : "—"}</td>
        <td>${t.mcap ? `<span title="${fmt.exactUsd(t.mcap)}">${fmt.usd(t.mcap)}</span>` : "—"}</td>
      </tr>`).join("");
    tb.querySelectorAll("[data-star]").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); toggleWatch(b.dataset.star); }));
    tb.querySelectorAll("tr").forEach((tr) => {
      tr.style.cursor = "pointer";
      tr.addEventListener("click", (e) => {
        if (e.target.closest("[data-star]")) return;
        const cell = tr.querySelector("[data-goto]");
        if (cell) location.hash = "#" + cell.dataset.goto;
      });
    });
  }

  /* ——— Token detail ——— */
  async function renderToken(id) {
    const t = ND.getToken(id) || ND.TOKENS.find((x) => x.cg === String(id || "").toLowerCase());
    const host = $("#tokenPage");
    if (!t) {
      host.innerHTML = `<div class="empty" style="padding:60px 20px"><strong>Token not found</strong><a href="#markets">Back to markets</a></div>`;
      return;
    }
    currentToken = t;
    host.innerHTML = `
      <div class="token-banner">
        <div class="big-avatar">${icon(t)}</div>
        <div style="flex:1;min-width:200px">
          <h1>${t.name} <button class="star-btn ${watch.has(t.ticker) ? "on" : ""}" data-star="${t.ticker}" type="button" style="font-size:18px">★</button></h1>
          <div class="price-row"><span class="price">${fmt.usd(t.price, t.price < 0.01 ? 6 : 4)}</span>
            <span class="${chClass(t.ch24)}">${fmt.pct(t.ch24)} 24h</span>
            <span class="${chClass(t.ch7d)}">${fmt.pct(t.ch7d)} 7d</span></div>
          <div class="links-row" id="tokenLinks"></div>
        </div>
        <div><select id="tokenPicker" class="token-picker" aria-label="Choose token"></select><div style="margin-top:8px"><span class="tag">${t.category}</span> ${t.rank ? `<span class="muted" style="font-size:12px">Rank #${t.rank}</span>` : ""}</div></div>
      </div>
      <div class="token-stats-row" id="tokenStatRow"></div>
      <div class="panel-grid">
        <section class="panel">
          <div class="panel-head"><h2>Price chart</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <div class="seg" id="chartType">
                <button class="seg-btn ${chartType === "line" ? "active" : ""}" data-ctype="line">Line</button>
                <button class="seg-btn ${chartType === "candle" ? "active" : ""}" data-ctype="candle">Candles</button>
              </div>
              <div class="seg" id="tokenRange">
                ${["24H", "7D", "30D", "1Y"].map((r) => `<button class="seg-btn ${chartRanges.TOKEN === r ? "active" : ""}" data-range="${r}">${r}</button>`).join("")}
              </div>
            </div>
          </div>
          <div class="chart-wrap"><canvas id="tokenChart" class="chart-lg"></canvas></div>
          <div id="hoverReadout" class="hover-readout"></div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Buys vs sells · 24h</h2><span class="muted" style="font-size:11px">DexScreener</span></div>
          <div id="buysSells">${skel(3)}</div>
          <div class="panel-head" style="margin-top:16px"><h2>Market stats</h2></div>
          <div id="tokenStats">${skel(6)}</div>
        </section>
      </div>
      <div class="panel" style="margin-bottom:12px">
        <div class="panel-head"><h2>DEX markets</h2><span class="muted" style="font-size:11px">DexScreener · Cardano pairs</span></div>
        <div class="table-wrap"><table class="data-table" id="tokenPairsTable">
          <thead><tr><th>DEX</th><th>Pair</th><th>Price</th><th>24h</th><th>Vol 24h</th><th>Liquidity</th><th>Buys/Sells</th><th></th></tr></thead>
          <tbody><tr><td colspan="8">${skel(4)}</td></tr></tbody></table></div>
      </div>
      <div class="panel-grid equal">
        <section class="panel"><div class="panel-head"><h2>On-chain</h2><span class="muted" style="font-size:11px">Koios</span></div><div id="tokenOnchain">${skel(5)}</div></section>
        <section class="panel"><div class="panel-head"><h2>About</h2></div><div id="tokenAbout">${skel(4)}</div></section>
      </div>`;
    host.querySelector("[data-star]").addEventListener("click", (e) => toggleWatch(e.target.dataset.star));
    const picker = host.querySelector("#tokenPicker");
    if (picker) {
      const seen = new Map();
      ND.TOKENS.forEach((x) => { if (!seen.has(x.ticker)) seen.set(x.ticker, x); });
      picker.innerHTML = [...seen.values()].sort((a, b) => a.ticker.localeCompare(b.ticker))
        .map((x) => `<option value="${x.ticker}"${x.ticker === t.ticker ? " selected" : ""}>${x.ticker} — ${x.name}</option>`).join("");
      picker.addEventListener("change", (e) => { location.hash = "#token/" + e.target.value; });
    }

    const statRow = (rows) => {
      $("#tokenStatRow").innerHTML = rows.map(([k, v]) =>
        `<div class="token-stat"><div class="lbl">${k}</div><div class="val">${v}</div></div>`).join("");
    };
    statRow([
      ["Mcap", t.mcap ? fmt.usd(t.mcap) : "—"], ["FDV", t.fdv ? fmt.usd(t.fdv) : "—"],
      ["Vol 24h", fmt.usd(t.vol)], ["ATH", t.ath ? fmt.usd(t.ath, 4) : "—"],
      ["ATL", t.atl ? fmt.usd(t.atl, 6) : "—"], ["Category", t.category],
    ]);
    paintTokenChart(t);

    // detail → links, about, supplies
    LIVE.detail(t.cg).then((d) => {
      if (currentToken !== t || !$("#tokenPage")) return;
      if (!d) { $("#tokenAbout").innerHTML = `<p class="muted">Description unavailable.</p>`; return; }
      const L = d.links || {};
      const items = [];
      const hp = (L.homepage || []).filter(Boolean)[0];
      if (hp) items.push(`<a class="link-out" href="${hp}" target="_blank" rel="noopener">Website ↗</a>`);
      const ex = (L.blockchain_site || []).filter(Boolean)[0];
      if (ex) items.push(`<a class="link-out" href="${ex}" target="_blank" rel="noopener">Explorer ↗</a>`);
      if (L.twitter_screen_name) items.push(`<a class="link-out" href="https://x.com/${L.twitter_screen_name}" target="_blank" rel="noopener">X ↗</a>`);
      if (L.telegram_channel_identifier && !/\s/.test(L.telegram_channel_identifier)) items.push(`<a class="link-out" href="https://t.me/${L.telegram_channel_identifier}" target="_blank" rel="noopener">Telegram ↗</a>`);
      const tl = $("#tokenLinks");
      if (tl) tl.innerHTML = items.join("");
      const desc = (d.description && d.description.en || "").replace(/<[^>]*>/g, "").split(". ").slice(0, 3).join(". ");
      const ta = $("#tokenAbout");
      if (ta) ta.innerHTML = desc
        ? `<p style="font-size:13px;line-height:1.6">${desc}${desc.endsWith(".") ? "" : "."}</p><p class="muted" style="font-size:11px">Source: CoinGecko</p>`
        : `<p class="muted">No description available.</p>`;
      const md = d.market_data || {};
      statRow([
        ["Mcap", t.mcap ? fmt.usd(t.mcap) : "—"], ["FDV", t.fdv ? fmt.usd(t.fdv) : "—"],
        ["Vol 24h", fmt.usd(t.vol)], ["ATH", t.ath ? fmt.usd(t.ath, 4) : "—"],
        ["Circulating", md.circulating_supply ? fmt.num(md.circulating_supply) : "—"],
        ["Total supply", md.total_supply ? fmt.num(md.total_supply) : "—"],
        ["Max supply", md.max_supply ? fmt.num(md.max_supply) : "—"],
        ["Category", t.category],
      ]);
      const ts = $("#tokenStats");
      if (ts) ts.innerHTML = [
        ["Market cap", t.mcap ? fmt.usd(t.mcap) : "—"], ["FDV", t.fdv ? fmt.usd(t.fdv) : "—"],
        ["Volume 24h", t.vol ? fmt.usd(t.vol) : "—"], ["ATH", t.ath ? fmt.usd(t.ath, 4) : "—"],
        ["ATL", t.atl ? fmt.usd(t.atl, 6) : "—"],
        ["Circulating", md.circulating_supply ? fmt.num(md.circulating_supply) : "—"],
        ["Total supply", md.total_supply ? fmt.num(md.total_supply) : "—"],
        ["Max supply", md.max_supply ? fmt.num(md.max_supply) : "—"],
      ].map(([k, v]) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`).join("");
    });

    // on-chain
    (async () => {
      const oc = $("#tokenOnchain");
      if (!t.policy) {
        if (oc) oc.innerHTML = `
          <div class="kv"><span>Type</span><span>Native asset (ADA)</span></div>
          <div class="kv"><span>Explorer</span><a href="https://cardanoscan.io" target="_blank" rel="noopener">Cardanoscan ↗</a></div>`;
        return;
      }
      const info = await LIVE.koiosAsset(t.policy, t.asset);
      if (currentToken !== t || !$("#tokenOnchain")) return;
      const meta = (info && info.token_registry_metadata) || {};
      const dec = info && info.decimals != null ? Number(info.decimals)
        : meta.decimals != null ? Number(meta.decimals) : 0;
      $("#tokenOnchain").innerHTML = `
        <div class="kv"><span>Policy ID</span><button class="asset-id" data-copy="${t.policy}" title="${t.policy}">${fmt.hexShort(t.policy, 16)}</button></div>
        <div class="kv"><span>Fingerprint</span><code style="font-size:11px">${info ? info.fingerprint : "—"}</code></div>
        <div class="kv"><span>Decimals</span><span>${meta.decimals != null ? meta.decimals : "—"}</span></div>
        <div class="kv"><span>Total supply</span><span>${info ? fmt.num(Number(info.total_supply) / Math.pow(10, dec)) : "—"}</span></div>
        <div class="kv"><span>Explorer</span><a href="https://cardanoscan.io/token/${t.unit}" target="_blank" rel="noopener">Cardanoscan ↗</a></div>`;
      const cp = $("#tokenOnchain [data-copy]");
      if (cp) cp.addEventListener("click", () => {
        navigator.clipboard?.writeText(cp.dataset.copy).then(() => toast("Policy ID copied"));
      });
    })();

    // buys/sells + pairs
    LIVE.dexPairs(t.unit).then((dex) => {
      if (currentToken !== t || !$("#tokenPage")) return;
      const bs = $("#buysSells"), pt = $("#tokenPairsTable")?.querySelector("tbody");
      if (!dex) {
        // ADA is the native asset: DexScreener has no per-token endpoint for it,
        // so surface the top ADA-quoted pairs from the shared DEX aggregation.
        if (t.ticker === "ADA") { renderAdaPairs(bs, pt, t); return; }
        if (bs) bs.innerHTML = `<p class="muted">No DEX pair data found.</p>`;
        if (pt) pt.innerHTML = `<tr><td colspan="8" class="muted">No DEX pairs found for this token.</td></tr>`;
        return;
      }
      const tot = dex.buys + dex.sells;
      const bp = tot ? (dex.buys / tot) * 100 : 50;
      if (bs) bs.innerHTML = `
        <div class="bs-bar"><span class="bs-buy" style="width:${bp}%"></span><span class="bs-sell" style="width:${100 - bp}%"></span></div>
        <div class="bs-legend">
          <span><i class="dot-swatch" style="background:#2ee6c5"></i>${fmt.num(dex.buys)} buys · ${fmt.usd(dex.buyVol)}</span>
          <span><i class="dot-swatch" style="background:#ff6b7a"></i>${fmt.num(dex.sells)} sells · ${fmt.usd(dex.sellVol)}</span>
        </div>
        <div class="muted" style="font-size:11px;margin-top:6px">24h DEX activity · DexScreener</div>`;
      if (pt) pt.innerHTML = dex.pairs.slice(0, 12).map((p) => `
        <tr><td><strong>${p.dex}</strong></td><td>${p.pair}</td>
        <td>${p.priceUsd ? fmt.usd(p.priceUsd, 6) : "—"}</td>
        <td class="${chClass(p.ch24)}">${fmt.pct(p.ch24)}</td>
        <td>${fmt.usd(p.vol24)}</td><td>${fmt.usd(p.liq)}</td>
        <td><span class="up">${p.buys24}</span> / <span class="down">${p.sells24}</span></td>
        <td><a href="${p.url}" target="_blank" rel="noopener">Trade ↗</a></td></tr>`).join("");
    });
  }

  async function renderAdaPairs(bs, pt, t) {
    const agg = await getDexAgg().catch(() => null);
    if (currentToken !== t || !$("#tokenPage")) return;
    const adaPairs = ((agg && agg.pairs) || [])
      .filter((p) => /(^|\/)ADA(\/|$)/.test(p.pair || ""))
      .sort((a, b) => (b.liq || 0) - (a.liq || 0))
      .slice(0, 8);
    if (!adaPairs.length) {
      if (bs) bs.innerHTML = `<p class="muted">No DEX pair data found.</p>`;
      if (pt) pt.innerHTML = `<tr><td colspan="8" class="muted">No DEX pairs found for this token.</td></tr>`;
      return;
    }
    let buys = 0, sells = 0, vol = 0;
    adaPairs.forEach((p) => { buys += p.buys24 || 0; sells += p.sells24 || 0; vol += p.vol24 || 0; });
    const tot = buys + sells;
    const bp = tot ? (buys / tot) * 100 : 50;
    if (bs) bs.innerHTML = `
      <div class="bs-bar"><span class="bs-buy" style="width:${bp}%"></span><span class="bs-sell" style="width:${100 - bp}%"></span></div>
      <div class="bs-legend">
        <span><i class="dot-swatch" style="background:#2ee6c5"></i>${fmt.num(buys)} buys</span>
        <span><i class="dot-swatch" style="background:#ff6b7a"></i>${fmt.num(sells)} sells</span>
        <span class="muted">${fmt.usd(vol)} 24h vol</span>
      </div>
      <div class="muted" style="font-size:11px;margin-top:6px">Top ADA pairs across tracked tokens · DexScreener</div>`;
    if (pt) pt.innerHTML = adaPairs.map((p) => `
      <tr><td><strong>${p.dex}</strong></td><td>${p.pair}</td>
      <td>${p.priceUsd ? fmt.usd(p.priceUsd, 6) : "—"}</td>
      <td class="${chClass(p.ch24)}">${fmt.pct(p.ch24)}</td>
      <td>${fmt.usd(p.vol24)}</td><td>${fmt.usd(p.liq)}</td>
      <td><span class="up">${p.buys24}</span> / <span class="down">${p.sells24}</span></td>
      <td><a href="${p.url}" target="_blank" rel="noopener">Trade ↗</a></td></tr>`).join("");
  }

  async function paintTokenChart(t) {
    const cv = $("#tokenChart");
    if (!cv) return;
    clearChartError(cv);
    const range = chartRanges.TOKEN;
    if (chartType === "candle") {
      const candles = await LIVE.ohlc(t.cg, range);
      if (currentToken !== t || !$("#tokenChart")) return;
      if (candles && candles.length > 1) {
        NDCharts.drawCandles($("#tokenChart"), candles, {
          onHover: (c) => {
            const el = $("#hoverReadout");
            if (el) el.textContent = c ? `O ${fmt.usd(c.o, 6)} · H ${fmt.usd(c.h, 6)} · L ${fmt.usd(c.l, 6)} · C ${fmt.usd(c.c, 6)}` : "";
          },
        });
        return;
      }
      toast("Candles unavailable for this range — line chart shown");
    }
    const series = await LIVE.chart(t.cg, range);
    if (currentToken !== t || !$("#tokenChart")) return;
    if (!series) { chartError($("#tokenChart"), "Price chart unavailable", () => { if (currentToken === t) paintTokenChart(t); }); return; }
    NDCharts.drawLineChart($("#tokenChart"), series, {
      range,
      onHover: (p) => {
        const el = $("#hoverReadout");
        if (el) el.textContent = p ? `${fmt.usd(p.v, 6)} · ${new Date(p.t).toLocaleString()}` : "";
      },
    });
  }

  /* ——— Portfolio / wallet UI ——— */
  const WALLET_UI = {
    render() {
      const s = WALLET.state;
      const provs = WALLET.providers();
      if (!s.connected && !s.watchOnly.length && !s.loading) return this.renderConnect(provs);
      if (s.loading) {
        $("#pfConnect").innerHTML = "";
        $("#pfDash").style.display = "block";
        $("#pfStats").innerHTML = skelCards(4);
        return;
      }
      if (s.error) {
        $("#pfDash").style.display = "none";
        $("#pfConnect").innerHTML = `<div class="panel"><div class="empty"><strong>${s.error}</strong><br><br><button class="btn" id="pfRetry" type="button">Retry</button></div></div>`;
        $("#pfRetry")?.addEventListener("click", () => { WALLET.refresh().then(() => this.render()); });
        return;
      }
      this.renderDash();
    },
    renderConnect(provs) {
      $("#pfDash").style.display = "none";
      const cards = provs.length ? provs.map((p) => `
        <button class="wallet-card" data-wallet="${p.key}" type="button">
          ${p.icon ? `<img src="${p.icon}" alt="">` : `<span class="token-avatar">${p.name.charAt(0)}</span>`}
          <strong>${p.name}</strong><span class="muted">Connect</span>
        </button>`).join("")
        : `<div class="empty"><strong>No Cardano wallet extension detected</strong><span class="muted">Install one to continue:</span>
          <div class="install-row">${Object.entries(WALLET.INSTALL).map(([k, u]) =>
            `<a href="${u}" target="_blank" rel="noopener">${k}</a>`).join("")}</div></div>`;
      $("#pfConnect").innerHTML = `
        <div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Connect a wallet</h2></div>
          <p class="muted" style="font-size:13px">NightDream reads your public addresses through Koios. Nothing is signed, nothing leaves your wallet.</p>
          <div class="wallet-grid">${cards}</div></div>
        <div class="panel"><div class="panel-head"><h2>Or track an address</h2></div>
          <p class="muted" style="font-size:13px">Paste any Cardano address (addr1… or stake1…) to watch it without connecting.</p>
          <div class="row-flex"><input id="watchAddr" class="input" placeholder="addr1… / stake1…"><button class="btn btn-primary" id="watchAddBtn" type="button">Track</button></div>
        </div>`;
      $$("#pfConnect [data-wallet]").forEach((b) =>
        b.addEventListener("click", async () => {
          b.disabled = true;
          try { await WALLET.connect(b.dataset.wallet); toast("Wallet connected"); }
          catch (e) { toast(e.message || "Connection failed"); }
          this.render();
        }));
      $("#watchAddBtn")?.addEventListener("click", async () => {
        try { await WALLET.addWatchOnly($("#watchAddr").value); toast("Address tracked"); this.render(); }
        catch (e) { toast(e.message); }
      });
    },
    renderDash() {
      const s = WALLET.state;
      $("#pfConnect").innerHTML = "";
      $("#pfDash").style.display = "block";
      const best = [...s.positions].sort((a, b) => (b.ch24 || -999) - (a.ch24 || -999))[0];
      const worst = [...s.positions].sort((a, b) => (a.ch24 || 999) - (b.ch24 || 999))[0];
      const stat = (label, value, sub, ch) => `
        <div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>
        <div class="stat-sub ${chClass(ch)}">${sub}</div></div>`;
      $("#pfStats").innerHTML =
        stat("Net worth", fmt.usd(s.totalUsd), s.updatedAt ? "updated " + fmt.timeAgo(s.updatedAt) : "", 0) +
        stat("Positions", String(s.positions.length), s.nfts.length + " NFTs", 0) +
        stat("Best 24h", best ? best.ticker : "—", best ? fmt.pct(best.ch24) : "", best ? best.ch24 : 0) +
        stat("Worst 24h", worst ? worst.ticker : "—", worst ? fmt.pct(worst.ch24) : "", worst ? worst.ch24 : 0);

      requestAnimationFrame(() => {
        const cv = $("#pfAllocChart");
        if (!cv) return;
        NDCharts.drawDonut(cv, s.positions.slice(0, 8).map((p) => ({
          label: p.ticker, pct: s.totalUsd ? (p.value / s.totalUsd) * 100 : 0,
        })));
      });
      const colors = ["#8b7cff", "#2ee6c5", "#ffb020", "#ff6b7a", "#5b8cff", "#c084fc", "#34d399", "#94a3b8"];
      $("#pfAllocLegend").innerHTML = s.positions.slice(0, 8).map((p, i) => `
        <span><span><i class="dot-swatch" style="background:${colors[i % colors.length]}"></i>${p.ticker}</span>
        <span>${s.totalUsd ? ((p.value / s.totalUsd) * 100).toFixed(1) : 0}% · ${fmt.usd(p.value)}</span></span>`).join("");

      $("#pf-tokens").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr>
        <th>Token</th><th>Amount</th><th>Price</th><th>Value</th><th>24h</th></tr></thead><tbody>
        ${s.positions.map((p) => `
          <tr><td><div class="token-cell">${icon({ ticker: p.ticker, image: p.image }, 1)}<div class="token-meta"><strong>${p.ticker}</strong><span>${p.name}</span></div></div></td>
          <td>${p.qty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
          <td>${p.price ? fmt.usd(p.price, 6) : "—"}</td><td>${fmt.usd(p.value)}</td>
          <td class="${chClass(p.ch24)}">${fmt.pct(p.ch24)}</td></tr>`).join("")
          || `<tr><td colspan="5" class="muted">No token positions found.</td></tr>`}
        </tbody></table></div>`;

      $("#pf-nfts").innerHTML = s.nfts.length
        ? `<div class="nft-grid">${s.nfts.slice(0, 24).map((n) => `
          <div class="nft-card"><div class="nft-art">${(n.name || "?").charAt(0).toUpperCase()}</div>
          <div class="nft-name">${n.name}</div><div class="muted" style="font-size:11px">${fmt.hexShort(n.unit, 10)}</div></div>`).join("")}</div>`
        : `<div class="empty"><strong>No NFTs detected</strong><span class="muted">Single-unit unknown assets show up here.</span></div>`;

      const wallets = [];
      if (s.connected) wallets.push({ label: s.providerName + " · connected", addr: s.address, on: true });
      s.watchOnly.forEach((w) => wallets.push({ label: "Tracked address", addr: w, on: false }));
      $("#pf-wallets").innerHTML = wallets.map((w) => `
        <div class="list-row"><div><strong>${w.label}</strong><div class="muted" style="font-size:12px">${w.addr}</div></div>
        <span class="tag ${w.on ? "" : "markets"}">${w.on ? "connected" : "tracked"}</span></div>`).join("") + `
        <div class="row-flex" style="margin-top:12px"><input id="watchAddr2" class="input" placeholder="Track another addr1… / stake1…">
        <button class="btn btn-sm" id="watchAddBtn2" type="button">Track</button>
        ${s.connected ? `<button class="btn btn-sm btn-ghost" id="pfDisconnect" type="button">Disconnect</button>` : ""}</div>`;
      $("#watchAddBtn2")?.addEventListener("click", async () => {
        try { await WALLET.addWatchOnly($("#watchAddr2").value); toast("Address tracked"); this.render(); }
        catch (e) { toast(e.message); }
      });
      $("#pfDisconnect")?.addEventListener("click", () => { WALLET.disconnect(); this.render(); renderPfMiniPanel(); });

      $("#pf-activity").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Transaction</th><th>Time</th><th>Fee</th></tr></thead>
        <tbody id="pfActivityBody"><tr><td colspan="3">${skel(3)}</td></tr></tbody></table></div>`;
      WALLET.tradeHistory(15).then((txs) => {
        const tb = $("#pfActivityBody");
        if (!tb) return;
        if (!txs) { tb.innerHTML = `<tr><td colspan="3" class="muted">Activity unavailable.</td></tr>`; return; }
        tb.innerHTML = txs.map((x) => `
          <tr><td><a href="https://cardanoscan.io/transaction/${x.tx_hash}" target="_blank" rel="noopener"><code>${x.tx_hash.slice(0, 12)}…</code> ↗</a></td>
          <td>${x.block_time ? new Date(x.block_time * 1000).toLocaleString() : "—"}</td>
          <td class="muted">${x.fee ? fmt.ada(Number(x.fee) / 1e6) : ""}</td></tr>`).join("")
          || `<tr><td colspan="3" class="muted">No recent transactions.</td></tr>`;
      });
    },
  };
  window.WALLET_UI = WALLET_UI;

  /* ——— DEX ——— */
  async function renderDex() {
    $("#dexList").innerHTML = skel(6);
    $("#dexPulse").innerHTML = skelCards(4);
    $("#poolsTable").querySelector("tbody").innerHTML = `<tr><td colspan="7">${skel(6)}</td></tr>`;
    const dn = $("#dexNote");
    if (dn) dn.textContent = "Aggregating top pairs from DexScreener…";
    const agg = await getDexAgg();
    if (currentRoute !== "dex") return;
    const totVolRaw = agg.dexes.reduce((s, d) => s + d.vol24, 0);
    const totVol = totVolRaw || 1;
    const totLiq = agg.pairs.reduce((s, p) => s + (p.liq || 0), 0);
    const totPairs = agg.dexes.reduce((s, d) => s + (d.pairs || 0), 0);
    const top = agg.dexes[0];
    const pstat = (label, value, sub) => `
      <div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>
      <div class="stat-sub">${sub}</div></div>`;
    $("#dexPulse").innerHTML =
      pstat("Tracked DEX volume 24h", totVolRaw ? fmt.usd(totVolRaw) : "—", "live · DexScreener") +
      pstat("Liquidity tracked", totLiq ? fmt.usd(totLiq) : "—", agg.pairs.length + " top pairs") +
      pstat("Pairs tracked", totPairs ? fmt.num(totPairs) : "—", agg.dexes.length + " venues") +
      pstat("Top venue", top ? top.name : "—", top && totVolRaw ? ((top.vol24 / totVol) * 100).toFixed(1) + "% of volume" : "—");
    requestAnimationFrame(() => {
      const b = $("#dexVolChart"), d = $("#dexShareChart");
      if (!b || !d) return;
      NDCharts.drawBars(b, agg.dexes.slice(0, 8).map((x) => ({ label: x.name, pct: (x.vol24 / totVol) * 100 })));
      NDCharts.drawDonut(d, agg.dexes.map((x) => ({ label: x.name, pct: (x.vol24 / totVol) * 100 })));
    });
    const colors = ["#8b7cff", "#2ee6c5", "#ffb020", "#ff6b7a", "#5b8cff", "#c084fc", "#34d399", "#94a3b8"];
    $("#dexShareLegend").innerHTML = agg.dexes.map((d, i) => `
      <span><span><i class="dot-swatch" style="background:${colors[i % colors.length]}"></i>${d.name}</span>
      <span>${((d.vol24 / totVol) * 100).toFixed(1)}%</span></span>`).join("");
    $("#dexList").innerHTML = agg.dexes.map((d) => `
      <div class="list-row">${dexCell(d.name)}<span>${fmt.usd(d.vol24)} · ${d.pairs} pairs</span></div>`).join("")
      || `<div class="empty">No DEX data available.</div>`;
    const vis = agg.pairs.slice(0, 20);
    const maxLiq = Math.max(...vis.map((p) => p.liq || 0), 1);
    $("#poolsTable").querySelector("tbody").innerHTML = vis.map((p) => `
      <tr><td><strong>${p.pair}</strong></td><td>${dexCell(p.dex)}</td><td>${liqBar(p.liq, maxLiq)}</td>
      <td>${fmt.usd(p.vol24)}</td><td class="${chClass(p.ch24)}">${fmt.pct(p.ch24)}</td>
      <td><span class="up">${p.buys24}</span> / <span class="down">${p.sells24}</span></td>
      <td><a href="${p.url}" target="_blank" rel="noopener">View ↗</a></td></tr>`).join("");
    if (dn) dn.textContent = `24h volume aggregated from top pairs of 12 tracked tokens · DexScreener · updated ${fmt.timeAgo(dexAggAt)}`;
  }

  /* ——— Midnight ——— */
  async function renderMidnight() {
    const night = ND.TOKENS.find((t) => t.cg === "midnight-3");
    if (!night) { $("#nightStats").innerHTML = skelCards(4); return; }
    const stat = (label, value, sub, ch) => `
      <div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div>
      <div class="stat-sub ${chClass(ch)}">${sub}</div></div>`;
    $("#nightStats").innerHTML =
      stat("NIGHT price", fmt.usd(night.price, 4), fmt.pct(night.ch24) + " 24h", night.ch24) +
      stat("Mcap", fmt.usd(night.mcap), night.rank ? "Rank #" + night.rank : "", 0) +
      stat("FDV", fmt.usd(night.fdv), fmt.pct(night.ch7d) + " 7d", night.ch7d) +
      stat("Vol 24h", fmt.usd(night.vol), "CoinGecko", 0);
    $("#dustNote").textContent = ND.MIDNIGHT.generationNote;
    $("#bridgeNote").textContent = ND.MIDNIGHT.bridgeNote;
    updateDustCalc();
    drawNightChart(chartRanges.NIGHT);
    paintMidnightNetwork();
  }
  async function paintMidnightNetwork() {
    const host = $("#mnNetStats");
    const src = $("#mnNetSource");
    if (!host) return;
    host.innerHTML = skelCards(6);
    const o = await LIVE.nightforgeOverview();
    if (!o) {
      host.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:18px">
        <strong>NightForge unreachable</strong>
        <span class="muted">Network stats will retry on the next refresh. NIGHT price above still comes from CoinGecko.</span>
      </div>`;
      if (src) src.textContent = "NightForge · offline";
      return;
    }
    const fmtN = (n) => (n == null ? "—" : fmt.num(n));
    const items = [
      ["Blocks", fmtN(o.blocks)],
      ["TPS", o.tps != null ? Number(o.tps).toFixed(3) : "—"],
      ["Shielded", o.shieldedRatio != null ? (o.shieldedRatio * 100).toFixed(1) + "%" : "—"],
      ["Avg block", o.avgBlockTime != null ? o.avgBlockTime + "s" : "—"],
      ["Bridge ops", fmtN(o.bridgeOps)],
      ["Committee", o.committeeSize != null ? String(o.committeeSize) : "—"],
    ];
    host.innerHTML = items.map(([label, value]) => `
      <div class="stat-card"><div class="stat-label">${label} · live</div>
      <div class="stat-value">${value}</div></div>`).join("");
    if (src) src.textContent = "NightForge · live";
  }
  async function drawNightChart(range) {
    const days = range === "24H" ? 1 : range === "7D" ? 7 : 30;
    const series = await LIVE.chart("midnight-3", days);
    if (!series || currentRoute !== "midnight" || !$("#nightDeepChart")) return;
    NDCharts.drawLineChart($("#nightDeepChart"), series, { range, color: "#2ee6c5", fill: "rgba(46,230,197,0.10)" });
  }
  function updateDustCalc() {
    const holdings = Number($("#nightHoldings")?.value || 0);
    // round to 4dp: keeps float artifacts (e.g. 0.014600000344216824) out of the math
    const factor = Number(Number($("#genFactor")?.value || 0.0146).toFixed(4));
    const el = $("#dustResult");
    if (!el) return;
    const cap = holdings * ND.MIDNIGHT.dustPerNightMax;
    const rate = holdings * factor;
    el.innerHTML = `<strong>Capacity:</strong> ~${fmt.num(cap)} DUST max (5 × NIGHT)<br/>
      <strong>Est. generation:</strong> ~${rate.toFixed(2)} DUST / day<br/>
      <span class="muted">Model estimate — real rates follow Midnight network parameters.</span>`;
  }

  /* ——— Watchlist ——— */
  function renderWatchlist() {
    const ids = [...watch].map((id) => ND.getToken(id)).filter(Boolean);
    const tb = $("#watchTable").querySelector("tbody");
    const empty = $("#watchEmpty");
    if (!ids.length) { tb.innerHTML = ""; empty.style.display = "block"; return; }
    empty.style.display = "none";
    tb.innerHTML = ids.map((t) => `
      <tr><td><button class="star-btn on" data-star="${t.ticker}" type="button">★</button></td>
      <td><div class="token-cell" style="cursor:pointer" onclick="location.hash='#token/${t.ticker}'">${icon(t, 1)}<div class="token-meta"><strong>${t.ticker}</strong><span>${t.name}</span></div></div></td>
      <td>${fmt.usd(t.price, 6)}</td><td class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</td>
      <td>${fmt.usd(t.vol)}</td><td>${fmt.usd(t.mcap)}</td>
      <td><a class="btn btn-sm" href="#token/${t.ticker}">Open</a></td></tr>`).join("");
    tb.querySelectorAll("[data-star]").forEach((b) => b.addEventListener("click", () => toggleWatch(b.dataset.star)));
  }

  /* ——— ⌘K ——— */
  function openCmdk() {
    $("#cmdk").classList.add("open");
    const input = $("#cmdkInput");
    input.value = "";
    paintCmdk("");
    setTimeout(() => input.focus(), 10);
  }
  function closeCmdk() { $("#cmdk").classList.remove("open"); }
  function paintCmdk(q) {
    q = (q || "").toLowerCase().trim();
    const pages = [
      { label: "Overview", hint: "Desk", hash: "#overview" },
      { label: "Markets", hint: "Tokens", hash: "#markets" },
      { label: "Portfolio", hint: "Wallets", hash: "#portfolio" },
      { label: "DEX / Liquidity", hint: "Pools", hash: "#dex" },
      { label: "Midnight", hint: "NIGHT · DUST", hash: "#midnight" },
      { label: "Watchlist", hint: "Saved", hash: "#watchlist" },
    ].map((p) => ({ ...p, hay: p.label.toLowerCase() }));
    const tokens = ND.TOKENS.map((t) => ({
      label: `${t.ticker} · ${t.name}`, hint: fmt.usd(t.price, 4), hash: `#token/${t.ticker}`,
      hay: `${t.ticker} ${t.name} ${t.policy} ${t.unit}`.toLowerCase(),
    }));
    let items = [...pages, ...tokens];
    if (q) items = items.filter((i) => i.hay.includes(q));
    items = items.slice(0, 20);
    const list = $("#cmdkList");
    list.innerHTML = items.length ? items.map((i, idx) => `
      <div class="cmdk-item ${idx === 0 ? "active" : ""}" data-hash="${i.hash}">
        <span>${i.label}</span><span class="hint">${i.hint || ""}</span></div>`).join("")
      : `<div class="cmdk-empty">No matches</div>`;
    list.querySelectorAll(".cmdk-item").forEach((el) =>
      el.addEventListener("click", () => { closeCmdk(); navigate(el.dataset.hash); }));
  }

  /* ——— Events ——— */
  function bind() {
    window.addEventListener("hashchange", () => { closeCmdk(); closeSidebar(); render(); });
    $("#menuBtn")?.addEventListener("click", () => {
      const sb = $("#sidebar");
      const open = !sb.classList.contains("open");
      sb.classList.toggle("open", open);
      $("#sidebarOverlay").classList.toggle("show", open);
      $("#menuBtn").setAttribute("aria-expanded", open ? "true" : "false");
    });
    $("#sidebarOverlay")?.addEventListener("click", closeSidebar);
    $("#connectBtn")?.addEventListener("click", () => navigate("#portfolio"));

    // segmented controls (overview / token / midnight)
    document.addEventListener("click", (e) => {
      const seg = e.target.closest(".seg-btn");
      if (!seg) return;
      const group = seg.closest(".seg");
      if (!group || !group.id) return;
      $$(".seg-btn", group).forEach((b) => b.classList.remove("active"));
      seg.classList.add("active");
      if (group.id === "ovAdaRange") { chartRanges.ADA = seg.dataset.range; drawOverviewChart("ADA", chartRanges.ADA); }
      if (group.id === "ovNightRange") { chartRanges.NIGHT = seg.dataset.range; drawOverviewChart("NIGHT", chartRanges.NIGHT); }
      if (group.id === "nightRange") { chartRanges.NIGHT = seg.dataset.range; drawNightChart(chartRanges.NIGHT); }
      if (group.id === "tokenRange") { chartRanges.TOKEN = seg.dataset.range; if (currentToken) paintTokenChart(currentToken); }
      if (group.id === "chartType") { chartType = seg.dataset.ctype; if (currentToken) paintTokenChart(currentToken); }
      syncToggleAria();
    });

    // market tabs (category quick filters)
    $("#marketTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-mtab]");
      if (!tab) return;
      $$("#marketTabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
      syncToggleAria();
      renderMarketTokens();
    });

    ["marketSearch", "marketCat", "watchOnly"].forEach((id) => {
      const el = $("#" + id);
      if (!el) return;
      el.addEventListener("input", renderMarketTokens);
      el.addEventListener("change", renderMarketTokens);
    });

    $("#marketsTable")?.querySelector("thead")?.addEventListener("click", (e) => {
      const th = e.target.closest("[data-sort]");
      if (!th) return;
      const key = th.dataset.sort;
      if (marketSort.key === key) marketSort.dir *= -1;
      else { marketSort.key = key; marketSort.dir = key === "ticker" ? 1 : -1; }
      $$("#marketsTable th").forEach((x) => x.classList.toggle("sorted", x.dataset.sort === key));
      renderMarketTokens();
    });

    // portfolio tabs
    $("#pfTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (!tab) return;
      $$("#pfTabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
      $$(".tab-panel", $("#sec-portfolio")).forEach((p) =>
        p.classList.toggle("active", p.id === "pf-" + tab.dataset.tab));
      syncToggleAria();
    });

    // midnight calc
    $("#nightHoldings")?.addEventListener("input", updateDustCalc);
    $("#genFactor")?.addEventListener("input", updateDustCalc);

    // ⌘K
    $("#globalSearch")?.addEventListener("click", openCmdk);
    $("#globalSearch")?.addEventListener("focus", (ev) => { ev.target.blur(); openCmdk(); });
    $("#cmdk")?.addEventListener("click", (e) => { if (e.target.id === "cmdk") closeCmdk(); });
    $("#cmdkInput")?.addEventListener("input", (e) => paintCmdk(e.target.value));
    $("#cmdkInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCmdk();
      if (e.key === "Enter") {
        const active = $(".cmdk-item.active");
        if (active) { closeCmdk(); navigate(active.dataset.hash); }
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = $$(".cmdk-item");
        const i = items.findIndex((x) => x.classList.contains("active"));
        items.forEach((x) => x.classList.remove("active"));
        const next = e.key === "ArrowDown" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
        items[next]?.classList.add("active");
        items[next]?.scrollIntoView({ block: "nearest" });
      }
    });
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        $("#cmdk").classList.contains("open") ? closeCmdk() : openCmdk();
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        const typing = tag === "input" || tag === "textarea" || tag === "select" ||
          document.activeElement?.isContentEditable;
        if (!typing && !$("#cmdk").classList.contains("open")) {
          e.preventDefault();
          openCmdk();
        }
      }
      if (e.key === "Escape") closeCmdk();
    });

    window.addEventListener("resize", () => {
      const { route, param } = parseHash();
      if (route === "token" && currentToken) paintTokenChart(currentToken);
    });

    setInterval(paintFresh, 15000);
  }

  function closeSidebar() {
    $("#sidebar")?.classList.remove("open");
    $("#sidebarOverlay")?.classList.remove("show");
    $("#menuBtn")?.setAttribute("aria-expanded", "false");
  }

  $("#copyDonate")?.addEventListener("click", async () => {
    const addr = $("#donateAddr")?.textContent?.trim();
    if (!addr) return;
    try { await navigator.clipboard.writeText(addr); toast("ADA donation address copied"); }
    catch (_) { toast("Copy failed — select the address"); }
  });
  $("#donateAddr")?.addEventListener("click", () => $("#copyDonate")?.click());
  $("#copyDonateBtc")?.addEventListener("click", async () => {
    const addr = $("#donateAddrBtc")?.textContent?.trim();
    if (!addr) return;
    try { await navigator.clipboard.writeText(addr); toast("BTC donation address copied"); }
    catch (_) { toast("Copy failed — select the address"); }
  });
  $("#donateAddrBtc")?.addEventListener("click", () => $("#copyDonateBtc")?.click());

  /* ——— Boot ——— */
  async function boot() {
    bind();
    if (!location.hash) location.hash = "#overview";
    render(); // skeletons
    paintFresh();
    await ND.ensureMarkets();
    paintFresh();
    render(); // live
    setInterval(async () => {
      await ND.ensureMarkets(true);
      dexAggCache = null;
      paintFresh();
      if (["overview", "markets", "watchlist", "midnight"].includes(currentRoute)) render();
    }, 5 * 60 * 1000);
  }
  boot();
})();
