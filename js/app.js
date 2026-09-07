/* NightDream.io — SPA router + views */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = ND.fmt;
  const WATCH_KEY = "nightdream.watchlist.v2";

  /* ——— Watchlist persistence ——— */
  function loadWatch() {
    try {
      const raw = localStorage.getItem(WATCH_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (_) {}
    return new Set(ND.TOKENS.filter((t) => t.watch).map((t) => t.id));
  }
  function saveWatch(set) {
    localStorage.setItem(WATCH_KEY, JSON.stringify([...set]));
  }
  let watch = loadWatch();
  function isWatched(id) { return watch.has(id); }
  function toggleWatch(id) {
    if (watch.has(id)) watch.delete(id); else watch.add(id);
    saveWatch(watch);
    toast(watch.has(id) ? `★ Added ${id} to watchlist` : `Removed ${id}`);
    refreshWatchDependent();
  }

  /* ——— Toast ——— */
  function toast(msg) {
    const host = $("#toastHost");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  /* ——— Routing ——— */
  let currentTokenId = "SUNDAE";
  let chartRanges = { ADA: "7D", NIGHT: "7D", token: "7D" };
  let marketSort = { key: "vol", dir: -1 };

  function parseHash() {
    const h = (location.hash || "#overview").slice(1);
    const [route, ...rest] = h.split("/");
    return { route: route || "overview", param: rest.join("/") || null };
  }

  function navigate(hash) {
    if (location.hash !== hash) location.hash = hash;
    else render();
  }

  function setActiveNav(route) {
    $$(".nav-item").forEach((a) => {
      const r = a.dataset.route;
      a.classList.toggle("active", r === route || (route === "token" && r === "token"));
    });
  }

  function showSection(name) {
    $$(".section").forEach((s) => s.classList.toggle("visible", s.dataset.section === name));
  }

  function render() {
    const { route, param } = parseHash();
    const map = {
      overview: "overview",
      markets: "markets",
      token: "token",
      portfolio: "portfolio",
      dex: "dex",
      news: "news",
      midnight: "midnight",
      watchlist: "watchlist",
    };
    const sec = map[route] || "overview";
    setActiveNav(sec === "token" ? "token" : sec);
    showSection(sec);
    closeSidebar();

    if (sec === "overview") renderOverview();
    if (sec === "markets") renderMarkets();
    if (sec === "token") {
      currentTokenId = (param || "SUNDAE").toUpperCase();
      if (!ND.getToken(currentTokenId)) currentTokenId = "SUNDAE";
      renderToken(currentTokenId);
    }
    if (sec === "portfolio") renderPortfolio();
    if (sec === "dex") renderDex();
    if (sec === "news") renderNews();
    if (sec === "midnight") renderMidnight();
    if (sec === "watchlist") renderWatchlist();
  }

  function refreshWatchDependent() {
    const { route } = parseHash();
    if (route === "markets") renderMarkets();
    if (route === "watchlist") renderWatchlist();
    if (route === "overview") renderOverview();
    if (route === "token") renderToken(currentTokenId);
  }

  /* ——— Helpers ——— */
  function avatar(ticker, cls = "") {
    return `<div class="token-avatar ${cls}">${(ticker || "?").slice(0, 3)}</div>`;
  }
  function chClass(n) { return n >= 0 ? "up" : "down"; }
  function fishBadge(w) {
    const smart = w === "whale" ? '<span class="smart-tag">SMART</span>' : "";
    return `<span class="fish-badge ${w}">${w}</span>${smart}`;
  }
  function tokenLink(id) {
    return `<a href="#token/${id}">${id}</a>`;
  }

  /* ——— Overview ——— */
  function renderOverview() {
    const ada = ND.PULSE.ada, night = ND.PULSE.night;
    $("#lastUpdated").innerHTML = `<span class="freshness"><span class="pulse"></span> Updated ${fmt.timeAgo(ND.META.updatedAt)} · <span class="badge-demo">DEMO</span></span>`;
    $("#overviewStats").innerHTML = [
      { label: "ADA", value: fmt.usd(ada.price, 3), sub: fmt.pct(ada.change24h), ch: ada.change24h },
      { label: "NIGHT", value: fmt.usd(night.price, 4), sub: fmt.pct(night.change24h), ch: night.change24h },
      { label: "ADA vol 24h", value: fmt.usd(ada.volume24h), sub: "Cardano", ch: 1 },
      { label: "NIGHT mcap", value: fmt.usd(night.mcap), sub: "FDV " + fmt.usd(night.fdv), ch: 1 },
      { label: "DEX vol 24h", value: fmt.usd(ND.DEXES.reduce((s, d) => s + d.vol24, 0)), sub: "All DEXes", ch: 1 },
      { label: "Portfolio", value: fmt.usd(51240), sub: "Demo wallet", ch: 1 },
    ].map((s) => `
      <div class="stat-card">
        <div class="stat-label">${s.label} <span class="badge-demo">DEMO</span></div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-sub ${chClass(s.ch)}">${s.sub}</div>
      </div>`).join("");

    $("#overviewNews").innerHTML = ND.NEWS.slice(0, 6).map((n) => `
      <a class="news-chip" href="#news">
        <div class="src">${n.source} · ${n.tag}</div>
        <div class="ttl">${n.title}</div>
        <div class="when">${fmt.timeAgo(n.ts)}</div>
      </a>`).join("");

    const movers = ND.TOP_MOVERS.map((id) => ND.getToken(id)).filter(Boolean);
    $("#ovMovers").innerHTML = movers.map((t) => `
      <div class="list-row" onclick="location.hash='#token/${t.id}'">
        <div class="token-cell">${avatar(t.ticker, "sm")}<div class="token-meta"><strong>${t.ticker}</strong><span>${t.name}</span></div></div>
        <div class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</div>
      </div>`).join("");

    $("#ovTrending").innerHTML = ND.TRENDING.map((id) => ND.getToken(id)).filter(Boolean).map((t) => `
      <div class="list-row" onclick="location.hash='#token/${t.id}'">
        <div class="token-cell">${avatar(t.ticker, "sm")}<strong>${t.ticker}</strong></div>
        <div>${fmt.usd(t.price, 4)}</div>
      </div>`).join("");

    const wl = [...watch].map((id) => ND.getToken(id)).filter(Boolean).slice(0, 6);
    $("#ovWatch").innerHTML = wl.length ? wl.map((t) => `
      <div class="list-row" onclick="location.hash='#token/${t.id}'">
        <div class="token-cell">${avatar(t.ticker, "sm")}<strong>${t.ticker}</strong></div>
        <div class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</div>
      </div>`).join("") : `<div class="empty" style="padding:16px"><strong>Empty</strong>Star tokens in Markets</div>`;

    const tb = $("#ovPools tbody");
    tb.innerHTML = ND.POOLS.slice(0, 5).map((p) => `
      <tr><td>${p.pair}</td><td>${p.dex}</td><td>${fmt.usd(p.tvl)}</td><td>${fmt.usd(p.vol24)}</td></tr>`).join("");

    const pf = ND.PORTFOLIO;
    $("#ovPortfolio").innerHTML = `
      <div class="stat-value" style="margin-bottom:8px">${fmt.usd(51240)}</div>
      <div class="muted" style="font-size:12px;margin-bottom:10px">Best ${pf.best.id} ${fmt.pct(pf.best.pnlPct)} · Worst ${pf.worst.id} ${fmt.pct(pf.worst.pnlPct)}</div>
      ${pf.allocation.slice(0, 5).map((a) => `
        <div class="list-row"><span>${a.id}</span><span>${a.pct}% · ${fmt.usd(a.value)}</span></div>`).join("")}`;

    requestAnimationFrame(() => {
      NDCharts.drawLineChart($("#ovAdaChart"), ND.CHARTS.ADA, { range: chartRanges.ADA });
      NDCharts.drawLineChart($("#ovNightChart"), ND.CHARTS.NIGHT, { range: chartRanges.NIGHT, color: "#2ee6c5", fill: "rgba(46,230,197,0.12)" });
    });
  }

  /* ——— Markets ——— */
  function renderMarkets() {
    renderMarketTokens();
    // pools
    $("#marketsPoolsTable tbody").innerHTML = ND.POOLS.map((p) => `
      <tr><td><strong>${p.pair}</strong></td><td>${p.dex}</td><td>${fmt.usd(p.tvl)}</td><td>${fmt.usd(p.vol24)}</td><td class="up">${p.apr}%</td><td>${p.fee}</td></tr>`).join("");
    // exchanges
    $("#marketsExTable tbody").innerHTML = ND.DEXES.map((d, i) => `
      <tr><td class="rank-cell">${i + 1}</td><td><strong>${d.name}</strong></td><td>${fmt.usd(d.vol24)}</td><td>${d.pools}</td><td>${d.share}%</td></tr>`).join("");
    // trades with wallet badges
    $("#marketsTradesTable tbody").innerHTML = ND.GLOBAL_TRADES.map((t) => `
      <tr onclick="location.hash='#token/${t.token}'">
        <td>${t.ago}</td>
        <td><strong>${t.token}</strong></td>
        <td class="trade-side ${t.side}">${t.side}</td>
        <td>${fmt.usd(t.price, 6)}</td>
        <td>${fmt.num(t.amount)}</td>
        <td>${fmt.usd(t.ada)}</td>
        <td>${fishBadge(t.wallet)}</td>
        <td>${t.dex}</td>
      </tr>`).join("");
  }

  function filteredMarketTokens() {
    const q = ($("#marketSearch")?.value || "").trim().toLowerCase();
    const cat = $("#marketCat")?.value || "";
    const liqMin = Number($("#liqMin")?.value || 0);
    const watchOnly = $("#watchOnly")?.checked;
    let rows = ND.TOKENS.filter((t) => t.id !== "DUST");
    if (q) {
      rows = rows.filter((t) =>
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.assetId || "").toLowerCase().includes(q) ||
        (t.policy || "").toLowerCase().includes(q)
      );
    }
    if (cat) rows = rows.filter((t) => t.category === cat);
    if (liqMin > 0) rows = rows.filter((t) => t.liq >= liqMin);
    if (watchOnly) rows = rows.filter((t) => isWatched(t.id));
    const { key, dir } = marketSort;
    rows.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === "watch") { av = isWatched(a.id) ? 1 : 0; bv = isWatched(b.id) ? 1 : 0; }
      if (key === "rank") return 0;
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return ((av || 0) - (bv || 0)) * dir;
    });
    return rows;
  }

  function renderMarketTokens() {
    const rows = filteredMarketTokens();
    const tb = $("#marketsTable tbody");
    tb.innerHTML = rows.map((t, i) => {
      const up7 = t.ch7d >= 0;
      return `<tr data-id="${t.id}">
        <td><button class="star-btn ${isWatched(t.id) ? "on" : ""}" data-star="${t.id}" type="button">${isWatched(t.id) ? "★" : "☆"}</button></td>
        <td class="rank-cell">${i + 1}</td>
        <td><div class="token-cell">${avatar(t.ticker)}<div class="token-meta"><strong>${t.ticker}</strong><span>${t.name}</span></div></div></td>
        <td>${fmt.usd(t.price, 6)}</td>
        <td class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</td>
        <td class="${chClass(t.ch7d)}">${fmt.pct(t.ch7d)}</td>
        <td><span class="spark"><canvas class="spark-c" data-spark="${t.id}" data-up="${up7}"></canvas></span></td>
        <td>${fmt.usd(t.vol)}</td>
        <td>${fmt.usd(t.liq)}</td>
        <td>${fmt.usd(t.fdv)}</td>
        <td>${fmt.num(t.holders)}</td>
        <td>${t.pools || 0}</td>
        <td>${fmt.num(t.trades24 || 0)}</td>
      </tr>`;
    }).join("");

    tb.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("[data-star]")) return;
        navigate("#token/" + tr.dataset.id);
      });
    });
    tb.querySelectorAll("[data-star]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleWatch(btn.dataset.star);
      });
    });

    requestAnimationFrame(() => {
      $$(".spark-c", tb).forEach((c) => {
        const series = ND.CHARTS[c.dataset.spark] || ND.genSeries(1, 40, 0.03, c.dataset.spark.length * 13);
        NDCharts.drawSparkline(c, series, c.dataset.up === "true");
      });
    });
  }

  /* ——— Token deep page ——— */
  let tokenTab = "chart";
  function renderToken(id) {
    const t = ND.getToken(id);
    if (!t) return;
    const series = ND.CHARTS[id] || ND.genSeries(t.price, 168, 0.03, id.length * 17);
    const trades = ND.TRADES[id] || ND.TRADES.SUNDAE;
    const holders = ND.HOLDERS[id] || ND.HOLDERS.default;
    const pools = ND.POOLS.filter((p) => p.pair.includes(t.ticker) || p.pair.includes(id));

    const root = $("#tokenPage");
    root.innerHTML = `
      <div class="token-banner">
        <div class="big-avatar">${t.ticker.slice(0, 3)}</div>
        <div style="flex:1;min-width:180px">
          <h1>${t.name} <span class="muted" style="font-weight:500;font-size:16px">${t.ticker}</span>
            <button class="star-btn ${isWatched(t.id) ? "on" : ""}" id="tokenStar" type="button" style="font-size:18px">${isWatched(t.id) ? "★" : "☆"}</button>
            <span class="badge-demo">DEMO</span>
          </h1>
          <div class="price-row">
            <span class="price">${fmt.usd(t.price, 6)}</span>
            <span class="${chClass(t.ch24)}">${fmt.pct(t.ch24)} 24h</span>
            <span class="${chClass(t.ch7d)}">${fmt.pct(t.ch7d)} 7d</span>
          </div>
          <div class="links-row">
            <span class="asset-id" id="copyAsset" title="Click to copy">${t.assetId || t.policy}</span>
            <a class="link-out" href="https://cardanoscan.io/" target="_blank" rel="noopener">Cardanoscan ↗</a>
            <a class="link-out" href="https://float.sundae.fi" target="_blank" rel="noopener">Compare Float ↗</a>
            <a class="link-out" href="#markets">← Markets</a>
          </div>
        </div>
        <div class="freshness"><span class="pulse"></span> Fresh · demo</div>
      </div>
      <div class="token-stats-row">
        <div class="token-stat"><div class="lbl">Liquidity</div><div class="val">${fmt.usd(t.liq)}</div></div>
        <div class="token-stat"><div class="lbl">Vol 24h</div><div class="val">${fmt.usd(t.vol)}</div></div>
        <div class="token-stat"><div class="lbl">Trades 24h</div><div class="val">${fmt.num(t.trades24)}</div></div>
        <div class="token-stat"><div class="lbl">FDV</div><div class="val">${fmt.usd(t.fdv)}</div></div>
        <div class="token-stat"><div class="lbl">Mcap</div><div class="val">${fmt.usd(t.mcap)}</div></div>
        <div class="token-stat"><div class="lbl">Holders</div><div class="val">${fmt.num(t.holders)}</div></div>
        <div class="token-stat"><div class="lbl">Pools</div><div class="val">${t.pools || 0}</div></div>
      </div>
      <div class="tabs" id="tokenTabs">
        <button class="tab ${tokenTab === "chart" ? "active" : ""}" data-ttab="chart" type="button">Chart</button>
        <button class="tab ${tokenTab === "trades" ? "active" : ""}" data-ttab="trades" type="button">Trades</button>
        <button class="tab ${tokenTab === "pools" ? "active" : ""}" data-ttab="pools" type="button">Pools</button>
        <button class="tab ${tokenTab === "holders" ? "active" : ""}" data-ttab="holders" type="button">Holders</button>
        <button class="tab ${tokenTab === "about" ? "active" : ""}" data-ttab="about" type="button">About</button>
      </div>
      <div class="tab-panel ${tokenTab === "chart" ? "active" : ""}" id="ttab-chart">
        <div class="panel">
          <div class="panel-head">
            <h2>${t.ticker} chart</h2>
            <div class="seg" id="tokenRange">
              <button class="seg-btn" data-range="1H">1H</button>
              <button class="seg-btn" data-range="24H">24H</button>
              <button class="seg-btn active" data-range="7D">7D</button>
              <button class="seg-btn" data-range="30D">30D</button>
            </div>
          </div>
          <div class="chart-wrap"><canvas id="tokenChart"></canvas></div>
          <div class="muted" id="tokenHover" style="font-size:12px;margin-top:6px">Hover for price</div>
        </div>
      </div>
      <div class="tab-panel ${tokenTab === "trades" ? "active" : ""}" id="ttab-trades">
        <div class="panel">
          <div class="panel-head"><h2>Trade tape</h2><span class="muted">Fish · dolphin · whale badges beat Float</span></div>
          <div class="table-wrap">
            <table class="data-table" id="tokenTradesTable">
              <thead><tr><th></th><th>Side</th><th>Price</th><th>Amount</th><th>ADA</th><th>Wallet</th><th>Ago</th><th>Tx</th></tr></thead>
              <tbody>
                ${trades.map((tr, i) => `
                  <tr class="expand-row" data-exp="${i}">
                    <td>▸</td>
                    <td class="trade-side ${tr.side}">${tr.side}</td>
                    <td>${fmt.usd(tr.price, 6)}</td>
                    <td>${fmt.num(tr.amount)}</td>
                    <td>${fmt.usd(tr.ada)}</td>
                    <td>${fishBadge(tr.wallet)}</td>
                    <td>${tr.ago}</td>
                    <td class="muted">${tr.tx || "—"}</td>
                  </tr>
                  <tr class="expand-detail" data-exp-d="${i}"><td colspan="8">
                    <strong>Expanded trade</strong> · ${tr.side.toUpperCase()} ${fmt.num(tr.amount)} ${t.ticker} @ ${fmt.usd(tr.price, 6)}
                    · Wallet size: <em>${tr.wallet}</em>${tr.wallet === "whale" ? " · tagged SMART MONEY (demo heuristic)" : ""}
                    · Explorer: Cardanoscan placeholder for ${tr.tx || "tx"}
                  </td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="tab-panel ${tokenTab === "pools" ? "active" : ""}" id="ttab-pools">
        <div class="panel">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Pair</th><th>DEX</th><th>TVL</th><th>Vol 24h</th><th>APR</th></tr></thead>
              <tbody>
                ${(pools.length ? pools : ND.POOLS.slice(0, 3)).map((p) => `
                  <tr><td>${p.pair}</td><td>${p.dex}</td><td>${fmt.usd(p.tvl)}</td><td>${fmt.usd(p.vol24)}</td><td class="up">${p.apr}%</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="tab-panel ${tokenTab === "holders" ? "active" : ""}" id="ttab-holders">
        <div class="panel">
          <div class="panel-head"><h2>Holder distribution</h2><span class="muted">Float About: not available — we show it</span></div>
          <div class="chart-wrap sm"><canvas id="holderBars"></canvas></div>
        </div>
      </div>
      <div class="tab-panel ${tokenTab === "about" ? "active" : ""}" id="ttab-about">
        <div class="panel">
          <h3 style="margin-top:0">${t.name}</h3>
          <p class="muted">${t.about || ""}</p>
          <p><span class="tag ${t.category === "Midnight" ? "midnight" : ""}">${t.category}</span></p>
          <p class="muted" style="font-size:12px">Asset ID: <code>${t.assetId}</code></p>
          <p class="muted" style="font-size:12px">Policy (demo): <code>${t.policy}</code></p>
        </div>
      </div>
    `;

    $("#tokenStar")?.addEventListener("click", () => toggleWatch(t.id));
    $("#copyAsset")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(t.assetId || t.policy);
        toast("Asset ID copied");
      } catch (_) { toast(t.assetId || t.policy); }
    });

    $$("#tokenTabs .tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        tokenTab = btn.dataset.ttab;
        renderToken(id);
      });
    });

    $$(".expand-row", root).forEach((row) => {
      row.addEventListener("click", () => {
        const d = root.querySelector(`[data-exp-d="${row.dataset.exp}"]`);
        d?.classList.toggle("open");
        row.querySelector("td").textContent = d?.classList.contains("open") ? "▾" : "▸";
      });
    });

    $$("#tokenRange .seg-btn").forEach((b) => {
      b.addEventListener("click", () => {
        $$("#tokenRange .seg-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        chartRanges.token = b.dataset.range;
        NDCharts.drawLineChart($("#tokenChart"), series, {
          range: chartRanges.token,
          onHover: (pt) => {
            $("#tokenHover").textContent = pt ? `Price ${fmt.usd(pt.v, 6)} · ${new Date(pt.t).toLocaleString()}` : "Hover for price";
          },
        });
      });
    });

    requestAnimationFrame(() => {
      if (tokenTab === "chart") {
        NDCharts.drawLineChart($("#tokenChart"), series, {
          range: chartRanges.token,
          onHover: (pt) => {
            const el = $("#tokenHover");
            if (el) el.textContent = pt ? `Price ${fmt.usd(pt.v, 6)} · ${new Date(pt.t).toLocaleString()}` : "Hover for price";
          },
        });
      }
      if (tokenTab === "holders") {
        NDCharts.drawBars($("#holderBars"), holders);
      }
    });
  }

  /* ——— Portfolio ——— */
  function renderPortfolio() {
    const pf = ND.PORTFOLIO;
    $("#pfStats").innerHTML = [
      { label: "Net worth", value: fmt.usd(51240), sub: "+6.4% 7d", ch: 1 },
      { label: "Best", value: pf.best.id, sub: fmt.pct(pf.best.pnlPct), ch: 1 },
      { label: "Worst", value: pf.worst.id, sub: fmt.pct(pf.worst.pnlPct), ch: -1 },
      { label: "Wallets", value: String(pf.wallets.length), sub: pf.wallets.filter((w) => w.connected).length + " connected", ch: 1 },
    ].map((s) => `
      <div class="stat-card">
        <div class="stat-label">${s.label} <span class="badge-demo">DEMO</span></div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-sub ${chClass(s.ch)}">${s.sub}</div>
      </div>`).join("");

    const netSeries = pf.netWorth.map((p, i) => ({ t: Date.now() - (30 - (p.t + 30)) * 86400000, v: p.v }));
    requestAnimationFrame(() => {
      NDCharts.drawLineChart($("#pfNetChart"), netSeries, { range: "30D", color: "#8b7cff" });
      NDCharts.drawDonut($("#pfAllocChart"), pf.allocation);
    });
    const colors = ["#8b7cff", "#2ee6c5", "#ffb020", "#ff6b7a", "#5b8cff", "#c084fc", "#34d399", "#94a3b8"];
    $("#pfAllocLegend").innerHTML = pf.allocation.map((a, i) => `
      <span><span><i class="dot-swatch" style="background:${colors[i % colors.length]}"></i>${a.id}</span><span>${a.pct}% · ${fmt.usd(a.value)}</span></span>`).join("");

    $("#pf-tokens").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Token</th><th>Amount</th><th>Value</th><th>Cost</th><th>P&L</th></tr></thead><tbody>
      ${pf.tokens.map((x) => {
        const tok = ND.getToken(x.id);
        return `<tr onclick="location.hash='#token/${x.id}'"><td><div class="token-cell">${avatar(x.id,"sm")}<strong>${x.id}</strong></div></td>
          <td>${fmt.num(x.amount)}</td><td>${fmt.usd(x.value)}</td><td>${fmt.usd(x.cost)}</td>
          <td class="${chClass(x.pnlPct)}">${fmt.pct(x.pnlPct)}</td></tr>`;
      }).join("")}
    </tbody></table></div>`;

    $("#pf-nfts").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>NFT</th><th>Collection</th><th>Floor</th><th>Value</th></tr></thead><tbody>
      ${pf.nfts.map((n) => `<tr><td><strong>${n.name}</strong></td><td>${n.collection}</td><td>${n.floor} ₳</td><td>${n.value} ₳</td></tr>`).join("")}
    </tbody></table></div>`;

    $("#pf-lps").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Pair</th><th>DEX</th><th>Value</th><th>APR</th><th>P&L</th></tr></thead><tbody>
      ${pf.lps.map((l) => `<tr><td><strong>${l.pair}</strong></td><td>${l.dex}</td><td>${fmt.usd(l.value)}</td><td class="up">${l.apr}%</td><td class="${chClass(l.pnlPct)}">${fmt.pct(l.pnlPct)}</td></tr>`).join("")}
    </tbody></table></div>`;

    $("#pf-trades").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Side</th><th>Token</th><th>Amount</th><th>Price</th><th>ADA</th><th>When</th></tr></thead><tbody>
      ${pf.trades.map((tr) => `<tr><td class="trade-side ${tr.side}">${tr.side}</td><td><strong>${tr.token}</strong></td><td>${fmt.num(tr.amount)}</td><td>${fmt.usd(tr.price, 4)}</td><td>${fmt.usd(tr.ada)}</td><td>${tr.when}</td></tr>`).join("")}
    </tbody></table></div>`;

    $("#pf-wallets").innerHTML = pf.wallets.map((w) => `
      <div class="list-row">
        <div><strong>${w.label}</strong><div class="muted" style="font-size:12px">${w.address}</div></div>
        <span class="tag ${w.connected ? "" : "markets"}">${w.connected ? "connected" : "disconnected"}</span>
      </div>`).join("");
  }

  /* ——— DEX ——— */
  function renderDex() {
    const bars = ND.DEXES.map((d) => ({ label: d.name, pct: d.share }));
    requestAnimationFrame(() => {
      NDCharts.drawBars($("#dexVolChart"), ND.DEXES.map((d) => ({ label: d.name, pct: Math.round(d.vol24 / 1e5) / 10 })));
      NDCharts.drawDonut($("#dexShareChart"), bars);
    });
    $("#dexList").innerHTML = ND.DEXES.map((d) => `
      <div class="list-row"><strong>${d.name}</strong><span>${fmt.usd(d.vol24)} · ${d.share}%</span></div>`).join("");
    const colors = ["#8b7cff", "#2ee6c5", "#ffb020", "#ff6b7a", "#5b8cff", "#94a3b8"];
    $("#dexShareLegend").innerHTML = ND.DEXES.map((d, i) => `
      <span><span><i class="dot-swatch" style="background:${colors[i % colors.length]}"></i>${d.name}</span><span>${d.share}%</span></span>`).join("");
    $("#poolsTable tbody").innerHTML = ND.POOLS.map((p) => `
      <tr><td><strong>${p.pair}</strong></td><td>${p.dex}</td><td>${fmt.usd(p.tvl)}</td><td>${fmt.usd(p.vol24)}</td><td class="up">${p.apr}%</td><td>${p.fee}</td></tr>`).join("");
  }

  /* ——— News ——— */
  function renderNews() {
    const srcSel = $("#newsSource");
    if (srcSel && srcSel.options.length <= 1) {
      ND.NEWS_SOURCES.forEach((s) => {
        const o = document.createElement("option");
        o.value = s; o.textContent = s;
        srcSel.appendChild(o);
      });
    }
    $("#newsSources").innerHTML = ND.NEWS_SOURCES.map((s) => `
      <div class="list-row" style="cursor:pointer" data-src="${s}"><span>${s}</span><span class="muted">${ND.NEWS.filter((n) => n.source === s).length}</span></div>`).join("");
    $$("#newsSources [data-src]").forEach((el) => {
      el.addEventListener("click", () => {
        $("#newsSource").value = el.dataset.src;
        paintNews();
      });
    });
    paintNews();
  }
  function paintNews() {
    const tag = $("#newsTag")?.value || "";
    const src = $("#newsSource")?.value || "";
    let items = ND.NEWS;
    if (tag) items = items.filter((n) => n.tag === tag);
    if (src) items = items.filter((n) => n.source === src);
    $("#newsList").innerHTML = items.map((n) => {
      const tagCls = n.tag === "Midnight" ? "midnight" : n.tag === "DEX" ? "dex" : n.tag === "Markets" ? "markets" : "";
      return `<div class="list-row" style="align-items:flex-start;flex-direction:column;gap:4px;padding:12px 4px">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="tag ${tagCls}">${n.tag}</span>
          <span class="muted" style="font-size:11px">${n.source} · ${fmt.timeAgo(n.ts)}</span>
        </div>
        <strong style="font-size:14px">${n.title}</strong>
      </div>`;
    }).join("") || `<div class="empty">No headlines for this filter</div>`;
  }

  /* ——— Midnight ——— */
  function renderMidnight() {
    const n = ND.PULSE.night;
    $("#nightStats").innerHTML = [
      { label: "NIGHT price", value: fmt.usd(n.price, 4), sub: fmt.pct(n.change24h), ch: n.change24h },
      { label: "Mcap", value: fmt.usd(n.mcap), sub: "Circ " + fmt.num(n.circulating), ch: 1 },
      { label: "FDV", value: fmt.usd(n.fdv), sub: "Max " + fmt.num(n.maxSupply), ch: 1 },
      { label: "Vol 24h", value: fmt.usd(n.volume24h), sub: "DEMO", ch: 1 },
    ].map((s) => `
      <div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div><div class="stat-sub ${chClass(s.ch)}">${s.sub}</div></div>`).join("");
    $("#dustNote").textContent = ND.MIDNIGHT.generationNote;
    $("#bridgeNote").textContent = ND.MIDNIGHT.bridgeNote;
    updateDustCalc();
    requestAnimationFrame(() => {
      NDCharts.drawLineChart($("#nightDeepChart"), ND.CHARTS.NIGHT, { range: chartRanges.NIGHT, color: "#2ee6c5", fill: "rgba(46,230,197,0.12)" });
    });
  }
  function updateDustCalc() {
    const holdings = Number($("#nightHoldings")?.value || 0);
    const factor = Number($("#genFactor")?.value || 0.0146);
    const cap = holdings * ND.MIDNIGHT.dustPerNightMax;
    const rate = holdings * factor;
    const el = $("#dustResult");
    if (!el) return;
    el.innerHTML = `<strong>Capacity:</strong> ~${fmt.num(cap)} DUST max (5 × NIGHT)<br/>
      <strong>Est. generation:</strong> ~${rate.toFixed(2)} DUST / day <span class="badge-demo">DEMO</span><br/>
      <span class="muted">Illustrative only — real rates follow Midnight network parameters.</span>`;
  }
  function checkStake() {
    const raw = ($("#stakeInput")?.value || "").trim().toLowerCase();
    const box = $("#stakeResult");
    if (!raw) { box.style.display = "none"; return; }
    const hit = ND.MIDNIGHT.stakeDemo[raw];
    box.style.display = "block";
    if (hit) {
      box.innerHTML = `<strong>Status:</strong> <span class="up">${hit.status}</span><br/>
        NIGHT staked: ${fmt.num(hit.nightStaked)} · DUST capacity: ${fmt.num(hit.dustCapacity)}<br/>
        Gen rate: ~${fmt.num(hit.genRatePerDay)} DUST/day · Epoch ${hit.epoch} <span class="badge-demo">DEMO</span>`;
    } else {
      box.innerHTML = `<strong>No demo record</strong> for that address.<br/>
        <span class="muted">Try <code>stake1uydemo0nightdream</code> — live stake checks will wire to Midnight APIs later.</span>`;
    }
  }

  /* ——— Watchlist ——— */
  function renderWatchlist() {
    const ids = [...watch];
    const tb = $("#watchTable tbody");
    const empty = $("#watchEmpty");
    if (!ids.length) {
      tb.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    tb.innerHTML = ids.map((id) => {
      const t = ND.getToken(id);
      if (!t) return "";
      return `<tr>
        <td><button class="star-btn on" data-star="${id}" type="button">★</button></td>
        <td><div class="token-cell" style="cursor:pointer" onclick="location.hash='#token/${id}'">${avatar(t.ticker)}<div class="token-meta"><strong>${t.ticker}</strong><span>${t.name}</span></div></div></td>
        <td>${fmt.usd(t.price, 6)}</td>
        <td class="${chClass(t.ch24)}">${fmt.pct(t.ch24)}</td>
        <td>${fmt.usd(t.vol)}</td>
        <td>${fmt.usd(t.mcap)}</td>
        <td><a class="btn btn-sm" href="#token/${id}">Open</a></td>
      </tr>`;
    }).join("");
    tb.querySelectorAll("[data-star]").forEach((btn) => {
      btn.addEventListener("click", () => toggleWatch(btn.dataset.star));
    });
  }

  /* ——— ⌘K Command palette ——— */
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
      { label: "News", hint: "Feed", hash: "#news" },
      { label: "Midnight", hint: "NIGHT · DUST", hash: "#midnight" },
      { label: "Watchlist", hint: "Saved", hash: "#watchlist" },
      { label: "SUNDAE token", hint: "Deep link", hash: "#token/SUNDAE" },
      { label: "NIGHT token", hint: "Midnight", hash: "#token/NIGHT" },
    ];
    const tokens = ND.TOKENS.filter((t) => t.id !== "DUST").map((t) => ({
      label: `${t.ticker} · ${t.name}`,
      hint: fmt.usd(t.price, 4),
      hash: `#token/${t.id}`,
    }));
    let items = [...pages, ...tokens];
    if (q) {
      items = items.filter((i) => i.label.toLowerCase().includes(q) || (i.hint || "").toLowerCase().includes(q));
    }
    items = items.slice(0, 20);
    const list = $("#cmdkList");
    if (!items.length) {
      list.innerHTML = `<div class="cmdk-empty">No matches</div>`;
      return;
    }
    list.innerHTML = items.map((i, idx) => `
      <div class="cmdk-item ${idx === 0 ? "active" : ""}" data-hash="${i.hash}">
        <span>${i.label}</span><span class="hint">${i.hint || ""}</span>
      </div>`).join("");
    list.querySelectorAll(".cmdk-item").forEach((el) => {
      el.addEventListener("click", () => {
        closeCmdk();
        navigate(el.dataset.hash);
      });
    });
  }

  /* ——— Events ——— */
  function bind() {
    window.addEventListener("hashchange", render);

    $("#menuBtn")?.addEventListener("click", () => {
      $("#sidebar").classList.toggle("open");
      $("#sidebarOverlay").classList.toggle("show");
    });
    $("#sidebarOverlay")?.addEventListener("click", closeSidebar);

    $("#connectBtn")?.addEventListener("click", () => toast("Wallet connect — placeholder (Lace / Eternl / Vespr)"));
    $("#portfolioConnect")?.addEventListener("click", () => toast("Connect another wallet — demo CTA"));

    // overview / midnight range toggles
    document.addEventListener("click", (e) => {
      const seg = e.target.closest(".seg-btn");
      if (!seg) return;
      const group = seg.closest(".seg");
      if (!group || group.id === "tokenRange") return;
      $$(".seg-btn", group).forEach((b) => b.classList.remove("active"));
      seg.classList.add("active");
      const chart = group.dataset.chart;
      if (chart) {
        chartRanges[chart] = seg.dataset.range;
        if (chart === "ADA") NDCharts.drawLineChart($("#ovAdaChart"), ND.CHARTS.ADA, { range: chartRanges.ADA });
        if (chart === "NIGHT") {
          const opts = { range: chartRanges.NIGHT, color: "#2ee6c5", fill: "rgba(46,230,197,0.12)" };
          if ($("#ovNightChart")) NDCharts.drawLineChart($("#ovNightChart"), ND.CHARTS.NIGHT, opts);
          if ($("#nightDeepChart")) NDCharts.drawLineChart($("#nightDeepChart"), ND.CHARTS.NIGHT, opts);
        }
      }
    });

    // market tabs
    $("#marketTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-mtab]");
      if (!tab) return;
      $$("#marketTabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
      $$("[id^=mtab-]").forEach((p) => p.classList.toggle("active", p.id === "mtab-" + tab.dataset.mtab));
    });

    // market filters
    ["marketSearch", "marketCat", "liqMin", "watchOnly"].forEach((id) => {
      const el = $("#" + id);
      if (!el) return;
      el.addEventListener("input", () => {
        if (id === "liqMin") $("#liqMinLabel").textContent = fmt.usd(Number(el.value));
        renderMarketTokens();
      });
      el.addEventListener("change", () => renderMarketTokens());
    });

    // market sort
    $("#marketsTable")?.querySelector("thead")?.addEventListener("click", (e) => {
      const th = e.target.closest("[data-sort]");
      if (!th) return;
      const key = th.dataset.sort;
      if (marketSort.key === key) marketSort.dir *= -1;
      else { marketSort.key = key; marketSort.dir = key === "ticker" ? 1 : -1; }
      $$("#marketsTable th").forEach((x) => x.classList.toggle("sorted", x.dataset.sort === marketSort.key));
      renderMarketTokens();
    });

    // portfolio tabs
    $("#pfTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (!tab) return;
      $$("#pfTabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
      $$("[id^=pf-]").forEach((p) => {
        if (!p.id.startsWith("pf-")) return;
        p.classList.toggle("active", p.id === "pf-" + tab.dataset.tab);
      });
    });

    // news filters
    $("#newsTag")?.addEventListener("change", paintNews);
    $("#newsSource")?.addEventListener("change", paintNews);

    // midnight calc
    $("#nightHoldings")?.addEventListener("input", updateDustCalc);
    $("#genFactor")?.addEventListener("input", updateDustCalc);
    $("#stakeCheckBtn")?.addEventListener("click", checkStake);
    $("#stakeInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") checkStake(); });

    // ⌘K
    $("#globalSearch")?.addEventListener("click", openCmdk);
    $("#globalSearch")?.addEventListener("focus", (e) => { e.target.blur(); openCmdk(); });
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
        if ($("#cmdk").classList.contains("open")) closeCmdk();
        else openCmdk();
      }
      if (e.key === "Escape") closeCmdk();
    });

    window.addEventListener("resize", () => {
      const { route } = parseHash();
      if (route === "overview") {
        NDCharts.drawLineChart($("#ovAdaChart"), ND.CHARTS.ADA, { range: chartRanges.ADA });
        NDCharts.drawLineChart($("#ovNightChart"), ND.CHARTS.NIGHT, { range: chartRanges.NIGHT, color: "#2ee6c5", fill: "rgba(46,230,197,0.12)" });
      }
    });
  }

  function closeSidebar() {
    $("#sidebar")?.classList.remove("open");
    $("#sidebarOverlay")?.classList.remove("show");
  }

  /* ——— Boot ——— */
  bind();
  if (!location.hash) location.hash = "#overview";
  else render();
})();
