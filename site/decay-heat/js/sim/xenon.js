(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const LI = 2.87e-5;
  const LXE = 2.09e-5;
  const GI = 0.0639;
  const GXE = 0.0023;
  const SPHI = 1.4e-4;

  const LPM = 3.63e-6;
  const GPM = 0.01071;
  const SPHI_SM = 1.0e-5;

  const I_EQ = GI / LI;
  const XE_EQ = (GI + GXE) / (LXE + SPHI);
  const PM_EQ = GPM / LPM;
  const SM_EQ = GPM / SPHI_SM;

  function create(n) {
    const f = n === undefined ? 1 : n;
    return {
      i: I_EQ * f,
      xe: (GI + GXE) * f / (LXE + SPHI * f),
      pm: PM_EQ * f,
      sm: SM_EQ
    };
  }

  function fresh() {
    return { i: 0, xe: 0, pm: 0, sm: 0 };
  }

  function step(x, n, dt) {
    const bx = LXE + SPHI * n;
    const ei = Math.exp(-LI * dt);
    x.i = x.i * ei + (GI * n / LI) * (1 - ei);

    const ex = Math.exp(-bx * dt);
    const srcX = GXE * n + LI * x.i;
    x.xe = x.xe * ex + (srcX / bx) * (1 - ex);

    const ep = Math.exp(-LPM * dt);
    x.pm = x.pm * ep + (GPM * n / LPM) * (1 - ep);

    const bs = SPHI_SM * n;
    if (bs > 1e-12) {
      const es = Math.exp(-bs * dt);
      x.sm = x.sm * es + (LPM * x.pm / bs) * (1 - es);
    } else {
      x.sm += LPM * x.pm * dt;
    }
  }

  const xeWorth = (x, peak) => -(peak === undefined ? 2700 : peak) * (x.xe / XE_EQ);
  const smWorth = (x, peak) => -(peak === undefined ? 600 : peak) * (x.sm / SM_EQ);

  DH.Xenon = { create, fresh, step, xeWorth, smWorth, I_EQ, XE_EQ, SM_EQ, PM_EQ };
})();
