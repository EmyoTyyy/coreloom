(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const LAM = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01];
  const FRAC = [0.033, 0.219, 0.196, 0.395, 0.115, 0.042];
  const GEN = 2e-5;
  const SRC = 2.5e-6;

  function create(beta, n0) {
    const bi = FRAC.map((f) => f * beta);
    const n = n0 === undefined ? 1 : n0;
    return {
      n: n,
      c: bi.map((b, i) => (b * n) / (LAM[i] * GEN)),
      beta: beta,
      bi: bi,
      gen: GEN,
      src: SRC,
      substeps: 1,
      implicit: false
    };
  }

  function setBeta(k, beta) {
    k.beta = beta;
    for (let i = 0; i < 6; i++) k.bi[i] = FRAC[i] * beta;
  }

  function sums(k, h) {
    let S = 0, R = 0;
    for (let i = 0; i < 6; i++) {
      const d = 1 + h * LAM[i];
      S += (LAM[i] * k.c[i]) / d;
      R += (LAM[i] * k.bi[i]) / d;
    }
    return [S, R];
  }

  function advanceC(k, h, n) {
    for (let i = 0; i < 6; i++) {
      k.c[i] = (k.c[i] + (h * k.bi[i] * n) / k.gen) / (1 + h * LAM[i]);
    }
  }

  function promptJump(k, rho, h) {
    const [S, R] = sums(k, h);
    const den = Math.max(k.beta - rho - h * R, 1e-7);
    const n = Math.max((k.gen * (S + k.src)) / den, 1e-16);
    advanceC(k, h, n);
    k.n = n;
  }

  function implicit(k, rho, h) {
    const [S, R] = sums(k, h);
    const a = (rho - k.beta) / k.gen;
    const D = 1 - h * a - (h * h * R) / k.gen;
    const n = Math.max((k.n + h * (S + k.src)) / Math.max(D, 1e-6), 1e-16);
    advanceC(k, h, n);
    k.n = n;
  }

  // fb(n, h) advances the prompt feedback nodes and returns the reactivity for the next substep.
  // Prompt jump is valid wherever the prompt population equilibrates fast, which is everywhere
  // except on approach to prompt critical -- deep subcriticality is its most accurate regime.
  function step(k, rho, dt, fb) {
    const stiff = rho > 0.3 * k.beta;
    k.implicit = stiff;
    if (!stiff) {
      k.substeps = 1;
      promptJump(k, rho, dt);
      if (fb) rho = fb(k.n, dt);
      return rho;
    }
    let left = dt, guard = 0;
    while (left > 1e-12 && guard < 2400) {
      const rate = Math.max(Math.abs(rho - k.beta) / k.gen, 1e-6);
      const h = Math.min(left, Math.max(0.2 / rate, 1e-5));
      implicit(k, rho, h);
      if (fb) rho = fb(k.n, h);
      left -= h;
      guard++;
    }
    k.substeps = guard;
    return rho;
  }

  // (1/n)(dn/dt) expressed in decades per minute
  function startupRate(nNow, nPrev, dt) {
    if (nNow <= 0 || nPrev <= 0 || dt <= 0) return 0;
    return (Math.log10(nNow / nPrev) / dt) * 60;
  }

  DH.Kinetics = { create, setBeta, step, startupRate, LAM, FRAC, GEN, SRC };
})();
