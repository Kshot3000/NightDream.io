/* NightDream.xyz — living Cardano background.
 *
 * A fixed full-viewport canvas behind the whole app:
 *   - drifting "₳" glyphs rising like embers
 *   - slowly rotating hexagon outlines (the Cardano motif)
 *   - a drifting node network with glowing block pulses travelling the links
 *   - the occasional shooting streak
 *
 * Subtle by design (low alpha, sparse) so text stays readable. Pauses when the
 * tab is hidden and renders a single static frame when the user prefers
 * reduced motion.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0;
  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var running = true;
  var last = 0;
  var scrollY = 0;

  // Cardano blue / teal / violet
  var PALETTE = [[58, 110, 255], [46, 230, 197], [139, 124, 255]];
  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
  }

  var glyphs = [], hexes = [], nodes = [], pulses = [], streaks = [];
  var LINK = 150;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function seed() {
    glyphs = []; hexes = []; nodes = []; pulses = []; streaks = [];
    var area = (W * H) / 10000;
    var nG = Math.min(24, Math.max(10, Math.round(area * 0.8)));
    for (var i = 0; i < nG; i++) {
      glyphs.push({
        x: rnd(0, W), y: rnd(0, H),
        s: rnd(14, 44), v: rnd(6, 20),
        a: rnd(0.05, 0.14), c: PALETTE[i % 3],
        drift: rnd(-8, 8), ph: rnd(0, 6.28), depth: rnd(0.3, 1)
      });
    }
    var nH = Math.min(8, Math.max(4, Math.round(area * 0.24)));
    for (var j = 0; j < nH; j++) {
      hexes.push({
        x: rnd(0, W), y: rnd(0, H),
        r: rnd(26, 86), rot: rnd(0, 6.28),
        vr: rnd(-0.0016, 0.0016), a: rnd(0.05, 0.11),
        c: PALETTE[(j + 1) % 3]
      });
    }
    var nN = Math.min(44, Math.max(18, Math.round(area * 1.3)));
    for (var k = 0; k < nN; k++) {
      nodes.push({
        x: rnd(0, W), y: rnd(0, H),
        vx: rnd(-0.22, 0.22), vy: rnd(-0.22, 0.22),
        r: rnd(1, 2.6), c: PALETTE[k % 3], tw: rnd(0, 6.28)
      });
    }
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
    if (reduced) draw(0, 16);
  }

  function hexPath(x, y, r, rot) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = rot + (Math.PI / 3) * i - Math.PI / 6;
      var px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function spawnPulse() {
    if (pulses.length > 5 || nodes.length < 2) return;
    var a = nodes[(Math.random() * nodes.length) | 0];
    var best = null, bestD = LINK * LINK;
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      if (b === a) continue;
      var dx = b.x - a.x, dy = b.y - a.y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best) pulses.push({ a: a, b: best, t: 0, sp: rnd(0.008, 0.016), c: a.c });
  }

  function spawnStreak() {
    if (streaks.length > 2) return;
    var fromLeft = Math.random() < 0.5;
    streaks.push({
      x: fromLeft ? -60 : rnd(0, W), y: rnd(0, H * 0.5),
      vx: rnd(280, 520) * (fromLeft ? 1 : -1), vy: rnd(60, 140),
      life: 1, c: PALETTE[(Math.random() * 3) | 0]
    });
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    var i, j;

    // Rotating hexagons
    for (i = 0; i < hexes.length; i++) {
      var h = hexes[i];
      h.rot += h.vr * dt;
      ctx.strokeStyle = rgba(h.c, h.a);
      ctx.lineWidth = 1.2;
      hexPath(h.x, h.y, h.r, h.rot);
      ctx.stroke();
      ctx.strokeStyle = rgba(h.c, h.a * 0.5);
      hexPath(h.x, h.y, h.r * 0.62, -h.rot * 1.4);
      ctx.stroke();
    }

    // Node network links
    var link2 = LINK * LINK;
    ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      var n1 = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        var n2 = nodes[j];
        var dx = n1.x - n2.x, dy = n1.y - n2.y, d2 = dx * dx + dy * dy;
        if (d2 < link2) {
          var al = 0.10 * (1 - Math.sqrt(d2) / LINK);
          ctx.strokeStyle = rgba(n1.c, al);
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx * dt / 16; n.y += n.vy * dt / 16;
      n.tw += dt / 900;
      if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
      if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
      var tw = 0.35 + 0.3 * Math.sin(n.tw);
      ctx.fillStyle = rgba(n.c, tw);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, 6.283);
      ctx.fill();
    }

    // Travelling block pulses
    if (Math.random() < dt / 2400) spawnPulse();
    for (i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i];
      p.t += p.sp * dt / 16;
      if (p.t >= 1) { pulses.splice(i, 1); continue; }
      var px = p.a.x + (p.b.x - p.a.x) * p.t;
      var py = p.a.y + (p.b.y - p.a.y) * p.t;
      var glow = Math.sin(p.t * Math.PI);
      ctx.fillStyle = rgba(p.c, 0.75 * glow);
      ctx.beginPath();
      ctx.arc(px, py, 2.6, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = rgba(p.c, 0.18 * glow);
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, 6.283);
      ctx.fill();
    }

    // Rising ₳ glyphs (parallax against scroll)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (i = 0; i < glyphs.length; i++) {
      var g = glyphs[i];
      g.y -= (g.v * dt) / 1000;
      g.ph += dt / 1600;
      g.x += Math.sin(g.ph) * g.drift * dt / 1000;
      if (g.y < -60) { g.y = H + 60; g.x = rnd(0, W); }
      var gy = g.y - scrollY * 0.06 * g.depth;
      var flick = 0.75 + 0.25 * Math.sin(g.ph * 2);
      ctx.font = "600 " + Math.round(g.s) + 'px "Inter", system-ui, sans-serif';
      ctx.fillStyle = rgba(g.c, g.a * flick);
      ctx.fillText("₳", g.x, gy);
    }

    // Occasional shooting streaks
    if (Math.random() < dt / 9000) spawnStreak();
    for (i = streaks.length - 1; i >= 0; i--) {
      var s = streaks[i];
      s.x += (s.vx * dt) / 1000;
      s.y += (s.vy * dt) / 1000;
      s.life -= dt / 1400;
      if (s.life <= 0 || s.x < -120 || s.x > W + 120) { streaks.splice(i, 1); continue; }
      var len = 90 * s.life;
      var ang = Math.atan2(s.vy, s.vx);
      var grad = ctx.createLinearGradient(s.x, s.y, s.x - Math.cos(ang) * len, s.y - Math.sin(ang) * len);
      grad.addColorStop(0, rgba(s.c, 0.5 * s.life));
      grad.addColorStop(1, rgba(s.c, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - Math.cos(ang) * len, s.y - Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  function frame(t) {
    if (!running) return;
    var dt = Math.min(50, t - last || 16);
    last = t;
    draw(t, dt);
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { running = false; }
    else if (!reduced) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  });
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", function () { scrollY = window.scrollY || 0; }, { passive: true });

  resize();
  scrollY = window.scrollY || 0;
  if (!reduced) requestAnimationFrame(frame);
})();
