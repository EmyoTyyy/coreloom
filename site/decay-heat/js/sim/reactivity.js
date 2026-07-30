(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const S = DH.Steam;

  const T_REF = 292;
  const TF_REF = 300;
  const D_REF = S.rhoF(T_REF);

  const K1 = 16500;
  const K2 = -20000;
  const BORON_WORTH = 10;
  const ALPHA_F = -2.5;

  const BANK_WORTH = 8000;
  const SD_WORTH = 5000;

  // 40% linear + 60% sine-shaped differential worth: flat at the ends, ~128 pcm/step mid-bank
  function bankShape(p) {
    const x = Math.min(Math.max(p, 0), 100) / 100;
    return 0.4 * x + 0.6 * (x - Math.sin(2 * Math.PI * x) / (2 * Math.PI));
  }

  function bankDiff(p) {
    const x = Math.min(Math.max(p, 0), 100) / 100;
    return (BANK_WORTH / 100) * (0.4 + 0.6 * (1 - Math.cos(2 * Math.PI * x)));
  }

  const rodWorth = (p) => -BANK_WORTH * (1 - bankShape(p));
  const sdWorth = (ins) => -SD_WORTH * Math.min(Math.max(ins, 0), 1);

  function moderator(tMod) {
    const u = (S.rhoF(tMod) - D_REF) / D_REF;
    return K1 * u + K2 * u * u;
  }

  function boron(ppm, tMod) {
    return -BORON_WORTH * ppm * (S.rhoF(tMod) / D_REF);
  }

  const doppler = (tFuel) => ALPHA_F * (tFuel - TF_REF);

  function mtc(tMod, ppm) {
    const h = 0.5;
    const a = moderator(tMod - h) + boron(ppm, tMod - h);
    const b = moderator(tMod + h) + boron(ppm, tMod + h);
    return (b - a) / (2 * h);
  }

  function total(st, core) {
    const rMod = moderator(st.tAvg);
    const rBor = boron(st.boron, st.tAvg);
    const rDop = doppler(st.tFuel);
    const rRod = rodWorth(st.bankD) + sdWorth(st.sdBank);
    const rXe = DH.Xenon.xeWorth(st.fp, core.xePeak);
    const rSm = DH.Xenon.smWorth(st.fp, core.smPeak);
    const r = core.excess + rMod + rBor + rDop + rRod + rXe + rSm + st.rhoExt;
    return {
      total: r,
      mod: rMod,
      boron: rBor,
      doppler: rDop,
      rods: rRod,
      xenon: rXe,
      samarium: rSm,
      ext: st.rhoExt
    };
  }

  // beta_eff falls and the core gets hotter-running as Pu-239 builds in
  function betaFor(burnup) {
    return 0.0065 + (0.0050 - 0.0065) * Math.min(Math.max(burnup, 0), 1);
  }

  DH.React = {
    total, moderator, boron, doppler, rodWorth, sdWorth, bankShape, bankDiff,
    mtc, betaFor, T_REF, TF_REF, D_REF, BANK_WORTH, SD_WORTH, BORON_WORTH, ALPHA_F
  };
})();
