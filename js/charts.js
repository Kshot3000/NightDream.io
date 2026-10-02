/* NightDream.xyz — lightweight canvas charts (no deps) */
window.NDCharts = (function () {
  const COLORS = {
    line: "#8b7cff",
    line2: "#2ee6c5",
    fill: "rgba(139,124,255,0.18)",
    fillUp: "rgba(46,230,197,0.15)",
    fillDown: "rgba(255,107,122,0.12)",
    grid: "rgba(255,255,255,0.05)",
    text: "#8b91a8",
    up: "#2ee6c5",
    down: "#ff6b7a",
  };

  function sliceRange(series, range) {
    if (!series || !series.length) return [];
    const n = series.length;
    const map = { "1H": Math.max(8, Math.floor(n / 24)), "24H": Math.max(24, Math.floor(n / 7)), "7D": Math.floor(n / 2), "30D": n, "ALL": n };
    const take = map[range] || n;
    return series.slice(-take);
  }

  function drawLineChart(canvas, series, opts = {}) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 260;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const data = sliceRange(series, opts.range || "7D");
    const lineLabel = opts.chartLabel || "Price chart";
    if (data.length < 2) {
      ctx.fillStyle = COLORS.text;
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.fillText("No chart data", 16, h / 2);
      describeChart(canvas, lineLabel, null);
      return;
    }
    // a11y text summary of the plotted data
    {
      const vals2 = data.map((d) => d.v);
      const first = vals2[0], last = vals2[vals2.length - 1];
      const hi = Math.max(...vals2), lo = Math.min(...vals2);
      const chg = first ? ((last - first) / Math.abs(first)) * 100 : 0;
      describeChart(canvas, lineLabel,
        `Range ${opts.range || "7D"}: latest $${exactVal(last)}, ${chg >= 0 ? "up" : "down"} ${Math.abs(chg).toFixed(2)}%, high $${exactVal(hi)}, low $${exactVal(lo)}.`);
    }

    const pad = { t: 16, r: 16, b: 28, l: 52 };
    const vals = data.map((d) => d.v);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    const span = max - min || max * 0.01 || 1;
    min -= span * 0.08;
    max += span * 0.08;

    const x0 = pad.l, y0 = pad.t, cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const up = data[data.length - 1].v >= data[0].v;
    const stroke = opts.color || (up ? COLORS.up : COLORS.down);
    const fillCol = opts.fill || (up ? COLORS.fillUp : COLORS.fillDown);

    // grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = y0 + (ch * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + cw, y);
      ctx.stroke();
      const val = max - ((max - min) * i) / 4;
      ctx.fillStyle = COLORS.text;
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatAxis(val), x0 - 8, y + 4);
    }

    function X(i) { return x0 + (cw * i) / (data.length - 1); }
    function Y(v) { return y0 + ch * (1 - (v - min) / (max - min)); }

    // fill
    ctx.beginPath();
    ctx.moveTo(X(0), Y(data[0].v));
    for (let i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i].v));
    ctx.lineTo(X(data.length - 1), y0 + ch);
    ctx.lineTo(X(0), y0 + ch);
    ctx.closePath();
    ctx.fillStyle = fillCol;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.moveTo(X(0), Y(data[0].v));
    for (let i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i].v));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // end dot
    const lx = X(data.length - 1), ly = Y(data[data.length - 1].v);
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = stroke;
    ctx.fill();

    if (opts.crosshair !== false) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const idx = Math.round(((mx - x0) / cw) * (data.length - 1));
        if (idx < 0 || idx >= data.length) return;
        drawLineChart(canvas, series, { ...opts, _hover: idx });
        if (opts.onHover) opts.onHover(data[idx], idx);
      };
      canvas.onmouseleave = () => {
        drawLineChart(canvas, series, { ...opts, _hover: null });
        if (opts.onHover) opts.onHover(null);
      };
    }

    if (opts._hover != null && data[opts._hover]) {
      const i = opts._hover;
      const hx = X(i), hy = Y(data[i].v);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, y0);
      ctx.lineTo(hx, y0 + ch);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
  }

  function formatAxis(v) {
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "K";
    if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(1);
    if (Math.abs(v) < 1) return v.toFixed(4);
    return v.toFixed(2);
  }

  /* a11y: give every canvas chart a text equivalent for screen readers.
     Values are exact (never abbreviated) so the label carries real information. */
  function exactVal(v) {
    if (v == null || !isFinite(v)) return "—";
    const av = Math.abs(v);
    if (av >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (av >= 1) return v.toFixed(2);
    if (av > 0 && av < 0.0001) return v.toExponential(2);
    return String(+v.toPrecision(4));
  }
  function describeChart(canvas, label, summary) {
    if (!canvas) return;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", summary ? `${label}. ${summary}` : `${label}. No data available.`);
  }

  function drawBars(canvas, items, opts = {}) {
    if (!canvas || !items) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = { t: 8, r: 12, b: 8, l: 72 };
    const max = Math.max(...items.map((i) => i.pct || i.value || 0), 1);
    const rowH = (h - pad.t - pad.b) / items.length;

    items.forEach((item, i) => {
      const y = pad.t + i * rowH + 4;
      const bh = rowH - 10;
      const val = item.pct != null ? item.pct : item.value;
      const bw = ((w - pad.l - pad.r) * val) / max;
      ctx.fillStyle = COLORS.text;
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(item.label || item.name, pad.l - 8, y + bh / 2 + 4);
      const grad = ctx.createLinearGradient(pad.l, 0, pad.l + bw, 0);
      grad.addColorStop(0, "#8b7cff");
      grad.addColorStop(1, "#2ee6c5");
      ctx.fillStyle = grad;
      ctx.beginPath();
      roundRect(ctx, pad.l, y, Math.max(bw, 2), bh, 4);
      ctx.fill();
      ctx.fillStyle = "#e9ebf5";
      ctx.textAlign = "left";
      ctx.fillText((item.pct != null ? (+item.pct).toFixed(1) + "%" : String(val)), pad.l + bw + 6, y + bh / 2 + 4);
    });
    // a11y text summary of the bars
    {
      const top = items.slice(0, 5).map((i) =>
        `${i.label || i.name || "item"} ${(i.pct != null ? i.pct.toFixed(1) + "%" : String(i.value))}`);
      describeChart(canvas, opts.chartLabel || "Bar chart",
        items.length ? `Top entries: ${top.join(", ")}.` : null);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawDonut(canvas, slices, opts = {}) {
    if (!canvas || !slices) { describeChart(canvas, opts.chartLabel || "Donut chart", null); return; }
    // a11y text summary of the slices
    {
      const top = slices.slice(0, 5).map((s) => `${s.label} ${(+s.pct).toFixed(1)}%`);
      describeChart(canvas, opts.chartLabel || "Donut chart",
        slices.length ? `Largest shares: ${top.join(", ")}.` : null);
    }
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 180;
    const h = canvas.clientHeight || 180;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;
    const total = slices.reduce((s, x) => s + x.pct, 0) || 1;
    const palette = ["#8b7cff", "#2ee6c5", "#ffb020", "#ff6b7a", "#5b8cff", "#c084fc", "#34d399", "#94a3b8"];
    let ang = -Math.PI / 2;
    slices.forEach((sl, i) => {
      const a = (sl.pct / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, ang, ang + a);
      ctx.closePath();
      ctx.fillStyle = palette[i % palette.length];
      ctx.fill();
      ang += a;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = "#11131d";
    ctx.fill();
  }


  /* OHLC candlesticks: candles = [{t,o,h,l,c}] */
  function drawCandles(canvas, candles, opts = {}) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 260;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!candles || candles.length < 2) {
      ctx.fillStyle = COLORS.text;
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.fillText("No candle data", 16, h / 2);
      describeChart(canvas, opts.chartLabel || "Price chart", null);
      return;
    }
    const data = candles.slice(-120);
    // a11y text summary of the plotted candles
    {
      const first = data[0], last = data[data.length - 1];
      const hi = Math.max(...data.map((c) => c.h));
      const lo = Math.min(...data.map((c) => c.l));
      const chg = first.o ? ((last.c - first.o) / Math.abs(first.o)) * 100 : 0;
      describeChart(canvas, opts.chartLabel || "Price chart",
        `${data.length} candles, range ${opts.range || "30D"}: opened $${exactVal(first.o)}, closed $${exactVal(last.c)}, ${chg >= 0 ? "up" : "down"} ${Math.abs(chg).toFixed(2)}%, high $${exactVal(hi)}, low $${exactVal(lo)}.`);
    }
    const pad = { t: 16, r: 16, b: 28, l: 56 };
    let min = Infinity, max = -Infinity;
    data.forEach((c) => { min = Math.min(min, c.l); max = Math.max(max, c.h); });
    const span = max - min || max * 0.01 || 1;
    min -= span * 0.08; max += span * 0.08;
    const x0 = pad.l, y0 = pad.t, cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const step = cw / data.length;
    const bw = Math.max(2, Math.min(14, step * 0.62));
    function Y(v) { return y0 + ch * (1 - (v - min) / (max - min)); }
    // grid
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    ctx.fillStyle = COLORS.text; ctx.font = "11px Inter, system-ui, sans-serif"; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const y = y0 + (ch * i) / 4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + cw, y); ctx.stroke();
      const val = max - ((max - min) * i) / 4;
      ctx.fillText(formatAxis(val), x0 - 8, y + 4);
    }
    // candles
    data.forEach((c, i) => {
      const x = x0 + step * (i + 0.5);
      const up = c.c >= c.o;
      const col = up ? COLORS.up : COLORS.down;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, Y(c.h)); ctx.lineTo(x, Y(c.l)); ctx.stroke();
      const yO = Y(c.o), yC = Y(c.c);
      const top = Math.min(yO, yC), bh = Math.max(2, Math.abs(yC - yO));
      ctx.fillRect(x - bw / 2, top, bw, bh);
    });
    // time labels
    ctx.fillStyle = COLORS.text; ctx.textAlign = "center";
    const every = Math.ceil(data.length / 6);
    data.forEach((c, i) => {
      if (i % every) return;
      const d = new Date(c.t);
      ctx.fillText(d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" }), x0 + step * (i + 0.5), h - 8);
    });
    // hover
    if (opts.crosshair !== false) {
      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const idx = Math.floor(((e.clientX - rect.left) - x0) / step);
        if (idx < 0 || idx >= data.length) return;
        drawCandles(canvas, candles, { ...opts, _hover: idx, crosshair: true });
        if (opts.onHover) opts.onHover(data[idx]);
      };
      canvas.onmouseleave = () => {
        drawCandles(canvas, candles, { ...opts, _hover: null, crosshair: true });
        if (opts.onHover) opts.onHover(null);
      };
    }
    if (opts._hover != null && data[opts._hover]) {
      const c = data[opts._hover];
      const x = x0 + step * (opts._hover + 0.5);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + ch); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawSparkline(canvas, series, up) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 72;
    const h = canvas.clientHeight || 28;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!series || series.length < 2) return;
    const data = series.slice(-36);
    const vals = data.map((d) => d.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const color = up ? COLORS.up : COLORS.down;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((d.v - min) / span) * (h - 4);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  return { drawLineChart, drawBars, drawDonut, drawSparkline, drawCandles, sliceRange, COLORS };
})();
