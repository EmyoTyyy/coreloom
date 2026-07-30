(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const N = [
    0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2,
    0.12020824702470e5, -0.32325550322333e7, 0.14915108613530e2,
    -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849,
    0.65017534844798e3
  ];

  function psat(tC) {
    const T = Math.min(Math.max(tC, 0.01), 373.94) + 273.15;
    const th = T + N[8] / (T - N[9]);
    const A = th * th + N[0] * th + N[1];
    const B = N[2] * th * th + N[3] * th + N[4];
    const C = N[5] * th * th + N[6] * th + N[7];
    const r = 2 * C / (-B + Math.sqrt(B * B - 4 * A * C));
    return r * r * r * r;
  }

  function tsat(pMPa) {
    const p = Math.min(Math.max(pMPa, 6.11e-4), 22.064);
    const b = Math.sqrt(Math.sqrt(p));
    const E = b * b + N[2] * b + N[5];
    const F = N[0] * b * b + N[3] * b + N[6];
    const G = N[1] * b * b + N[4] * b + N[7];
    const D = 2 * G / (-F - Math.sqrt(F * F - 4 * E * G));
    const k = N[9] + D;
    return (k - Math.sqrt(k * k - 4 * (N[8] + N[9] * D))) / 2 - 273.15;
  }

  function lerp(xs, ys, x) {
    const n = xs.length;
    if (x <= xs[0]) {
      const s = (ys[1] - ys[0]) / (xs[1] - xs[0]);
      return ys[0] + s * (x - xs[0]);
    }
    if (x >= xs[n - 1]) {
      const s = (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2]);
      return ys[n - 1] + s * (x - xs[n - 1]);
    }
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (xs[m] <= x) lo = m; else hi = m;
    }
    const f = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + f * (ys[hi] - ys[lo]);
  }

  const T_RF = [20, 50, 100, 150, 200, 250, 270, 290, 300, 310, 320, 330, 340, 350, 360];
  const RF = [1006.0, 995.6, 965.5, 926.4, 876.0, 810.0, 776.5, 743.5, 723.4, 700.6, 675.3, 646.2, 611.6, 574.7, 528.0];

  const P_RG = [0.1, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18, 20];
  const RG = [0.5903, 2.668, 5.145, 10.04, 15.00, 20.09, 25.35, 30.82, 36.52, 42.51, 48.79, 55.46, 70.11, 87.30, 96.71, 107.4, 119.0, 132.0, 170.2];

  const P_HFG = [0.1, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18, 20];
  const HFG = [2257.5, 2108.0, 2014.6, 1889.8, 1794.9, 1713.5, 1639.7, 1570.9, 1505.2, 1441.4, 1378.9, 1317.1, 1193.6, 1066.5, 1000.0, 930.6, 856.9, 777.8, 591.9];

  const P_HG = [0.1, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18, 20];
  const HG = [2674.9, 2748.1, 2777.1, 2798.3, 2803.2, 2800.8, 2794.2, 2784.6, 2772.6, 2758.7, 2742.9, 2725.5, 2685.6, 2638.1, 2610.9, 2580.8, 2547.5, 2510.6, 2412.3];

  const T_HF = [20, 50, 100, 150, 200, 226, 250, 280, 290, 300, 310, 320, 330, 340, 350, 360];
  const HF = [83.9, 209.3, 419.1, 632.2, 852.4, 972.0, 1085.4, 1236.9, 1289.9, 1345.0, 1402.2, 1462.6, 1527.0, 1596.7, 1673.6, 1761.5];

  const T_CP = [20, 100, 200, 250, 280, 300, 310, 320, 330, 340, 350];
  const CP = [4160, 4200, 4450, 4720, 5020, 5320, 5550, 5850, 6250, 6850, 7900];

  const rhoF = (tC) => lerp(T_RF, RF, tC);
  const rhoG = (p) => lerp(P_RG, RG, p);
  const hfg = (p) => lerp(P_HFG, HFG, p) * 1000;
  const hg = (p) => lerp(P_HG, HG, p) * 1000;
  const hf = (tC) => lerp(T_HF, HF, tC) * 1000;
  const cpL = (tC) => lerp(T_CP, CP, tC);

  function pFromRhoG(rg) {
    const r = Math.min(Math.max(rg, RG[0]), RG[RG.length - 1]);
    return lerp(RG, P_RG, r);
  }

  DH.Steam = { psat, tsat, rhoF, rhoG, hfg, hg, hf, cpL, pFromRhoG, lerp };
})();
