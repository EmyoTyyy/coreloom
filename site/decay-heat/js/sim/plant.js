(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const S = DH.Steam;
  const K = DH.Kinetics;
  const R = DH.React;
  const X = DH.Xenon;
  const Dk = DH.Decay;
  const T = DH.Thermal;
  const C = T.C;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const AUX_LOCS = {
    CTRL: { name: () => DH.L('loc.CTRL'), travel: 0 },
    AFW: { name: () => DH.L('loc.AFW'), travel: 250 },
    DG: { name: () => DH.L('loc.DG'), travel: 290 },
    SWGR: { name: () => DH.L('loc.SWGR'), travel: 215 },
    TURB: { name: () => DH.L('loc.TURB'), travel: 235 },
    SFP: { name: () => DH.L('loc.SFP'), travel: 320 },
    PZR: { name: () => DH.L('loc.PZR'), travel: 275 },
    CNMT: { name: () => DH.L('loc.CNMT'), travel: 340 }
  };

  const ALARMS = [
    { id: 'ROD_ROD', b: 0, t: () => DH.L('alarm.ROD_ROD'), f: (p) => p.ctl.bankD < 3 && !p.trip.tripped },
    { id: 'SUR_HI', b: 0, t: () => DH.L('alarm.SUR_HI'), f: (p) => p.ind.sur > 1.0 },
    { id: 'FLUX_HI', b: 0, t: () => DH.L('alarm.FLUX_HI'), f: (p) => p.ind.power > 103 },
    { id: 'AFD_OUT', b: 0, t: () => DH.L('alarm.AFD_OUT'), f: (p) => Math.abs(p.ind.axialFlux) > 9 && p.ind.power > 50 },
    { id: 'TAVG_DEV', b: 0, t: () => DH.L('alarm.TAVG_DEV'), f: (p) => Math.abs(p.ind.tAvg - p.ind.tRef) > 3 && p.ind.power > 14 },
    { id: 'RX_TRIP', b: 0, t: () => DH.L('alarm.RX_TRIP'), f: (p) => p.trip.tripped },
    { id: 'ROD_URG', b: 0, t: () => DH.L('alarm.ROD_URG'), f: (p) => p.ctl.rodFail },

    { id: 'PZR_P_LO', b: 1, t: () => DH.L('alarm.PZR_P_LO'), f: (p) => p.ind.pPzr < 15.0 },
    { id: 'PZR_P_HI', b: 1, t: () => DH.L('alarm.PZR_P_HI'), f: (p) => p.ind.pPzr > 15.9 },
    { id: 'PZR_L_LO', b: 1, t: () => DH.L('alarm.PZR_L_LO'), f: (p) => p.ind.pzrLevel < 17 },
    { id: 'PZR_L_HI', b: 1, t: () => DH.L('alarm.PZR_L_HI'), f: (p) => p.ind.pzrLevel > 88 },
    { id: 'SUBCOOL', b: 1, t: () => DH.L('alarm.SUBCOOL'), f: (p) => p.ind.subcool < 15 },
    { id: 'PORV_OPEN', b: 1, t: () => DH.L('alarm.PORV_OPEN'), f: (p) => p.th.porvOpen[0] || p.th.porvOpen[1] },
    { id: 'PRT_HI', b: 1, t: () => DH.L('alarm.PRT_HI'), f: (p) => p.prt.m > 900 },
    { id: 'RCP_TRIP', b: 1, t: () => DH.L('alarm.RCP_TRIP'), f: (p) => p.th.pumps.some((q) => !q.on || !q.power) },
    { id: 'FLOW_LO', b: 1, t: () => DH.L('alarm.FLOW_LO'), f: (p) => Math.min.apply(null, p.ind.loopFlow) < 88 },
    { id: 'CHG_LO', b: 1, t: () => DH.L('alarm.CHG_LO'), f: (p) => Math.abs(p.ctl.charging - p.ctl.letdown) > 4 },

    { id: 'SG_L_LO', b: 2, t: () => DH.L('alarm.SG_L_LO'), f: (p) => p.ind.sgNr.some((l) => l < 25) },
    { id: 'SG_L_LOLO', b: 2, t: () => DH.L('alarm.SG_L_LOLO'), f: (p) => p.ind.sgNr.some((l) => l < 17) },
    { id: 'SG_L_HI', b: 2, t: () => DH.L('alarm.SG_L_HI'), f: (p) => p.ind.sgNr.some((l) => l > 80) },
    { id: 'FW_LOSS', b: 2, t: () => DH.L('alarm.FW_LOSS'), f: (p) => !p.sec.mfw },
    { id: 'SL_P_LO', b: 2, t: () => DH.L('alarm.SL_P_LO'), f: (p) => Math.min.apply(null, p.ind.sgP) < 5.2 },
    { id: 'TURB_TRIP', b: 2, t: () => DH.L('alarm.TURB_TRIP'), f: (p) => p.sec.turbTripped },
    { id: 'COND_VAC', b: 2, t: () => DH.L('alarm.COND_VAC'), f: (p) => p.ind.condVac < 70 },
    { id: 'SL_RAD', b: 2, t: () => DH.L('alarm.SL_RAD'), f: (p) => Math.max.apply(null, p.ind.slRad) > 8 },

    { id: 'OFFSITE', b: 3, t: () => DH.L('alarm.OFFSITE'), f: (p) => !p.elec.offsite },
    { id: 'BUS_DEAD', b: 3, t: () => DH.L('alarm.BUS_DEAD'), f: (p) => p.elec.busA === 'dead' || p.elec.busB === 'dead' },
    { id: 'DG_TROUBLE', b: 3, t: () => DH.L('alarm.DG_TROUBLE'), f: (p) => p.elec.edg.some((d) => d.failed || (d.cmd && !d.running)) },
    { id: 'BATT_LO', b: 3, t: () => DH.L('alarm.BATT_LO'), f: (p) => p.elec.battV < 110 },

    { id: 'SI_ACT', b: 4, t: () => DH.L('alarm.SI_ACT'), f: (p) => p.si.on },
    { id: 'AFW_RUN', b: 4, t: () => DH.L('alarm.AFW_RUN'), f: (p) => p.sec.afw.some((a) => a.running) },
    { id: 'ACC_DISCH', b: 4, t: () => DH.L('alarm.ACC_DISCH'), f: (p) => p.si.accFlow > 1 },
    { id: 'CNMT_P', b: 4, t: () => DH.L('alarm.CNMT_P'), f: (p) => p.ind.contP > 0.117 },
    { id: 'CNMT_RAD', b: 4, t: () => DH.L('alarm.CNMT_RAD'), f: (p) => p.ind.contRad > 25 },
    { id: 'CORE_UNCOV', b: 4, t: () => DH.L('alarm.CORE_UNCOV'), f: (p) => p.th.tClad > 700 }
  ];

  const TRIPS = [
    { id: 'MANUAL', t: () => DH.L('trip.MANUAL'), f: (p) => p.ctl.manualTrip },
    { id: 'PR_HI', t: () => DH.L('trip.PR_HI'), f: (p) => p.ind.power > 109 },
    { id: 'PR_HI_LO', t: () => DH.L('trip.PR_HI_LO'), f: (p) => p.ind.power > 25 && !p.ctl.p10Block },
    { id: 'SR_HI', t: () => DH.L('trip.SR_HI'), f: (p) => p.ind.srEnergized && p.ind.srCps > 1e5 && !p.ctl.srBlock },
    { id: 'OTDT', t: () => DH.L('trip.OTDT'), f: (p) => p.ind.power > 10 && p.ind.dT > p.ind.dTsp },
    { id: 'PZR_P_LO', t: () => DH.L('trip.PZR_P_LO'), f: (p) => p.ind.pPzr < 12.97 && p.ind.power > 10 },
    { id: 'PZR_P_HI', t: () => DH.L('trip.PZR_P_HI'), f: (p) => p.ind.pPzr > 16.2 },
    { id: 'PZR_L_HI', t: () => DH.L('trip.PZR_L_HI'), f: (p) => p.ind.pzrLevel > 92 },
    { id: 'FLOW_LO', t: () => DH.L('trip.FLOW_LO'), f: (p) => p.ind.power > 10 && Math.min.apply(null, p.ind.loopFlow) < 87 },
    { id: 'SG_LOLO', t: () => DH.L('trip.SG_LOLO'), f: (p) => p.ind.sgNr.some((l) => l < 17) },
    { id: 'TURB', t: () => DH.L('trip.TURB'), f: (p) => p.sec.turbTripped && p.ind.power > 50 },
    { id: 'SI', t: () => DH.L('trip.SI'), f: (p) => p.si.on },
    { id: 'UV', t: () => DH.L('trip.UV'), f: (p) => !p.elec.offsite && p.ind.power > 10 }
  ];

  function create(scen, seed) {
    const sd = seed === undefined ? scen.seed || 1 : seed;
    const th = T.makeState();
    const p = {
      id: scen.id,
      scen: scen,
      seed: sd,
      rng: mulberry32(sd),
      t: 0,
      clock: scen.startClock === undefined ? 22 * 3600 : scen.startClock,
      th: th,
      core: {
        excess: 14000,
        beta: R.betaFor(scen.burnup || 0.5),
        burnup: scen.burnup === undefined ? 0.5 : scen.burnup,
        xePeak: 2700,
        smPeak: 600,
        axialOffset: 0,
        atws: false
      },
      ctl: {
        bankD: 100, sdBank: 0, rodCmd: 0, rodMode: 'MANUAL', rodFail: false,
        boron: 914, boronCmd: 0, boronRate: 0.02,
        heaterMode: 'AUTO', sprayMode: 'AUTO', sprayManual: 0,
        porvMode: ['AUTO', 'AUTO'], porvBlockCmd: [true, true],
        charging: 5, letdown: 5, chargingMode: 'AUTO', levelProg: 60,
        turbDemand: 100, loadRate: 3,
        manualTrip: false, rodsDropping: false,
        srBlock: false, p10Block: false
      },
      sec: {
        mfw: true, feedMode: ['AUTO', 'AUTO', 'AUTO', 'AUTO'], feedManual: [0, 0, 0, 0],
        dumpMode: 'AUTO', dumpManual: 0, condVac: 1, turbTripped: false,
        afw: [
          { id: 'A', kind: 'MOTOR', bus: 'A', running: false, auto: true, cap: 17 },
          { id: 'B', kind: 'MOTOR', bus: 'B', running: false, auto: true, cap: 17 },
          { id: 'T', kind: 'TURBINE', bus: 'DC', running: false, auto: true, cap: 22 }
        ],
        afwValves: [true, true, true, true],
        sgPorv: [0, 0, 0, 0]
      },
      elec: {
        offsite: true, offsiteFail: false,
        edg: [
          { id: 1, cmd: false, running: false, ready: false, t: 0, failed: false, bus: 'A' },
          { id: 2, cmd: false, running: false, ready: false, t: 0, failed: false, bus: 'B' }
        ],
        busA: 'offsite', busB: 'offsite',
        battery: 1, battV: 125, battHours: 4
      },
      si: { on: false, t: -1, hpi: [true, true], lpi: [true, true], accIso: [false, false, false, false], accM: [26000, 26000, 26000, 26000], accFlow: 0, blocked: false },
      cont: { p: 0.1013, t: 32, energy: 0, spray: false, fans: 2, isolated: false },
      prt: { m: 0, burst: false },
      rad: { rcs: 1, cont: 1, steamLine: [1, 1, 1, 1], released: 0, cladFail: 0 },
      aux: { at: 'CTRL', to: null, eta: 0, task: null, log: [], busy: false },
      phone: { queue: [], active: null, ringing: false, fired: {} },
      alarms: {}, alarmOrder: [], newAlarm: false, lastAlarmT: -1e9,
      trip: { tripped: false, t: -1, reasons: [], first: null },
      mwe: 0, mwhDelivered: 0, mwhDemand: 0,
      k: null, fp: null, dh: null, ind: DH.Instruments.create(),
      score: {
        peakFuel: 0, peakClad: 0, uncoveredTime: 0, techSpecTime: 0,
        released: 0, tripCount: 0, coreDamage: false, minSubcool: 999,
        peakCntP: 0.1013, coolantLost: 0, satTime: 0,
        peakSur: 0, peakPower: 0
      },
      events: [], trace: [], traceT: 0, over: null, rho: null
    };

    for (const a of ALARMS) p.alarms[a.id] = { st: 0, t: -1 };

    const init = scen.init || {};
    Object.assign(p.core, init.core || {});
    Object.assign(p.ctl, init.ctl || {});
    Object.assign(p.sec, init.sec || {});
    p.core.beta = R.betaFor(p.core.burnup);

    const n0 = init.power === undefined ? 1 : init.power;
    p.k = K.create(p.core.beta, Math.max(n0, 1e-12));
    p.fp = init.xenon === 'none' ? X.fresh() : X.create(init.xenonPower === undefined ? n0 : init.xenonPower);
    if (init.xenonAge) {
      const dtc = 60;
      for (let s = 0; s < init.xenonAge; s += dtc) X.step(p.fp, init.xenonAgePower || 0, dtc);
    }
    p.dh = Dk.create(init.decayPower === undefined ? n0 : init.decayPower);

    const tA = init.tAvg === undefined ? (n0 > 0.05 ? T.tRefProgram(n0) : 292) : init.tAvg;
    th.tCool = th.tAvg = th.tHot = th.tCold = tA;
    th.tFuel = tA + (n0 * C.P0) / C.UA_GAP + (n0 * C.P0) / C.UA_FILM;
    th.tClad = tA + (n0 * C.P0) / C.UA_FILM;
    th.p = init.p === undefined ? 15.5 : init.p;
    th.tsatPrev = S.tsat(th.p);
    th.turbValve = init.turbValve === undefined ? n0 : init.turbValve;
    p.ctl.turbDemand = th.turbValve * 100;

    const pzrL = init.pzrLevel === undefined ? (25 + 35 * n0) : init.pzrLevel;
    const rhoP = S.rhoF(S.tsat(th.p));
    const mPw = (pzrL / 100) * C.V_PZR * rhoP;
    th.mSys = C.V_RCS * S.rhoF(tA) + mPw + (C.V_PZR - mPw / rhoP) * S.rhoG(th.p);
    th.mSteam = (C.V_PZR - mPw / rhoP) * S.rhoG(th.p);
    th.mPwPrev = mPw;
    th.mPzrWater = mPw;

    for (let i = 0; i < 4; i++) {
      const sg = th.sg[i];
      sg.p = init.sgP === undefined ? (n0 > 0.05 ? 6.9 : 7.5) : init.sgP;
      sg.m = init.sgM === undefined ? C.MS_NOM : init.sgM;
      sg.wFeed = (C.W_STEAM_NOM / 4) * n0;
      sg.wSteam = sg.wFeed;
    }
    if (init.pumps) for (let i = 0; i < 4; i++) th.pumps[i].on = init.pumps[i];
    if (init.rodsIn) { p.ctl.bankD = 0; p.ctl.sdBank = 1; }

    if (init.trim !== false) trim(p, tA, n0, init.trim || 'rods');

    p.ind.boronSample = p.ctl.boron;
    p.ind.nSmooth = p.k.n;
    p.ind.pzrLevel = pzrL;
    p.ind.pPzr = th.p;
    for (let i = 0; i < 4; i++) { p.ind.tHot[i] = tA; p.ind.tCold[i] = tA; }
    p.ind.tAvg = tA;

    if (scen.faults) p.faults = scen.faults.map((f) => Object.assign({ done: false }, f));
    else p.faults = [];
    if (scen.calls) p.phone.queue = scen.calls.map((c) => Object.assign({}, c));

    p.initializing = true;
    for (let i = 0; i < 3000; i++) step(p, 0.02);
    p.initializing = false;
    p.t = 0;
    p.clock = scen.startClock === undefined ? 22 * 3600 : scen.startClock;
    p.trace.length = 0;
    p.events.length = 0;
    p.rng = mulberry32(sd);
    for (const f of p.faults) f.done = false;
    return p;
  }

  // put the scenario on its critical rod (or boron) position so it starts in
  // equilibrium instead of part-way through a transient nobody asked for
  function trim(p, tAvg, n0, which) {
    const st = {
      tAvg: tAvg,
      tFuel: tAvg + (n0 * C.P0) / C.UA_GAP + (n0 * C.P0) / C.UA_FILM,
      boron: p.ctl.boron, bankD: p.ctl.bankD, sdBank: p.ctl.sdBank,
      fp: p.fp, rhoExt: 0
    };
    const f = (v) => {
      if (which === 'boron') st.boron = v; else st.bankD = v;
      return R.total(st, p.core).total;
    };
    let lo = which === 'boron' ? 3000 : 0;
    let hi = which === 'boron' ? 0 : 100;
    if (f(lo) * f(hi) > 0) return;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
    }
    const v = (lo + hi) / 2;
    if (which === 'boron') p.ctl.boron = v; else p.ctl.bankD = v;
  }

  function scram(p, reason) {
    if (p.trip.tripped) return;
    p.trip.tripped = true;
    p.trip.t = p.t;
    p.trip.first = reason;
    p.trip.reasons.push(reason);
    p.score.tripCount++;
    if (!p.core.atws) p.ctl.rodsDropping = true;
    p.sec.turbTripped = true;
    p.ctl.rodMode = 'MANUAL';
    p.ctl.rodCmd = 0;
    p.events.push({ t: p.t, k: 'trip', v: reason });
  }

  function actuateSI(p, why) {
    if (p.si.on || p.si.blocked) return;
    p.si.on = true;
    p.si.t = p.t;
    p.sec.mfw = false;
    for (const d of p.elec.edg) d.cmd = true;
    p.cont.isolated = true;
    for (const a of p.sec.afw) a.auto = true;
    p.events.push({ t: p.t, k: 'si', v: why });
  }

  function stepElectrical(p, dt) {
    const e = p.elec;
    if (e.offsiteFail) e.offsite = false;
    for (const d of e.edg) {
      if (d.cmd && !d.failed) {
        d.t += dt;
        if (d.t > 10) { d.running = true; d.ready = true; }
      } else if (!d.cmd) {
        d.t = 0; d.running = false; d.ready = false;
      }
    }
    e.busA = e.offsite ? 'offsite' : (e.edg[0].running ? 'edg' : 'dead');
    e.busB = e.offsite ? 'offsite' : (e.edg[1].running ? 'edg' : 'dead');

    const acDead = e.busA === 'dead' && e.busB === 'dead';
    if (acDead) e.battery = Math.max(0, e.battery - dt / (e.battHours * 3600));
    else e.battery = Math.min(1, e.battery + dt / 7200);
    e.battV = 105 + 20 * Math.min(1, e.battery * 3.2);
    if (e.battery <= 0) e.battV = 0;

    for (let i = 0; i < 4; i++) p.th.pumps[i].power = e.offsite;
  }

  function stepSystems(p, dt) {
    const th = p.th, ctl = p.ctl, ind = p.ind, sec = p.sec, e = p.elec;

    if (ctl.rodsDropping) {
      ctl.bankD = Math.max(0, ctl.bankD - (100 / 2.2) * dt);
      ctl.sdBank = Math.min(1, ctl.sdBank + dt / 2.2);
      if (ctl.bankD === 0 && ctl.sdBank === 1) ctl.rodsDropping = false;
    } else if (!ctl.rodFail) {
      let cmd = ctl.rodCmd;
      let speed = 0.5;
      if (ctl.rodMode === 'AUTO' && !p.trip.tripped && ind.power > 14) {
        // gentle near the deadband, or the rods chase their own overshoot
        const err = ind.tAvg - ind.tRef;
        const db = 1.0;
        if (Math.abs(err) > db) {
          cmd = err > 0 ? -1 : 1;
          speed = Math.min(1.2, Math.max(0.05, (Math.abs(err) - db) * 0.28));
        } else cmd = 0;
      }
      if (cmd) ctl.bankD = Math.min(100, Math.max(0, ctl.bankD + cmd * speed * dt));
      if (ctl.sdCmd) ctl.sdBank = Math.min(1, Math.max(0, ctl.sdBank - ctl.sdCmd * 0.006 * dt));
    }

    if (ctl.boronCmd) {
      ctl.boron = Math.max(0, ctl.boron + ctl.boronCmd * ctl.boronRate * dt);
      ctl.charging = 5 + (ctl.boronCmd < 0 ? 3 : 3);
    }

    const bs = R.bankShape(ctl.bankD);
    const aoFast = -30 * (1 - bs);
    p.core.axialOffset += (aoFast - p.core.axialOffset) * (1 - Math.exp(-dt / 2600));
    p.core.axialOffset = p.core.axialOffset * 0.7 + aoFast * 0.3;

    const pz = th.p;
    if (ctl.heaterMode === 'AUTO') {
      th.qHeaters = pz < 15.51 ? C.HTR_MAX * Math.min(1, (15.51 - pz) / 0.25) : 0;
      if (ind.pzrLevel < 17) th.qHeaters = 0;
    } else if (ctl.heaterMode === 'ON') th.qHeaters = C.HTR_MAX * (ind.pzrLevel < 17 ? 0 : 1);
    else th.qHeaters = 0;
    if (e.busA === 'dead' && e.busB === 'dead') th.qHeaters = 0;

    const anyPump = th.pumps.some((q) => q.w > 500);
    if (ctl.sprayMode === 'AUTO') th.wSpray = anyPump && pz > 15.65 ? C.SPRAY_MAX * Math.min(1, (pz - 15.65) / 0.21) : 0;
    else th.wSpray = anyPump ? C.SPRAY_MAX * ctl.sprayManual : 0;

    for (let i = 0; i < 2; i++) {
      if (ctl.porvMode[i] === 'AUTO') th.porvOpen[i] = ind.pPzr > (th.porvOpen[i] ? 15.75 : 15.9);
      else th.porvOpen[i] = ctl.porvMode[i] === 'OPEN';
      if (th.porvStuck && th.porvStuck[i]) th.porvOpen[i] = true;
      th.porvBlock[i] = ctl.porvBlockCmd[i];
    }

    const lProg = Math.min(60, Math.max(25, 25 + (35 * (ind.tAvg - 292)) / (C.TAVG_NOM - 292)));
    p.ctl.levelProg = lProg;
    // two charging pumps normally; the third lines up only on safety injection
    const chgMax = p.si.on ? 45 : 15;
    if (ctl.chargingMode === 'AUTO') {
      ctl.charging = Math.min(chgMax, Math.max(0, 5 + (lProg - ind.pzrLevel) * 2.2));
      if (ctl.boronCmd) ctl.charging = Math.max(ctl.charging, 8);
    } else ctl.charging = Math.min(ctl.charging, chgMax);
    th.wCharging = ctl.charging * (e.busA !== 'dead' || e.busB !== 'dead' ? 1 : 0);
    th.wLetdown = ctl.letdown * (ind.pzrLevel > 12 ? 1 : 0);

    let running = 0;
    for (let i = 0; i < 4; i++) if (th.pumps[i].w > 500) running++;
    th.qLossAmb = 1.2e6 - 5e6 * running;

    if (p.si.on) {
      let hpi = 0;
      const buses = [e.busA, e.busB];
      for (let i = 0; i < 2; i++) {
        if (p.si.hpi[i] && buses[i] !== 'dead') hpi += 26 * Math.min(1, Math.max(0, (12.4 - th.p) / 6));
      }
      th.wHpi = hpi;
      let lpi = 0;
      for (let i = 0; i < 2; i++) {
        if (p.si.lpi[i] && buses[i] !== 'dead') lpi += 120 * Math.min(1, Math.max(0, (1.55 - th.p) / 0.9));
      }
      th.wLpi = lpi;
    } else { th.wHpi = 0; th.wLpi = 0; }

    let acc = 0;
    for (let i = 0; i < 4; i++) {
      if (!p.si.accIso[i] && p.si.accM[i] > 0 && th.p < 4.14) {
        const w = 260 * Math.sqrt(Math.max(4.14 - th.p, 0) / 4.14) * Math.min(1, p.si.accM[i] / 3000);
        p.si.accM[i] = Math.max(0, p.si.accM[i] - w * dt);
        acc += w;
      }
    }
    p.si.accFlow = acc;
    th.wAcc = acc;

    const wBor = th.wHpi + th.wLpi + acc;
    if (wBor > 0) ctl.boron += ((2300 - ctl.boron) * wBor / Math.max(th.mSys, 1000)) * dt;

    if (sec.turbTripped) th.turbValve = Math.max(0, th.turbValve - dt / 0.3);
    else {
      const tgt = ctl.turbDemand / 100;
      const rate = (ctl.loadRate / 100) / 60;
      th.turbValve += Math.min(Math.max(tgt - th.turbValve, -rate * dt * 2), rate * dt);
      th.turbValve = Math.min(1, Math.max(0, th.turbValve));
    }
    if (sec.condVac < 0.5) th.turbValve = Math.min(th.turbValve, 0.05);

    if (!e.offsite) sec.condVac = Math.max(0, sec.condVac - dt / 240);
    else if (th.turbValve < 0.02 && !sec.turbTripped) sec.condVac = Math.min(1, sec.condVac + dt / 300);
    else sec.condVac = Math.min(1, sec.condVac + dt / 600);

    if (sec.dumpMode === 'AUTO') {
      const err = ind.tAvg - ind.tRef;
      th.dumpValve = Math.min(1, Math.max(0, (err - 1.7) / 8));
    } else th.dumpValve = sec.dumpManual;
    if (sec.condVac < 0.5 || (e.busA === 'dead' && e.busB === 'dead')) th.dumpValve = 0;

    if (ind.sgNr.some((l) => l > 82) || p.si.on || !e.offsite) sec.mfw = false;
    for (let i = 0; i < 4; i++) {
      const sg = th.sg[i];
      sg.porv = sec.sgPorv[i] > 0;
      if (sec.mfw) {
        const dem = sec.feedMode[i] === 'AUTO'
          ? sg.wSteam + (55 * (60 - ind.sgNr[i])) / 10
          : (C.W_STEAM_NOM / 4) * sec.feedManual[i];
        sg.wFeed = Math.min(Math.max(dem, 0), 700);
      } else sg.wFeed = 0;
    }

    const lolo = ind.sgNr.some((l) => l < 17);
    for (const a of p.sec.afw) {
      const start = a.auto && (lolo || p.si.on || (!sec.mfw && p.trip.tripped));
      let can = true;
      if (a.kind === 'MOTOR') can = (a.bus === 'A' ? e.busA : e.busB) !== 'dead';
      else can = e.battV > 105 && Math.max.apply(null, th.sg.map((s) => s.p)) > 1.0;
      a.running = (start || a.manual) && can && !a.failed;
    }
    let afwTot = 0;
    for (const a of p.sec.afw) if (a.running) afwTot += a.cap;
    const openV = sec.afwValves.filter(Boolean).length;
    for (let i = 0; i < 4; i++) {
      const sg = th.sg[i];
      const want = sec.afwValves[i] && openV > 0 ? afwTot / openV : 0;
      sg.wAfw = ind.sgNr[i] > 78 ? want * 0.15 : want;
    }

    th.tFeed = sec.mfw ? C.TFW_NOM : C.TAFW;

    let wTurbSteam = 0;
    for (let i = 0; i < 4; i++) wTurbSteam += (C.W_STEAM_NOM / 4) * th.turbValve * (th.sg[i].p / C.P_SEC_NOM);
    const hDrop = S.hg(Math.max(th.sg[0].p, 0.2)) - S.hf(C.TFW_NOM);
    p.mwe = sec.turbTripped ? 0 : Math.max(0, 0.34 * wTurbSteam * hDrop) / 1e6;
    if (!e.offsite) p.mwe = 0;
  }

  function stepContainment(p, dt) {
    const th = p.th, c = p.cont;
    let wIn = 0, hIn = 0;

    if (th.wRelief > 0) {
      p.prt.m += th.wRelief * dt;
      if (p.prt.m > 1400) p.prt.burst = true;
      if (p.prt.burst) { wIn += th.wRelief; hIn += S.hg(th.p); }
    }
    if (th.breakArea > 0 && !th.breakToSec) {
      wIn += th.wBreak;
      hIn += th.subcool > 2 ? S.hf(th.tHot) : S.hg(th.p);
    }
    const energy = wIn * (hIn - 1.4e5) * dt;
    c.energy = Math.max(0, c.energy + energy);

    let rem = 0;
    if (c.spray && (p.elec.busA !== 'dead' || p.elec.busB !== 'dead')) rem += 1.2e8;
    rem += c.fans * 2e7 * ((p.elec.busA !== 'dead' || p.elec.busB !== 'dead') ? 1 : 0);
    c.energy = Math.max(0, c.energy - rem * dt);

    c.p = 0.1013 + c.energy / (50000 * 2.33e7);
    c.t = 32 + (c.p - 0.1013) * 620;
    if (c.p > 0.42) {
      const leak = (c.p - 0.42) * 400 * dt;
      c.energy = Math.max(0, c.energy - leak * 1e5);
      p.rad.released += leak * p.rad.cont * 1e-4;
    }
  }

  function stepRadiation(p, dt) {
    const th = p.th, r = p.rad;
    if (th.tClad > 1204) {
      r.cladFail = Math.min(1, r.cladFail + ((th.tClad - 1204) / 500) * 0.002 * dt);
    }
    if (th.tFuelPeak > 2865) p.score.coreDamage = true;
    r.rcs = 1 + 3000 * r.cladFail + 900 * (p.score.coreDamage ? 1 : 0);

    let toCont = 0;
    if (th.breakArea > 0 && !th.breakToSec) toCont += th.wBreak;
    if (p.prt.burst) toCont += th.wRelief;
    r.cont = Math.max(1, r.cont + (toCont * r.rcs * 2e-4 - (r.cont - 1) * 2e-5) * dt);

    for (let i = 0; i < 4; i++) {
      const leak = th.breakToSec && i === th.rupturedSG ? th.wBreak : 0;
      const tgt = 1 + leak * r.rcs * 0.35;
      r.steamLine[i] += (tgt - r.steamLine[i]) * (1 - Math.exp(-dt / 30));
      const sg = th.sg[i];
      const relief = sg.wSteam * (sg.p > 7.9 || sg.porv ? 1 : 0);
      // a solid generator relieves water, which carries far more activity than steam
      if (relief > 0) r.released += relief * (r.steamLine[i] - 1) * (sg.solid ? 8e-5 : 1e-5) * dt;
    }
  }

  function stepAux(p, dt) {
    const a = p.aux;
    if (!a.to) return;
    a.eta -= dt;
    if (a.eta <= 0) {
      a.at = a.to;
      a.to = null;
      a.busy = false;
      const rep = doAuxTask(p);
      a.log.push({ t: p.t, text: rep });
      p.phone.ringing = true;
      p.phone.active = { from: DH.L('aux.from'), lines: [rep], i: 0, ch: 0 };
    }
  }

  function doAuxTask(p) {
    const task = p.aux.task;
    const th = p.th;
    switch (task) {
      case 'AFW_CHECK': {
        const shut = p.sec.afwValves.map((v, i) => (v ? null : i + 1)).filter((x) => x);
        return shut.length
          ? DH.L('aux.afwShut', shut.join(' / '))
          : DH.L('aux.afwOk', p.sec.afw.filter((x) => x.running).map((x) => x.id).join(', '));
      }
      case 'AFW_OPEN':
        for (let i = 0; i < 4; i++) p.sec.afwValves[i] = true;
        return DH.L('aux.afwOpened');
      case 'PORV_CHECK': {
        const hot = th.wRelief > 0.5 || p.prt.m > 200;
        return hot ? DH.L('aux.porvHot') : DH.L('aux.porvCold');
      }
      case 'DG_START': {
        const d = p.elec.edg.find((x) => x.failed);
        if (d) { d.failed = false; d.cmd = true; return DH.L('aux.dgReset', d.id); }
        return DH.L('aux.dgOk');
      }
      case 'SG_SAMPLE': {
        let worst = 0, wi = 0;
        for (let i = 0; i < 4; i++) if (p.rad.steamLine[i] > worst) { worst = p.rad.steamLine[i]; wi = i; }
        return worst > 3 ? DH.L('aux.sgHot', wi + 1) : DH.L('aux.sgClean');
      }
      case 'SWGR_CHECK':
        return DH.L('aux.swgr', p.elec.busA, p.elec.busB, p.elec.battV.toFixed(0));
      case 'LOAD_SHED':
        p.elec.battHours = 9;
        return DH.L('aux.shed');
      case 'TURB_CHECK':
        return p.sec.turbTripped ? DH.L('aux.turbTripped') : DH.L('aux.turbOn', p.ind.mwe.toFixed(0));
      default:
        return DH.L('aux.nothing', AUX_LOCS[p.aux.at].name());
    }
  }

  function stepFaults(p) {
    for (const f of p.faults) {
      if (f.done || p.t < f.t) continue;
      f.done = true;
      applyFault(p, f);
      p.events.push({ t: p.t, k: 'fault', v: f.kind });
    }
  }

  function applyFault(p, f) {
    const th = p.th;
    switch (f.kind) {
      case 'porvStuck':
        th.porvStuck = th.porvStuck || [false, false];
        th.porvStuck[f.i || 0] = true;
        break;
      case 'mfwTrip': p.sec.mfw = false; p.sec.mfwFailed = true; break;
      case 'afwValvesShut': for (let i = 0; i < 4; i++) p.sec.afwValves[i] = false; break;
      case 'afwPumpFail': p.sec.afw[f.i].failed = true; break;
      case 'loca': th.breakArea = f.area; break;
      case 'sgtr': th.breakArea = f.area; th.breakToSec = true; th.rupturedSG = f.i || 0; th.tubeRupture = 1; break;
      case 'lossOffsite': p.elec.offsiteFail = true; p.elec.offsite = false; break;
      case 'dgFail': p.elec.edg[f.i].failed = true; break;
      case 'rodEject': p.ctl.rodEjected = true; break;
      case 'atws': p.core.atws = true; break;
      case 'rcpTrip': th.pumps[f.i].on = false; break;
      case 'steamBreak': th.sg[f.i].breakArea = f.area; break;
      case 'condenser': p.sec.condVac = 0; break;
      case 'rodFail': p.ctl.rodFail = true; break;
    }
  }

  function stepAlarms(p, dt) {
    p.newAlarm = false;
    for (const a of ALARMS) {
      const st = p.alarms[a.id];
      const on = a.f(p);
      if (on && st.st === 0) {
        st.st = 1; st.t = p.t;
        p.newAlarm = true;
        p.lastAlarmT = p.t;
        p.alarmOrder.push(a.id);
        p.events.push({ t: p.t, k: 'alarm', v: a.id });
      } else if (!on && st.st !== 0) {
        st.st = 0;
        const ix = p.alarmOrder.indexOf(a.id);
        if (ix >= 0) p.alarmOrder.splice(ix, 1);
      }
    }
  }

  function acknowledge(p) {
    for (const id in p.alarms) if (p.alarms[id].st === 1) p.alarms[id].st = 2;
  }

  function stepTrips(p) {
    const ind = p.ind;
    ind.dTsp = C.DT_NOM * (1.14 - 0.026 * (ind.tAvg - C.TAVG_NOM) + 2.6 * (ind.pPzr - 15.5) / 15.5);
    p.ctl.p10Block = ind.power > 11;
    p.ctl.srBlock = ind.power > 0.01;

    if (ind.pPzr < 11.7 || p.cont.p > 0.117 || Math.min.apply(null, ind.sgP) < 4.8) {
      actuateSI(p, ind.pPzr < 11.7 ? 'PRESSURIZER PRESSURE LOW-LOW' : (p.cont.p > 0.117 ? 'CONTAINMENT PRESSURE HIGH' : 'STEAM LINE PRESSURE LOW'));
    }
    if (p.trip.tripped) return;
    for (const tr of TRIPS) {
      // store the id, not the text: a saved reason must not depend on language
      if (tr.f(p)) { scram(p, tr.id); return; }
    }
  }

  function stepScore(p, dt) {
    const s = p.score, th = p.th, ind = p.ind;
    if (th.tFuelPeak > s.peakFuel) s.peakFuel = th.tFuelPeak;
    if (th.tClad > s.peakClad) s.peakClad = th.tClad;
    if (th.coreCovered < 0.999) s.uncoveredTime += dt;
    if (ind.subcool < s.minSubcool && ind.power > 1) s.minSubcool = ind.subcool;
    if (ind.sur > s.peakSur) s.peakSur = ind.sur;
    if (ind.power > s.peakPower) s.peakPower = ind.power;
    // a low generator is only a violation if nothing is feeding it; draining one
    // deliberately during a cooldown is the procedure, not a breach
    const starved = th.sg.some((g, i) => ind.sgNr[i] < 17 && g.wFeed + g.wAfw < 2);
    const viol =
      (ind.power > 100.5) ||
      (ind.subcool < 15 && ind.power > 5) ||
      starved ||
      ind.pzrLevel > 92 || (ind.pzrLevel < 17 && ind.power > 5) ||
      p.cont.p > 0.42 ||
      (Math.abs(ind.tAvg - ind.tRef) > 8 && ind.power > 14);
    if (viol) s.techSpecTime += dt;
    s.released = p.rad.released;
    if (p.cont.p > s.peakCntP) s.peakCntP = p.cont.p;
    s.coolantLost += (th.wRelief + th.wBreak) * dt;
    if (ind.subcool < 0) s.satTime += dt;

    p.mwhDelivered += (p.mwe * dt) / 3600;
    const dem = p.scen.demand ? p.scen.demand(p.t) : 1;
    const demMW = 1150 * dem;
    p.mwhDemand += (demMW * dt) / 3600;
  }

  function stepPhone(p, dt) {
    if (p.phone.active) return;
    for (const c of p.phone.queue) {
      if (c.fired) continue;
      const due = c.t !== undefined ? p.t >= c.t : (c.when ? c.when(p) : false);
      if (due) {
        c.fired = true;
        p.phone.ringing = true;
        p.phone.active = { from: c.from ? DH.L(c.from) : DH.L('aux.dispatcher'), lines: DH.L(c.lines), i: 0, ch: 0, demand: c.demand };
        p.events.push({ t: p.t, k: 'call', v: c.lines[0].slice(0, 24) });
        return;
      }
    }
  }

  function step(p, dt) {
    p.t += dt;
    p.clock += dt;

    if (!p.initializing) stepFaults(p);
    stepElectrical(p, dt);
    stepSystems(p, dt);

    const st = {
      tAvg: p.th.tCool, tFuel: p.th.tFuel, boron: p.ctl.boron,
      bankD: p.ctl.bankD, sdBank: p.ctl.sdBank, fp: p.fp,
      rhoExt: (p.ctl.rhoExt || 0) + (p.ctl.rodEjected ? p.ctl.ejectWorth || 800 : 0)
    };
    let rho = R.total(st, p.core);
    p.rho = rho;

    const dhFrac = Dk.step(p.dh, p.k.n, dt);
    const promptFrac = 1 - Dk.TOTAL;
    const qOf = (n) => C.P0 * (promptFrac * n + dhFrac);

    const th = p.th;
    const fb = (n, h) => {
      const q = qOf(n) + 0.4 * th.qZr;
      const tau = C.CF / C.UA_GAP;
      const inf = th.tClad + q / C.UA_GAP;
      th.tFuel = inf + (th.tFuel - inf) * Math.exp(-h / tau);
      st.tFuel = th.tFuel;
      p.rho = R.total(st, p.core);
      return p.rho.total * 1e-5;
    };
    K.step(p.k, rho.total * 1e-5, dt, fb);
    rho = R.total(st, p.core);
    p.rho = rho;

    X.step(p.fp, p.k.n, dt);
    T.step(th, dt);

    stepContainment(p, dt);
    stepRadiation(p, dt);
    stepAux(p, dt);
    DH.Instruments.update(p, dt);
    if (p.initializing) return;
    stepTrips(p);
    stepAlarms(p, dt);
    stepPhone(p, dt);
    stepScore(p, dt);

    p.traceT += dt;
    if (p.traceT >= 1) {
      p.traceT = 0;
      p.trace.push([
        Math.round(p.t),
        p.ind.power, p.th.tAvg, p.th.p, p.ind.pzrLevel, p.ind.subcool,
        p.ind.sgNr[0], p.th.tClad, p.rho.total, p.rho.xenon, p.mwe, p.th.coreCovered
      ]);
      if (p.trace.length > 60000) p.trace.shift();
    }

    if (!p.over) {
      if (p.score.coreDamage) p.over = 'rp.coreDamage';
      else if (p.scen.endAt && p.t >= p.scen.endAt) p.over = 'rp.shiftDone';
    }
  }

  const ACTIONS = {
    rodMode: (p, v) => { p.ctl.rodMode = v; p.ctl.rodCmd = 0; },
    rodCmd: (p, v) => { p.ctl.rodCmd = v; },
    sdCmd: (p, v) => { p.ctl.sdCmd = v; },
    boronCmd: (p, v) => { p.ctl.boronCmd = v; },
    trip: (p) => { p.ctl.manualTrip = true; },
    heaterMode: (p, v) => { p.ctl.heaterMode = v; },
    sprayMode: (p, v) => { p.ctl.sprayMode = v; },
    sprayManual: (p, v) => { p.ctl.sprayManual = v; },
    porvMode: (p, v, i) => { p.ctl.porvMode[i] = v; },
    porvBlock: (p, v, i) => { p.ctl.porvBlockCmd[i] = v; },
    rcp: (p, v, i) => { p.th.pumps[i].on = v; },
    chargingMode: (p, v) => { p.ctl.chargingMode = v; },
    charging: (p, v) => { p.ctl.chargingMode = 'MANUAL'; p.ctl.charging = v; },
    letdown: (p, v) => { p.ctl.letdown = v; },
    turbDemand: (p, v) => { p.ctl.turbDemand = v; },
    loadRate: (p, v) => { p.ctl.loadRate = v; },
    turbTrip: (p) => { p.sec.turbTripped = true; },
    dumpMode: (p, v) => { p.sec.dumpMode = v; },
    dumpManual: (p, v) => { p.sec.dumpManual = v; },
    sgPorv: (p, v, i) => { p.sec.sgPorv[i] = v; },
    feedMode: (p, v, i) => { p.sec.feedMode[i] = v; },
    feedManual: (p, v, i) => { p.sec.feedManual[i] = v; },
    mfw: (p, v) => { p.sec.mfw = v && !p.sec.mfwFailed; },
    afw: (p, v, i) => { p.sec.afw[i].manual = v; },
    si: (p, v) => { if (v) actuateSI(p, 'MANUAL'); else { p.si.on = false; p.si.blocked = true; } },
    hpi: (p, v, i) => { p.si.hpi[i] = v; },
    lpi: (p, v, i) => { p.si.lpi[i] = v; },
    accIso: (p, v, i) => { p.si.accIso[i] = v; },
    contSpray: (p, v) => { p.cont.spray = v; },
    edg: (p, v, i) => { p.elec.edg[i].cmd = v; },
    offsite: (p, v) => { if (!p.elec.offsiteFail) p.elec.offsite = v; },
    ack: (p) => acknowledge(p),
    sampleBoron: (p) => DH.Instruments.sampleBoron(p),
    dispatch: (p, v, task) => {
      if (p.aux.to) return;
      p.aux.to = v; p.aux.task = task; p.aux.busy = true;
      const base = AUX_LOCS[v].travel;
      p.aux.eta = base === 0 ? 5 : base + Math.floor(p.rng() * 110);
    },
    localTask: (p, v) => {
      if (p.aux.to || p.aux.at === 'CTRL') return;
      p.aux.task = v; p.aux.to = p.aux.at; p.aux.eta = 45 + Math.floor(p.rng() * 60); p.aux.busy = true;
    },
    rhoExt: (p, v) => { p.ctl.rhoExt = v; },
    hangUp: (p) => { p.phone.active = null; p.phone.ringing = false; }
  };

  function act(p, type, v, i) {
    const f = ACTIONS[type];
    if (!f) return;
    f(p, v, i);
    p.events.push({ t: p.t, k: 'act', v: type, a: v, i: i });
  }

  DH.Plant = { create, step, act, acknowledge, scram, ALARMS, TRIPS, AUX_LOCS, mulberry32 };
})();
