(() => {
  "use strict";

  const DEMO = {
    stats: [
      { label: "ADA price", value: "$0.842", change: "+3.24%", up: true },
      { label: "24h volume", value: "$128.4M", change: "+12.1%", up: true },
      { label: "Market cap", value: "$29.7B", change: "+2.8%", up: true },
      { label: "Active wallets", value: "84.2K", change: "-1.4%", up: false },
    ],
    trending: [
      { ticker: "SNEK", name: "Snek", price: "$0.00142", change: "+18.4%", up: true, vol: "$4.2M" },
      { ticker: "MIN", name: "Minswap", price: "$0.048", change: "+6.1%", up: true, vol: "$2.8M" },
      { ticker: "HOSKY", name: "Hosky", price: "$0.000021", change: "-4.2%", up: false, vol: "$1.9M" },
      { ticker: "WMTX", name: "World Mobile", price: "$0.19", change: "+2.3%", up: true, vol: "$1.1M" },
      { ticker: "IUSD", name: "iUSD", price: "$1.00", change: "+0.1%", up: true, vol: "$890K" },
    ],
    markets: [
      { pair: "ADA / USD", price: "$0.842", change: "+3.24%", up: true, vol: "$84.2M", liq: "$42.1M" },
      { pair: "SNEK / ADA", price: "₳0.00169", change: "+15.2%", up: true, vol: "$4.1M", liq: "$2.4M" },
      { pair: "MIN / ADA", price: "₳0.057", change: "+5.4%", up: true, vol: "$2.7M", liq: "$6.8M" },
      { pair: "HOSKY / ADA", price: "₳0.000025", change: "-3.8%", up: false, vol: "$1.8M", liq: "$980K" },
      { pair: "WMTX / ADA", price: "₳0.226", change: "+1.9%", up: true, vol: "$1.0M", liq: "$3.2M" },
      { pair: "IUSD / ADA", price: "₳1.19", change: "+0.2%", up: true, vol: "$760K", liq: "$11.4M" },
    ],
    tokens: [
      { ticker: "ADA", name: "Cardano", price: "$0.842", change: "+3.24%", up: true, mcap: "$29.7B" },
      { ticker: "SNEK", name: "Snek", price: "$0.00142", change: "+18.4%", up: true, mcap: "$98M" },
      { ticker: "MIN", name: "Minswap", price: "$0.048", change: "+6.1%", up: true, mcap: "$72M" },
      { ticker: "HOSKY", name: "Hosky", price: "$0.000021", change: "-4.2%", up: false, mcap: "$41M" },
      { ticker: "WMTX", name: "World Mobile", price: "$0.19", change: "+2.3%", up: true, mcap: "$120M" },
      { ticker: "IUSD", name: "iUSD", price: "$1.00", change: "+0.1%", up: true, mcap: "$54M" },
    ],
    series: {
      "24h": [0.78, 0.79, 0.785, 0.8, 0.81, 0.805, 0.82, 0.83, 0.825, 0.84, 0.838, 0.842],
      "7d": [0.71, 0.73, 0.72, 0.75, 0.77, 0.76, 0.79, 0.81, 0.8, 0.82, 0.835, 0.842],
      "30d": [0.62, 0.65, 0.63, 0.68, 0.7, 0.69, 0.72, 0.74, 0.73, 0.78, 0.8, 0.842],
      ADA: [0.71, 0.73, 0.72, 0.75, 0.77, 0.76, 0.79, 0.81, 0.8, 0.82, 0.835, 0.842],
      MIN: [0.039, 0.041, 0.04, 0.042, 0.044, 0.043, 0.045, 0.046, 0.045, 0.047, 0.0475, 0.048],
      SNEK: [0.0011, 0.00115, 0.00112, 0.0012, 0.00125, 0.00122, 0.0013, 0.00135, 0.00132, 0.00138, 0.0014, 0.00142],
      HOSKY: [0.000024, 0.0000235, 0.000023, 0.0000228, 0.0000225, 0.0000222, 0.000022, 0.0000218, 0.0000215, 0.0000212, 0.0000211, 0.000021],
    },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function showToast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      el.hidden = true;
    }, 2400);
  }

  function renderStats() {
    $("#statGrid").innerHTML = DEMO.stats
      .map(
        (s) => `
      <article class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-change ${s.up ? "up" : "down"}">${s.change}</div>
      </article>`
      )
      .join("");
  }

  function renderTrending() {
    $("#trendList").innerHTML = DEMO.trending
      .map(
        (t) => `
      <li class="trend-item">
        <div class="token-avatar">${t.ticker.slice(0, 2)}</div>
        <div>
          <div class="token-name">${t.name}</div>
          <div class="token-ticker">${t.ticker}</div>
        </div>
        <div class="trend-right">
          <div class="token-name">${t.price}</div>
          <div class="stat-change ${t.up ? "up" : "down"}">${t.change}</div>
          <div class="trend-vol">${t.vol}</div>
        </div>
      </li>`
      )
      .join("");
  }

  function renderMarkets() {
    const tbody = $("#marketsTable tbody");
    tbody.innerHTML = DEMO.markets
      .map(
        (m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.pair}</strong></td>
        <td>${m.price}</td>
        <td class="${m.up ? "up" : "down"}">${m.change}</td>
        <td>${m.vol}</td>
        <td>${m.liq}</td>
      </tr>`
      )
      .join("");
  }

  function renderTokens() {
    $("#tokenGrid").innerHTML = DEMO.tokens
      .map(
        (t) => `
      <article class="token-card">
        <div class="token-card-top">
          <div class="token-avatar">${t.ticker.slice(0, 2)}</div>
          <div>
            <div class="token-name">${t.name}</div>
            <div class="token-ticker">${t.ticker}</div>
          </div>
        </div>
        <div class="price">${t.price}</div>
        <div class="stat-change ${t.up ? "up" : "down"}">${t.change}</div>
        <div class="trend-vol" style="margin-top:8px">MCap ${t.mcap}</div>
      </article>`
      )
      .join("");
  }

  function drawChart(canvas, values, color = "#7c6cff") {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(180, Math.floor(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = { t: 16, r: 12, b: 24, l: 12 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad.l + (i / (values.length - 1)) * (w - pad.l - pad.r);
      const y = pad.t + (1 - (v - min) / span) * (h - pad.t - pad.b);
      return [x, y];
    });

    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");

    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(pts[pts.length - 1][0], h - pad.b);
    ctx.lineTo(pts[0][0], h - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    ctx.stroke();

    const [lx, ly] = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function setSection(id) {
    $$(".section").forEach((s) => s.classList.toggle("visible", s.id === id));
    $$(".nav-item").forEach((a) => a.classList.toggle("active", a.dataset.section === id));
    if (id === "charts") {
      drawChart($("#detailChart"), DEMO.series[$("#chartAsset").value] || DEMO.series.ADA, "#3dd6c6");
    }
    if (id === "overview") {
      const active = $(".seg-btn.active");
      drawChart($("#priceChart"), DEMO.series[active?.dataset.range || "24h"]);
    }
    closeSidebar();
  }

  function openSidebar() {
    $("#sidebar").classList.add("open");
    $("#backdrop").hidden = false;
  }

  function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#backdrop").hidden = true;
  }

  function filterDemo(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      renderTrending();
      renderTokens();
      renderMarkets();
      return;
    }
    const match = (t) =>
      t.ticker.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.pair || "").toLowerCase().includes(q);

    $("#trendList").innerHTML = DEMO.trending
      .filter(match)
      .map(
        (t) => `
      <li class="trend-item">
        <div class="token-avatar">${t.ticker.slice(0, 2)}</div>
        <div>
          <div class="token-name">${t.name}</div>
          <div class="token-ticker">${t.ticker}</div>
        </div>
        <div class="trend-right">
          <div class="token-name">${t.price}</div>
          <div class="stat-change ${t.up ? "up" : "down"}">${t.change}</div>
        </div>
      </li>`
      )
      .join("") || `<li class="muted" style="padding:12px">No matches for “${query}”</li>`;

    $("#tokenGrid").innerHTML = DEMO.tokens
      .filter(match)
      .map(
        (t) => `
      <article class="token-card">
        <div class="token-card-top">
          <div class="token-avatar">${t.ticker.slice(0, 2)}</div>
          <div>
            <div class="token-name">${t.name}</div>
            <div class="token-ticker">${t.ticker}</div>
          </div>
        </div>
        <div class="price">${t.price}</div>
        <div class="stat-change ${t.up ? "up" : "down"}">${t.change}</div>
      </article>`
      )
      .join("") || `<p class="muted">No tokens match “${query}”</p>`;
  }

  function init() {
    renderStats();
    renderTrending();
    renderMarkets();
    renderTokens();
    drawChart($("#priceChart"), DEMO.series["24h"]);
    drawChart($("#detailChart"), DEMO.series.ADA, "#3dd6c6");

    const now = new Date();
    $("#lastUpdated").textContent = `Updated ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · demo`;

    $$(".nav-item").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setSection(a.dataset.section);
        history.replaceState(null, "", `#${a.dataset.section}`);
      });
    });

    $$(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".seg-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        drawChart($("#priceChart"), DEMO.series[btn.dataset.range]);
      });
    });

    $("#chartAsset").addEventListener("change", (e) => {
      const asset = e.target.value;
      $("#chartTitle").textContent = `${asset} / USD`;
      drawChart($("#detailChart"), DEMO.series[asset] || DEMO.series.ADA, "#3dd6c6");
    });

    ["connectBtn", "connectBtn2"].forEach((id) => {
      $(`#${id}`)?.addEventListener("click", () => {
        showToast("Wallet connect coming soon — this build is demo UI only.");
      });
    });

    $("#searchInput").addEventListener("input", (e) => filterDemo(e.target.value));

    $("#menuBtn").addEventListener("click", () => {
      if ($("#sidebar").classList.contains("open")) closeSidebar();
      else openSidebar();
    });
    $("#backdrop").addEventListener("click", closeSidebar);

    window.addEventListener("resize", () => {
      const activeRange = $(".seg-btn.active")?.dataset.range || "24h";
      drawChart($("#priceChart"), DEMO.series[activeRange]);
      drawChart($("#detailChart"), DEMO.series[$("#chartAsset").value] || DEMO.series.ADA, "#3dd6c6");
    });

    const hash = (location.hash || "#overview").slice(1);
    if (["overview", "markets", "tokens", "portfolio", "charts"].includes(hash)) {
      setSection(hash);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
