(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  // Wigner-Way, infinite-irradiation form. tOp is the irradiation time before shutdown.
  function analytic(t, tOp) {
    const ts = Math.max(t, 1e-3);
    const op = tOp === undefined ? 1e12 : tOp;
    return 0.0622 * (Math.pow(ts, -0.2) - Math.pow(ts + op, -0.2));
  }

  // Exponential-group expansion of 0.0622*t^-0.2, truncated at the top so the
  // t->0 sum equals the 7% of fission energy that is actually delayed.
  const TOTAL = 0.070;
  const LAM_MAX = 0.6696;
  const LAM_MIN = 1e-13;

  const LAM = [];
  for (let l = LAM_MAX; l > LAM_MIN; l /= Math.sqrt(10)) LAM.push(l);

  const W = LAM.map((l) => Math.pow(l, 0.2));
  const WSUM = W.reduce((a, b) => a + b, 0);
  const B = W.map((w) => (TOTAL * w) / WSUM);
  const A = B.map((b, i) => b * LAM[i]);

  function create(n0) {
    const n = n0 === undefined ? 1 : n0;
    return { d: B.map((b) => b * n), lam: LAM };
  }

  function step(dh, n, dt) {
    let sum = 0;
    for (let i = 0; i < LAM.length; i++) {
      const e = Math.exp(-LAM[i] * dt);
      dh.d[i] = dh.d[i] * e + (A[i] * n / LAM[i]) * (1 - e);
      sum += dh.d[i];
    }
    return sum;
  }

  function total(dh) {
    let s = 0;
    for (let i = 0; i < dh.d.length; i++) s += dh.d[i];
    return s;
  }

  // scale a fresh core to an arbitrary fraction of the equilibrium inventory
  function setEquilibrium(dh, n) {
    for (let i = 0; i < LAM.length; i++) dh.d[i] = B[i] * n;
  }

  DH.Decay = { create, step, total, setEquilibrium, analytic, TOTAL, LAM, B };
})();
