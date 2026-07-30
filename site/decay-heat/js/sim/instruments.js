(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const S = DH.Steam;

  const RHO_REF_NOM = 983;
  const RHO_F_NOM = 594;
  const RHO_SG_REF_NOM = 958;
  const RHO_SG_F_NOM = 740;

  function create() {
    return {
      srCps: 0, srEnergized: true, irAmps: 0, pr: [0, 0, 0], power: 0,
      sur: 0, surRaw: 0, logN: -12, logNPrev: -12,
      tHot: [292, 292, 292, 292], tCold: [292, 292, 292, 292],
      tAvg: 292, tRef: 292, dT: 0, dTsp: 36,
      pPzr: 15.5, pzrLevel: 60,
      refLegT: 55, refLegVoid: 0, refRho: RHO_REF_NOM,
      sgRefLegT: 55, sgRefVoid: 0, sgRefRho: RHO_SG_REF_NOM,
      subcool: 0, tsat: 344.8,
      sgNr: [60, 60, 60, 60], sgWr: [72, 72, 72, 72], sgP: [6.9, 6.9, 6.9, 6.9],
      wFeed: [0, 0, 0, 0], wSteam: [0, 0, 0, 0],
      loopFlow: [100, 100, 100, 100],
      turbLoad: 0, mwe: 0, condVac: 100,
      contP: 0.1013, contT: 32, contRad: 1, slRad: [1, 1, 1, 1],
      boronSample: 0, boronSampleAge: 0,
      axialFlux: 0, bankD: 0, sdBank: 0,
      battV: 125, backlight: [1, 1, 1, 1, 1],
      nSmooth: 1
    };
  }

  function lag(cur, target, dt, tau) {
    return cur + (target - cur) * (1 - Math.exp(-dt / tau));
  }

  function update(p, dt) {
    const ind = p.ind;
    const th = p.th;
    const n = Math.max(p.k.n, 1e-16);
    const rn = () => (p.rng() - 0.5);

    ind.nSmooth = lag(ind.nSmooth, n, dt, 0.35);

    const cps = Math.max(ind.nSmooth * 1e13, 0.4);
    ind.srEnergized = cps < 1e5;
    ind.srCps = ind.srEnergized ? cps * (1 + 0.06 * rn() / Math.sqrt(Math.max(cps, 1) / 1e3 + 1)) : 0;
    ind.irAmps = ind.nSmooth * 2e-3 * (1 + 0.03 * rn());

    const prTrue = ind.nSmooth * 100;
    for (let i = 0; i < 3; i++) {
      const cal = 1 + (i - 1) * 0.006;
      ind.pr[i] = prTrue > 1e-3 ? Math.max(0, prTrue * cal + 0.25 * rn()) : 0;
    }
    ind.power = (ind.pr[0] + ind.pr[1] + ind.pr[2]) / 3;

    ind.logNPrev = ind.logN;
    ind.logN = Math.log10(Math.max(ind.nSmooth, 1e-16));
    ind.surRaw = ((ind.logN - ind.logNPrev) / dt) * 60;
    ind.sur = lag(ind.sur, ind.surRaw, dt, 2.5);

    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * 0.12;
      ind.tHot[i] = lag(ind.tHot[i], th.tHot + off + 0.09 * rn(), dt, 5.5);
      ind.tCold[i] = lag(ind.tCold[i], th.tCold + off * 0.7 + 0.09 * rn(), dt, 5.5);
      ind.loopFlow[i] = lag(ind.loopFlow[i], (th.pumps[i].w / DH.Thermal.C.W_LOOP) * 100 * (1 - 0.8 * th.voidFrac), dt, 1.2);
      ind.sgP[i] = lag(ind.sgP[i], th.sg[i].p, dt, 0.9);
      ind.wSteam[i] = lag(ind.wSteam[i], th.sg[i].wSteam, dt, 1.5);
      ind.wFeed[i] = lag(ind.wFeed[i], th.sg[i].wFeed + th.sg[i].wAfw, dt, 1.5);
    }
    ind.tAvg = (ind.tHot.reduce((a, b) => a + b, 0) + ind.tCold.reduce((a, b) => a + b, 0)) / 8;
    ind.dT = ind.tHot.reduce((a, b) => a + b, 0) / 4 - ind.tCold.reduce((a, b) => a + b, 0) / 4;
    ind.tRef = DH.Thermal.tRefProgram(p.sec.turbTripped ? 0 : th.turbValve);

    ind.pPzr = lag(ind.pPzr, th.p + 0.006 * rn(), dt, 0.45);
    ind.tsat = S.tsat(Math.max(ind.pPzr, 0.1));
    ind.subcool = ind.tsat - Math.max.apply(null, ind.tHot);

    ind.refLegT = lag(ind.refLegT, p.cont.t + 12, dt, 420);
    const legSat = S.tsat(Math.max(th.p, 0.1));
    const flashing = ind.refLegT > legSat - 1;
    ind.refLegVoid = Math.min(1, Math.max(0, ind.refLegVoid + (flashing ? 1 : -0.25) * dt / 90));
    ind.refRho = S.rhoF(ind.refLegT) * (1 - ind.refLegVoid) + S.rhoG(Math.max(th.p, 0.1)) * ind.refLegVoid;

    const rhoPzr = S.rhoF(S.tsat(Math.max(th.p, 0.1)));
    const lRaw = (100 * (RHO_REF_NOM - ind.refRho) + rhoPzr * th.pzrLevel) / RHO_F_NOM;
    ind.pzrLevel = Math.min(100, Math.max(0, lag(ind.pzrLevel, lRaw + 0.15 * rn(), dt, 1.6)));

    ind.sgRefLegT = lag(ind.sgRefLegT, p.cont.t + 8, dt, 420);
    let sgFlash = false;
    for (let i = 0; i < 4; i++) if (ind.sgRefLegT > S.tsat(Math.max(th.sg[i].p, 0.05)) - 1) sgFlash = true;
    ind.sgRefVoid = Math.min(1, Math.max(0, ind.sgRefVoid + (sgFlash ? 1 : -0.25) * dt / 120));
    ind.sgRefRho = S.rhoF(ind.sgRefLegT) * (1 - ind.sgRefVoid) + 12 * ind.sgRefVoid;
    const sgBias = (100 * (RHO_SG_REF_NOM - ind.sgRefRho)) / RHO_SG_F_NOM;

    for (let i = 0; i < 4; i++) {
      const sg = th.sg[i];
      const nrT = sg.nr + sg.swell + sgBias;
      const wrT = sg.wr + sg.swell * 0.45 + sgBias * 0.45;
      ind.sgNr[i] = Math.min(105, Math.max(-5, lag(ind.sgNr[i], nrT + 0.2 * rn(), dt, 2.2)));
      ind.sgWr[i] = Math.min(105, Math.max(-5, lag(ind.sgWr[i], wrT + 0.2 * rn(), dt, 3.5)));
    }

    ind.contP = lag(ind.contP, p.cont.p, dt, 1.5);
    ind.contT = lag(ind.contT, p.cont.t, dt, 8);
    ind.contRad = lag(ind.contRad, p.rad.cont, dt, 3);
    for (let i = 0; i < 4; i++) ind.slRad[i] = lag(ind.slRad[i], p.rad.steamLine[i], dt, 4);

    ind.boronSampleAge += dt;
    ind.turbLoad = lag(ind.turbLoad, th.turbValve * 100, dt, 1.2);
    ind.mwe = lag(ind.mwe, p.mwe, dt, 2.5);
    ind.condVac = lag(ind.condVac, p.sec.condVac * 100, dt, 4);
    ind.battV = p.elec.battV;
    ind.bankD = p.ctl.bankD;
    ind.sdBank = p.ctl.sdBank * 100;
    ind.axialFlux = p.core.axialOffset * (ind.power / 100);

    for (let b = 0; b < 5; b++) {
      const powered = p.elec.busA !== 'dead' || p.elec.busB !== 'dead' || p.elec.battV > 108;
      const target = powered ? 1 : Math.max(0, (p.elec.battV - 96) / 12);
      ind.backlight[b] = lag(ind.backlight[b], Math.min(1, target + (b === 1 || b === 4 ? 0.12 : 0)), dt, 6);
    }
  }

  function sampleBoron(p) {
    p.ind.boronSample = p.ctl.boron;
    p.ind.boronSampleAge = 0;
  }

  DH.Instruments = { create, update, sampleBoron, lag };
})();
