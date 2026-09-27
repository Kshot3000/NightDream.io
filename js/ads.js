/* NightDream.io — advertising layer (AdSense-ready).
 *
 * HOW TO GO LIVE:
 * 1. Apply at https://www.google.com/adsense/ and get approved.
 * 2. Put your publisher ID below (ca-pub-XXXXXXXXXXXXXXXX).
 * 3. Make sure /ads.txt contains:  google.com, pub-<YOUR_ID>, DIRECT, f75f9b6736ff2d3f
 * 4. Commit + push. Slots appear automatically wherever <div class="ad-slot" data-ad="...">
 *    exists. While ADS_CLIENT is empty, every slot stays hidden and no ad script loads.
 *
 * Ad slots are plain containers; this loader injects the AdSense tag + <ins> units.
 * Keep slots out of the way of charts/tables so layout never jumps (CLS-safe:
 * slots reserve min-height only when ads are enabled).
 */
(function () {
  "use strict";

  var ADS_CLIENT = ""; // <-- paste your ca-pub-XXXXXXXXXXXXXXXX here

  // Optional per-slot ad unit IDs (leave empty for Auto ads / default units).
  var AD_UNITS = {
    "ov-top": "",
    "ov-bottom": "",
    "mk-top": "",
    "tk-bottom": "",
    "ft-top": "",
  };

  function ready() {
    if (!ADS_CLIENT) return; // ads disabled until a publisher ID is configured
    var slots = document.querySelectorAll(".ad-slot[data-ad]");
    if (!slots.length) return;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      encodeURIComponent(ADS_CLIENT);
    s.crossOrigin = "anonymous";
    s.onload = function () {
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
    };
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
