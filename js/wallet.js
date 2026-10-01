/* NightDream — CIP-30 wallet connect + live portfolio.
   Discovery via window.cardano (Nami, Eternl, Lace, Flint, Vespr, …).
   Balances resolved through Koios (address_info → stake → account_assets),
   priced via CoinGecko cache / DexScreener. No private keys ever touched. */
window.WALLET = (function () {
  const INSTALL = {
    // nami omitted: namiwallet.io now serves the Lace site (Nami sunset into Lace) — covered below
    eternl: "https://eternl.io",
    lace: "https://www.lace.io",
    flint: "https://chromewebstore.google.com/detail/flint/hnhobjmcibchnmglfbldbfabcgaknlkj",
    vespr: "https://www.vespr.xyz",
    typhon: "https://typhonwallet.io",
    gero: "https://gerowallet.io",
  };

  const state = {
    connected: false, providerKey: null, providerName: null,
    address: null, stake: null, positions: [], nfts: [],
    totalUsd: 0, adaUsd: 0, updatedAt: 0, loading: false, error: null,
    watchOnly: [], // extra bech32 addresses tracked
  };

  /* ——— bech32 (encode only) ——— */
  const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  function polymod(values) {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of values) {
      const b = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ v;
      for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
    }
    return chk;
  }
  function hrpExpand(hrp) {
    const out = [];
    for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
    out.push(0);
    for (const c of hrp) out.push(c.charCodeAt(0) & 31);
    return out;
  }
  function convertBits(data, from, to, pad) {
    let acc = 0, bits = 0;
    const out = [];
    const maxv = (1 << to) - 1;
    for (const v of data) {
      acc = (acc << from) | v;
      bits += from;
      while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv); }
    }
    if (pad) { if (bits > 0) out.push((acc << (to - bits)) & maxv); }
    else if (bits >= from || ((acc << (to - bits)) & maxv)) return null;
    return out;
  }
  function bech32Encode(hrp, hexBytes) {
    const bytes = [];
    for (let i = 0; i < hexBytes.length; i += 2) bytes.push(parseInt(hexBytes.slice(i, i + 2), 16));
    const data = convertBits(bytes, 8, 5, true);
    const chk = polymod(hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0])) ^ 1;
    let out = hrp + "1";
    for (const d of data.concat([0, 0, 0, 0, 0, 0].map((_, i) => (chk >> (5 * (5 - i))) & 31))) out += CHARSET[d];
    return out;
  }

  /* ——— discovery ——— */
  function providers() {
    const w = window.cardano || {};
    return Object.keys(w)
      .filter((k) => w[k] && typeof w[k].enable === "function")
      .map((k) => ({ key: k, name: w[k].name || k, icon: w[k].icon || null, api: w[k] }));
  }

  function shortAddr(a) {
    return a ? a.slice(0, 12) + "…" + a.slice(-8) : "—";
  }

  /* ——— connect ——— */
  async function connect(key) {
    const w = (window.cardano || {})[key];
    if (!w) throw new Error("not found");
    const api = await w.enable(); // triggers wallet permission popup
    const net = await api.getNetworkId().catch(() => 1);
    if (net !== 1) throw new Error("Please switch your wallet to Cardano mainnet");
    const used = await api.getUsedAddresses().catch(() => []);
    const unused = await api.getUnusedAddresses().catch(() => []);
    const reward = await api.getRewardAddresses().catch(() => []);
    const payHex = used[0] || unused[0];
    if (!payHex) throw new Error("No addresses returned by wallet");
    const address = bech32Encode("addr", payHex);
    const stake = reward[0] ? bech32Encode("stake", reward[0]) : null;
    state.connected = true;
    state.providerKey = key;
    state.providerName = w.name || key;
    state.address = address;
    state.stake = stake;
    state.error = null;
    try { localStorage.setItem("nd.wallet.provider", key); } catch (_) {}
    await refresh();
    return state;
  }

  function disconnect() {
    state.connected = false; state.providerKey = null; state.address = null;
    state.stake = null; state.positions = []; state.nfts = []; state.totalUsd = 0;
    try { localStorage.removeItem("nd.wallet.provider"); } catch (_) {}
  }

  async function addWatchOnly(addr) {
    addr = (addr || "").trim();
    if (!/^((addr1|stake1)[a-z0-9]+)$/.test(addr)) throw new Error("Enter a valid addr1… or stake1… address");
    if (!state.watchOnly.includes(addr)) state.watchOnly.push(addr);
    try { localStorage.setItem("nd.wallet.watchonly", JSON.stringify(state.watchOnly)); } catch (_) {}
    await refresh();
  }

  /* ——— portfolio build ——— */
  async function refresh() {
    state.loading = true; state.error = null;
    try {
      const ada = await window.LIVE.adaPrice();
      state.adaUsd = ada ? ada.price : 0;

      // gather stake addresses: connected wallet + watch-only stakes/addrs
      let stakes = [];
      const addrs = [];
      if (state.address) addrs.push(state.address);
      for (const w of state.watchOnly) {
        if (w.startsWith("stake1")) stakes.push(w);
        else addrs.push(w);
      }
      if (state.stake) stakes.push(state.stake);
      // resolve payment addrs → stake via address_info
      if (addrs.length) {
        const infos = await window.LIVE.koiosAddressInfo(addrs);
        if (infos) for (const i of infos) {
          if (i.stake_address && !stakes.includes(i.stake_address)) stakes.push(i.stake_address);
        }
      }
      stakes = [...new Set(stakes)];
      if (!stakes.length && addrs.length) {
        // enterprise addresses (no stake): fall back to per-address balances
        const infos = await window.LIVE.koiosAddressInfo(addrs);
        return buildFromAddressInfo(infos || []);
      }
      const assets = await window.LIVE.koiosAccountAssets(stakes);
      if (!assets) throw new Error("Koios unreachable — try again in a moment");
      await buildFromAccountAssets(assets);
    } catch (e) {
      state.error = e.message || "Failed to load portfolio";
    } finally {
      state.loading = false;
      state.updatedAt = Date.now();
    }
  }

  function qtyOf(a) { return Number(a.quantity || 0); }

  async function buildFromAccountAssets(assets) {
    const byUnit = new Map(); // unit → qty
    let lovelace = 0;
    for (const a of assets) {
      const q = qtyOf(a);
      if (!a.policy_id) lovelace += q;
      else {
        const unit = a.policy_id + (a.asset_name || "");
        byUnit.set(unit, (byUnit.get(unit) || 0) + q);
      }
    }
    await pricePositions(byUnit, lovelace);
  }

  async function buildFromAddressInfo(infos) {
    const byUnit = new Map();
    let lovelace = 0;
    for (const i of infos) {
      lovelace += Number(i.balance || 0);
      for (const u of i.utxo_set || []) {
        for (const m of u.asset_list || []) {
          const unit = m.policy_id + (m.asset_name || "");
          byUnit.set(unit, (byUnit.get(unit) || 0) + Number(m.quantity || 0));
        }
      }
    }
    await pricePositions(byUnit, lovelace);
  }

  async function pricePositions(byUnit, lovelace) {
    const positions = [], nfts = [];
    const adaUsd = state.adaUsd;
    if (lovelace > 0) {
      positions.push({
        unit: "lovelace", ticker: "ADA", name: "Cardano",
        qty: lovelace / 1e6, decimals: 6,
        price: adaUsd, value: (lovelace / 1e6) * adaUsd, ch24: null, image: null,
      });
    }
    const jobs = [];
    for (const [unit, rawQty] of byUnit) {
      jobs.push((async () => {
        const uni = window.NDU.byUnit[unit];
        let decimals = 0, ticker = null, name = null, image = null;
        if (uni) {
          const info = await window.LIVE.koiosAsset(uni.policy, uni.asset);
          const reg = (info && info.token_registry_metadata) || {};
          decimals = info && info.decimals != null ? Number(info.decimals)
            : reg.decimals != null ? Number(reg.decimals) : 0;
          ticker = uni.ticker; name = uni.name;
        } else {
          // unknown: guess decimals via Koios, treat qty==1 as NFT
          const pol = unit.slice(0, 56), an = unit.slice(56);
          const info = await window.LIVE.koiosAsset(pol, an).catch(() => null);
          decimals = info && info.decimals != null ? Number(info.decimals) : 0;
          const reg = info && (info.token_registry_metadata || info.minting_tx_metadata);
          name = (info && info.asset_name_ascii) || unit.slice(0, 12) + "…";
          ticker = name.slice(0, 10).toUpperCase();
        }
        const qty = rawQty / Math.pow(10, decimals);
        const px = await window.LIVE.priceForUnit(unit, adaUsd);
        const price = px ? px.usd : 0;
        const isNft = !uni && rawQty === 1;
        const row = {
          unit, ticker: ticker || (px && px.ticker) || unit.slice(0, 8).toUpperCase(),
          name: name || (px && px.name) || "Unknown token",
          qty, decimals, price, value: qty * price,
          ch24: px ? px.ch24 : null, image: (px && px.image) || image,
        };
        if (isNft) nfts.push({ ...row, name: row.name });
        else positions.push(row);
      })());
    }
    // bounded concurrency
    const CHUNK = 6;
    for (let i = 0; i < jobs.length; i += CHUNK) await Promise.all(jobs.slice(i, i + CHUNK));
    positions.sort((a, b) => b.value - a.value);
    state.positions = positions;
    state.nfts = nfts;
    state.totalUsd = positions.reduce((s, p) => s + p.value, 0);
  }

  async function tradeHistory(limit) {
    const addr = state.address || state.watchOnly.find((w) => w.startsWith("addr1"));
    if (!addr) return null;
    return window.LIVE.koiosAddressTxs(addr, limit || 25);
  }

  function restore() {
    try {
      const w = JSON.parse(localStorage.getItem("nd.wallet.watchonly") || "[]");
      if (Array.isArray(w)) state.watchOnly = w;
    } catch (_) {}
  }
  restore();

  return {
    state, providers, connect, disconnect, refresh, addWatchOnly,
    tradeHistory, shortAddr, INSTALL,
  };
})();
