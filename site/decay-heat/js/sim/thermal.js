(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const S = DH.Steam;

  const C = {
    P0: 3400e6,
    NLOOP: 4,
    V_RCS: 350,
    V_PZR: 51,
    CF: 3.03e7,
    CC: 7.59e6,
    UA_GAP: 9.714e6,
    UA_FILM: 8.173e7,
    UA_SG: 3.6e7,
    W_LOOP: 4830,
    MS_NOM: 50000,
    MS_MIN: 15000,
    MS_SOLID: 66000,
    NR_LO: 38000,
    NR_HI: 58000,
    WR_LO: 18000,
    WR_HI: 62000,
    Q_SG_NOM: 850e6,
    P_SEC_NOM: 6.9,
    TFW_NOM: 226,
    TAFW: 30,
    TAVG_NOM: 308.4,
    TREF_NOZ: 292,
    DT_NOM: 32,
    HTR_MAX: 1.8e6,
    SPRAY_MAX: 30,
    ALPHA_TAF: 0.42,
    ALPHA_BAF: 0.72,
    W_STEAM_NOM: 1878
  };

  function tRefProgram(load) {
    return C.TREF_NOZ + (C.TAVG_NOM - C.TREF_NOZ) * Math.min(Math.max(load, 0), 1);
  }

  function nrLevel(m) {
    return (100 * (m - C.NR_LO)) / (C.NR_HI - C.NR_LO);
  }

  function wrLevel(m) {
    return (100 * (m - C.WR_LO)) / (C.WR_HI - C.WR_LO);
  }

  function swell(q, p) {
    const v = 0.12 * Math.min(Math.max(q / C.Q_SG_NOM, 0), 1.3) * Math.pow(C.P_SEC_NOM / Math.max(p, 0.5), 0.8);
    return 55 * (v - 0.12);
  }

  function reliefFlow(area, p, pBack, liquid) {
    const dp = Math.max(p - pBack, 0);
    if (dp <= 0) return 0;
    const g = liquid ? 45000 : 9000;
    return area * g * Math.sqrt(dp / 15.5);
  }

  function pumpFlow(pump, dt) {
    if (pump.on && pump.power) {
      pump.w += (C.W_LOOP - pump.w) * (1 - Math.exp(-dt / 3));
    } else {
      pump.w *= Math.exp(-dt / 11);
      if (pump.w < 1) pump.w = 0;
    }
    return pump.w;
  }

  // buoyancy-driven loop flow goes as the cube root of core power; it must not be
  // tied to SG effectiveness or the two collapse each other
  function naturalCirc(st) {
    const q = Math.max(st.qCore / C.P0, 1e-4);
    const sink = st.sg.some((s) => s.m > 2000) ? 1 : 0.2;
    return 1800 * Math.pow(q, 1 / 3) * sink * Math.max(st.coreCovered, 0.05);
  }

  // the fuel node itself is integrated by the kinetics feedback closure in plant.js,
  // so that Doppler can terminate a prompt excursion inside the kinetics sub-steps
  function stepFuel(st, dt) {
    const uaGap = C.UA_GAP;
    const cover = st.coreCovered;
    const uaFilm = C.UA_FILM * (cover + 0.025 * (1 - cover)) * Math.min(1, 0.15 + 0.85 * st.flowFrac);

    let qZr = 0;
    if (st.tClad > 1000) {
      const x = (st.tClad - 1000) / 400;
      qZr = 4.5e7 * x * x * (1 - cover + 0.15) * (st.oxidation < 1 ? 1 : 0);
      st.oxidation = Math.min(1, st.oxidation + (qZr / 6.5e12) * dt);
    }

    const tcInf = (uaGap * st.tFuel + uaFilm * st.tCool) / (uaGap + uaFilm);
    const tauC = C.CC / (uaGap + uaFilm);
    st.tClad = tcInf + (st.tClad - tcInf) * Math.exp(-dt / tauC) + (qZr / C.CC) * dt;

    st.tFuelPeak = st.tFuel + 0.55 * Math.max(st.tFuel - st.tClad, 0);
    st.qZr = qZr;
    st.uaFilm = uaFilm;
    return uaFilm * (st.tClad - st.tCool);
  }

  function stepSG(st, i, dt) {
    const sg = st.sg[i];
    const tsat = S.tsat(sg.p);
    const primOk = st.coreCovered > 0.05 ? 1 : 0.2;
    const inv = Math.min(1, sg.m / C.MS_MIN);
    const eff = Math.max(0.12, Math.pow(Math.min(st.flowFrac, 1.3), 0.8)) * inv * primOk;
    sg.eff = eff;
    const q = C.UA_SG * eff * (st.tCool - tsat);
    sg.q = q;

    const pRatio = Math.sqrt(Math.max(sg.p, 0.05) / C.P_SEC_NOM);
    let wOut = (C.W_STEAM_NOM / C.NLOOP) * st.turbValve * (sg.p / C.P_SEC_NOM);
    wOut += (C.W_STEAM_NOM * 0.4 / C.NLOOP) * st.dumpValve * (sg.p / C.P_SEC_NOM);
    if (sg.p > 7.9) wOut += 95 * Math.sqrt((sg.p - 7.9) / 1.0);
    if (sg.porv) wOut += 55 * pRatio;
    if (sg.breakArea > 0) wOut += reliefFlow(sg.breakArea, sg.p, 0.1, false);
    sg.wSteam = Math.min(wOut, sg.m / dt * 0.5 + 1e-6);

    const leak = st.breakToSec && i === st.rupturedSG ? st.wBreak : 0;
    sg.leak = leak;
    const wIn = sg.wFeed + sg.wAfw + leak;
    sg.m = Math.max(0, sg.m + (wIn - sg.wSteam) * dt);

    const hfg = S.hfg(sg.p);
    const hfSat = S.hf(tsat);
    const qNet =
      q +
      leak * (S.hf(st.tHot) - hfSat) -
      sg.wSteam * hfg -
      sg.wFeed * Math.max(0, hfSat - S.hf(st.tFeed)) -
      sg.wAfw * Math.max(0, hfSat - S.hf(C.TAFW));

    const dTdP = (S.tsat(sg.p + 0.05) - S.tsat(Math.max(sg.p - 0.05, 0.02))) / 0.1;
    const cap = Math.max(sg.m, 3000) * S.cpL(tsat) * Math.max(dTdP, 1);
    sg.p = Math.min(Math.max(sg.p + (qNet / cap) * dt, 0.05), 12);
    // a water-solid shell has no steam space left to absorb inflow
    sg.solid = sg.m > C.MS_SOLID;
    if (sg.solid) sg.p = Math.min(sg.p + Math.max(wIn - sg.wSteam, 0) * 0.004 * dt, 12);
    sg.tsat = S.tsat(sg.p);
    sg.nr = nrLevel(sg.m);
    sg.wr = wrLevel(sg.m);
    sg.swell = swell(q, sg.p);
    return q;
  }

  function step(st, dt) {
    st.qCore = C.UA_GAP * Math.max(st.tFuel - st.tClad, 0);
    st.wBreak = st.breakArea > 0
      ? reliefFlow(st.breakArea, st.p, st.breakToSec ? st.sg[st.rupturedSG].p : 0.12, st.subcool > 2)
      : 0;
    let wTot = 0;
    for (let i = 0; i < C.NLOOP; i++) {
      const p = st.pumps[i];
      wTot += pumpFlow(p, dt);
    }
    const voidPenalty = 1 - 0.85 * st.voidFrac;
    wTot *= Math.max(voidPenalty, 0.05);
    wTot = Math.max(wTot, naturalCirc(st));
    st.wRcs = wTot;
    st.flowFrac = wTot / (C.W_LOOP * C.NLOOP);

    const qToCool = stepFuel(st, dt);

    let sgSink = 0, qSgTot = 0;
    for (let i = 0; i < C.NLOOP; i++) {
      qSgTot += stepSG(st, i, dt);
      sgSink += st.sg[i].eff;
    }
    st.sgSinkFrac = sgSink / C.NLOOP;
    st.qSg = qSgTot;

    const cp = S.cpL(st.tCool);
    const mLiq = st.mSys - st.mSteam;
    const rhoRcs = S.rhoF(Math.min(st.tCool, S.tsat(st.p) - 0.01));
    const mRcsFull = C.V_RCS * rhoRcs;
    const tsatP = S.tsat(st.p);

    let mPw, vBubble, voidFrac;
    if (mLiq > mRcsFull) {
      mPw = mLiq - mRcsFull;
      const vPw = mPw / S.rhoF(tsatP);
      vBubble = C.V_PZR - vPw;
      voidFrac = 0;
      if (vBubble < 0.2) {
        vBubble = 0.2;
        st.pzrSolid = true;
      } else st.pzrSolid = false;
    } else {
      mPw = 0;
      st.pzrSolid = false;
      const vLiq = mLiq / rhoRcs;
      vBubble = Math.max(C.V_RCS + C.V_PZR - vLiq, 0.2);
      voidFrac = Math.min(1, (vBubble - C.V_PZR) / C.V_RCS);
      if (voidFrac < 0) voidFrac = 0;
    }
    st.voidFrac = voidFrac;
    st.mPzrWater = mPw;
    st.vBubble = vBubble;
    st.pzrLevel = Math.min(100, (100 * (mPw / S.rhoF(tsatP))) / C.V_PZR);
    st.coreCovered = Math.min(1, Math.max(0, (C.ALPHA_BAF - voidFrac) / (C.ALPHA_BAF - C.ALPHA_TAF)));

    const wIns = (mPw - st.mPwPrev) / dt;
    st.mPwPrev = mPw;
    st.wSurge = wIns;

    const cpCore = Math.max(mLiq, 5000) * cp;
    let qNet = qToCool - qSgTot - st.qLossAmb;
    let dT = (qNet / cpCore) * dt;
    let qBoil = 0;
    if (st.tCool + dT >= tsatP - 0.02) {
      const room = Math.max(tsatP - 0.02 - st.tCool, 0);
      const used = (room * cpCore) / dt;
      qBoil = Math.max(qNet - used, 0);
      st.tCool = Math.min(st.tCool + room, tsatP - 0.02);
      st.saturated = qBoil > 0;
    } else {
      st.tCool += dT;
      st.saturated = false;
    }
    if (st.tCool < 15) st.tCool = 15;
    st.tAvg = st.tCool;

    const dTloop = Math.min(qToCool / Math.max(wTot * cp, 1e4), 120);
    st.tHot = st.tAvg + dTloop / 2;
    st.tCold = st.tAvg - dTloop / 2;
    st.subcool = tsatP - st.tHot;

    const hfg = S.hfg(st.p);
    const hfSat = S.hf(tsatP);
    let dSteam = 0;
    dSteam += st.qHeaters / hfg;
    dSteam -= (st.wSpray * Math.max(hfSat - S.hf(st.tCold), 0)) / hfg;
    if (wIns > 0) dSteam -= (wIns * cp * Math.max(tsatP - st.tAvg, 0)) / hfg;
    const dTsat = (tsatP - st.tsatPrev) / dt;
    st.tsatPrev = tsatP;
    dSteam -= (mPw * S.cpL(tsatP) * dTsat) / hfg;
    dSteam += qBoil / hfg;
    dSteam -= st.qPzrLoss / hfg;

    let wRelief = 0;
    const liquidRelief = st.pzrSolid || (mPw / S.rhoF(tsatP)) / C.V_PZR > 0.99;
    for (let i = 0; i < 2; i++) {
      if (st.porvOpen[i] && st.porvBlock[i]) {
        wRelief += reliefFlow(0.0026, st.p, 0.2, liquidRelief);
      }
    }
    if (st.p > 17.2) wRelief += reliefFlow(0.006, st.p, 0.2, liquidRelief) * 3;
    st.wRelief = wRelief;
    if (!liquidRelief) dSteam -= wRelief;

    st.mSteam = Math.max(st.mSteam + dSteam * dt, 0.5);
    if (mPw <= 0 && st.mSteam < 1) st.mSteam = 1;

    const rg = st.mSteam / vBubble;
    const pEq = S.pFromRhoG(rg);
    st.p += (pEq - st.p) * (1 - Math.exp(-dt / 0.4));
    st.p = Math.min(Math.max(st.p, 0.1), 22);

    let wLoss = st.wBreak + wRelief + st.wLetdown;
    let wGain = st.wCharging + st.wHpi + st.wLpi + st.wAcc;
    st.mSys = Math.max(st.mSys + (wGain - wLoss) * dt, 1000);

    st.qSgNet = qSgTot;
    st.qBoil = qBoil;
    st.tsat = tsatP;
  }

  function makeState() {
    const st = {
      tFuel: 300, tClad: 300, tCool: 292, tAvg: 292, tHot: 292, tCold: 292,
      tFuelPeak: 300, oxidation: 0, qZr: 0,
      p: 15.5, mSteam: 2081, mSys: 0, mPzrWater: 18190, mPwPrev: 18190,
      vBubble: 20.4, pzrLevel: 60, pzrSolid: false, voidFrac: 0, coreCovered: 1,
      subcool: 0, saturated: false, tsat: 344.8, tsatPrev: 344.8,
      wRcs: 19320, flowFrac: 1, wSurge: 0, wRelief: 0, wBreak: 0,
      wCharging: 5, wLetdown: 5, wHpi: 0, wLpi: 0, wAcc: 0, wSpray: 0,
      qHeaters: 0, qLossAmb: 3e6, qPzrLoss: 1.2e5,
      porvOpen: [false, false], porvBlock: [true, true],
      breakArea: 0, breakToSec: false, tubeRupture: 0, rupturedSG: 0,
      turbValve: 0, dumpValve: 0, tFeed: C.TFW_NOM,
      sgSinkFrac: 1, qSg: 0, qBoil: 0, qSgNet: 0,
      pumps: [], sg: []
    };
    for (let i = 0; i < C.NLOOP; i++) {
      st.pumps.push({ on: true, power: true, w: C.W_LOOP });
      st.sg.push({
        m: C.MS_NOM, p: C.P_SEC_NOM, tsat: S.tsat(C.P_SEC_NOM), q: 0, eff: 1,
        wSteam: 0, wFeed: 0, wAfw: 0, nr: 60, wr: 72, swell: 0,
        porv: false, breakArea: 0
      });
    }
    return st;
  }

  DH.Thermal = { C, step, makeState, tRefProgram, nrLevel, wrLevel, reliefFlow };
})();
