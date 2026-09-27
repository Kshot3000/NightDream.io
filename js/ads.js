/* NightDream.xyz — advertising layer (AdSense LIVE since 2026-09-27).
 *
 * Publisher: ca-pub-3316742664595468 (verified).
 * The AdSense library tag + google-adsense-account meta tag live in <head>
 * (index.html) per Google's instructions; this loader only fills the slots.
 * It injects the library tag itself ONLY as a fallback if <head> lacks it —
 * never load adsbygoogle.js twice.
 * /ads.txt: google.com, pub-3316742664595468, DIRECT, f08c47fec0942fa0
 *
 * Ad slots are plain containers; this loader injects the AdSense tag + <ins> units.
 * Keep slots out of the way of charts/tables so layout never jumps (CLS-safe:
 * slots reserve min-height only when ads are enabled).
 */
(function () {
  "use strict";

  var ADS_CLIENT = "ca-pub-3316742664595468"; // AdSense publisher ID (live)

  // Optional per-slot ad unit IDs (leave empty for Auto ads / default units).
  var AD_UNITS = {
    "ov-top": "",
    "ov-bottom": "",
    "mk-top": "",
    "tk-bottom": "",
    "ft-top": "",
  };

  function setupSlots() {
    var slots = document.querySelectorAll(".ad-slot[data-ad]");
    if (!slots.length) return;
    slots.forEach(function (el) {
      var key = el.getAttribute("data-ad");
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", ADS_CLIENT);
      if (AD_UNITS[key]) ins.setAttribute("data-ad-slot", AD_UNITS[key]);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      var label = document.createElement("span");
      label.className = "ad-label";
      label.textContent = "Advertisement";
      el.appendChild(label);
      el.appendChild(ins);
      el.classList.add("ad-live");
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  }

  function ready() {
    if (!ADS_CLIENT) return; // ads disabled until a publisher ID is configured
    // The AdSense library tag lives in <head> (see index.html). Only inject it
    // here as a fallback if some page forgot it — never load it twice.
    var existing = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]');
    if (existing) { setupSlots(); return; }

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      encodeURIComponent(ADS_CLIENT);
    s.crossOrigin = "anonymous";
    s.onload = setupSlots;
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
