const DH = require('./harness.js');

let pass = 0, fail = 0;
const results = [];

function t(name, fn) {
  let err = null;
  try { fn(); } catch (e) { err = e; }
  if (err) { fail++; results.push(['FAIL', name, err.message]); }
  else { pass++; results.push(['ok  ', name, '']); }
}

function assert(c, msg) { if (!c) throw new Error(msg); }

function near(a, b, tol, msg) {
  const d = Math.abs(a - b) / (Math.abs(b) || 1);
  if (d > tol) throw new Error(msg + ' — got ' + a + ', expected ~' + b + ' (' + (d * 100).toFixed(1) + '% off)');
}

const DT = 0.02;
const run = (p, secs) => { const n = Math.round(secs / DT); for (let i = 0; i < n; i++) DH.Plant.step(p, DT); };
const mk = (init, seed) => DH.Plant.create({ id: 'test', seed: seed || 99, init: init || { power: 1 } }, seed || 99);
// by id, so inserting a scenario never silently re-points a test at a different one
const scen = (id) => {
  const s = DH.Scenarios.find((x) => x.id === id);
  if (!s) throw new Error('no scenario ' + id);
  return s;
};

// ---------------------------------------------------------------- steady state
t('steady state: full power holds within 0.5% over a simulated hour', () => {
  const p = mk();
  const n0 = p.k.n;
  run(p, 3600);
  assert(!p.trip.tripped, 'reactor tripped with no input: ' + p.trip.first);
  near(p.k.n, n0, 0.005, 'power drifted');
  assert(Math.abs(p.th.tAvg - 308.4) < 1.5, 'T-avg drifted to ' + p.th.tAvg.toFixed(2));
  assert(Math.abs(p.th.p - 15.5) < 0.2, 'RCS pressure drifted to ' + p.th.p.toFixed(3));
});

// ------------------------------------------------------------- Doppler limiting
t('Doppler: +200 pcm settles at a new equilibrium instead of running away', () => {
  const p = mk({ power: 0.5 });
  const n0 = p.k.n;
  p.ctl.rhoExt = 200;
  let peak = 0;
  run(p, 5);
  for (let i = 0; i < 60 * 20 / DT; i++) { DH.Plant.step(p, DT); if (p.k.n > peak) peak = p.k.n; }
  assert(!p.trip.tripped, 'tripped: ' + p.trip.first);
  assert(peak < 1.6 * n0, 'power ran away to ' + peak.toFixed(3));
  assert(p.k.n > n0, 'power did not rise at all');
  assert(Math.abs(p.rho.total) < 20, 'reactivity did not return to zero: ' + p.rho.total.toFixed(1));
  assert(p.th.tAvg > 302, 'temperature did not absorb the insertion');
});

// ----------------------------------------------------------- prompt criticality
t('prompt criticality: +700 pcm is terminated by Doppler with finite fuel temperature', () => {
  const p = mk();
  const tf0 = p.th.tFuel;
  p.ctl.rhoExt = 700;
  let peakN = 0, peakF = 0, tPeak = 0, peakTf = 0;
  for (let i = 0; i < 2 / DT; i++) {
    DH.Plant.step(p, DT);
    if (p.k.n > peakN) { peakN = p.k.n; tPeak = p.t; }
    if (p.th.tFuelPeak > peakF) peakF = p.th.tFuelPeak;
    if (p.th.tFuel > peakTf) peakTf = p.th.tFuel;
  }
  assert(isFinite(peakN) && isFinite(peakF), 'integrator produced a non-finite value');
  assert(peakN > 5, 'no prompt excursion happened (peak ' + peakN.toFixed(2) + ')');
  assert(peakN < 200, 'excursion was not terminated (peak ' + peakN.toFixed(1) + ')');
  assert(tPeak < 0.2, 'peak took ' + tPeak.toFixed(3) + ' s; Doppler should terminate in tens of ms');
  assert(peakF < 2865, 'fuel melted: ' + peakF.toFixed(0) + ' C');
  assert(peakTf > tf0 + 40, 'fuel temperature did not rise, so Doppler was not what stopped it');
  assert(p.k.n < 1, 'power did not come back down');
});

// ---------------------------------------------------------------------- xenon
t('xenon: peaks between 9 and 11 hours after a trip at roughly triple equilibrium', () => {
  const x = DH.Xenon.create(1);
  const eq = x.xe;
  let peak = 0, tPeak = 0;
  for (let s = 1; s <= 20 * 3600; s++) {
    DH.Xenon.step(x, 0, 1);
    if (x.xe > peak) { peak = x.xe; tPeak = s; }
  }
  const h = tPeak / 3600;
  assert(h > 9 && h < 11, 'peak at ' + h.toFixed(2) + ' h');
  const ratio = peak / eq;
  assert(ratio > 2.5 && ratio < 3.5, 'peak/equilibrium ratio ' + ratio.toFixed(2));
  near(DH.Xenon.xeWorth({ xe: eq }), -2700, 0.01, 'equilibrium xenon worth');
});

t('xenon: worth after a full-power trip exceeds available rod worth at the peak', () => {
  const x = DH.Xenon.create(1);
  for (let s = 0; s < 9.5 * 3600; s++) DH.Xenon.step(x, 0, 1);
  const worth = DH.Xenon.xeWorth(x);
  assert(worth < -7000, 'peak xenon only ' + worth.toFixed(0) + ' pcm');
});

// ----------------------------------------------------------------- decay heat
t('decay heat: 6.2% at 1 s, 1.2% at 1 h, 0.6% at 24 h', () => {
  for (const [tt, want] of [[1, 0.062], [3600, 0.012], [86400, 0.006]]) {
    const dh = DH.Decay.create(1);
    DH.Decay.step(dh, 0, tt);
    near(DH.Decay.total(dh), want, 0.08, 'group model at ' + tt + ' s');
    near(DH.Decay.analytic(tt), want, 0.05, 'analytic curve at ' + tt + ' s');
  }
});

t('decay heat: group model tracks the analytic curve across six decades', () => {
  for (const tt of [10, 100, 1000, 1e4, 1e5, 1e6]) {
    const dh = DH.Decay.create(1);
    DH.Decay.step(dh, 0, tt);
    near(DH.Decay.total(dh), DH.Decay.analytic(tt), 0.06, 'group vs analytic at ' + tt + ' s');
  }
});

t('decay heat: 1.2% of 3400 MW is still 41 MW an hour after the trip', () => {
  const p = mk();
  DH.Plant.act(p, 'trip');
  run(p, 3600);
  const mw = DH.Decay.total(p.dh) * 3400;
  assert(mw > 35 && mw < 48, 'decay heat one hour after trip: ' + mw.toFixed(1) + ' MW');
});

// ------------------------------------------------------------------- steam
t('steam tables: IF97 saturation round-trips and matches known points', () => {
  for (const [pp, tt] of [[0.1, 99.6], [1, 179.9], [6.9, 284.8], [15.5, 344.8], [17.2, 353.9]]) {
    near(DH.Steam.tsat(pp), tt, 0.002, 'tsat(' + pp + ')');
    near(DH.Steam.psat(DH.Steam.tsat(pp)), pp, 1e-6, 'psat/tsat round trip at ' + pp);
  }
});

// -------------------------------------------------------- reactivity calibration
t('reactivity: coefficients land on their design values', () => {
  const R = DH.React;
  near(R.mtc(307, 900), -28.5, 0.15, 'moderator coefficient at full power');
  assert(R.mtc(307, 1900) > 0, 'MTC should be positive at beginning of cycle with high boron');
  near(R.bankDiff(50), 128, 0.1, 'peak differential rod worth');
  near(R.doppler(700) - R.doppler(300), -1000, 0.02, 'Doppler defect from hot zero power to full power');
  near(R.betaFor(0), 0.0065, 1e-9, 'beta at beginning of cycle');
  near(R.betaFor(1), 0.0050, 1e-9, 'beta at end of cycle');
});

t('reactivity: scenarios start critical, and a trip leaves the core deeply subcritical', () => {
  const p = mk();
  assert(Math.abs(p.rho.total) < 3, 'not critical at start: ' + p.rho.total.toFixed(2) + ' pcm');
  DH.Plant.act(p, 'trip');
  run(p, 60);
  assert(p.rho.total < -8000, 'only ' + p.rho.total.toFixed(0) + ' pcm subcritical after scram');
  assert(p.ctl.bankD === 0 && p.ctl.sdBank === 1, 'rods did not fully insert');
});

// ------------------------------------------------------------ lying instruments
t('instruments: a flashed reference leg makes indicated level read above true level', () => {
  // Unit test of the transmitter itself. Hold the plant at a depressurised,
  // hot-containment condition and let the instrument layer respond to it.
  const p = mk();
  run(p, 30);
  const trueLevel = p.th.pzrLevel;
  const before = p.ind.pzrLevel - trueLevel;
  assert(Math.abs(before) < 4, 'reference leg is biased before the transient: ' + before.toFixed(1));

  p.th.p = 0.6;
  p.cont.t = 180;
  for (let i = 0; i < 1800 / DT; i++) DH.Instruments.update(p, DT);

  assert(p.ind.refLegT > DH.Steam.tsat(p.th.p),
    'leg at ' + p.ind.refLegT.toFixed(0) + ' C is not above saturation ' + DH.Steam.tsat(p.th.p).toFixed(0));
  assert(p.ind.refLegVoid > 0.9, 'reference leg did not flash (void ' + p.ind.refLegVoid.toFixed(2) + ')');
  const after = p.ind.pzrLevel - trueLevel;
  assert(after > before + 25,
    'indicated level only ' + after.toFixed(1) + ' points above true (was ' + before.toFixed(1) + ')');
});

t('instruments: a hot reference leg biases level high even without flashing', () => {
  // The commonly reachable version of the same error: the leg is heated by the
  // containment, its water gets less dense, and the transmitter reads high.
  const p = mk();
  run(p, 30);
  const before = p.ind.pzrLevel - p.th.pzrLevel;
  p.si.blocked = true;
  p.th.breakArea = 0.006;
  for (let i = 0; i < 4; i++) DH.Plant.act(p, 'sgPorv', 1, i);
  run(p, 3600);
  assert(p.cont.t > 95, 'containment did not heat the leg: ' + p.cont.t.toFixed(0) + ' C');
  assert(p.ind.refLegT > 100, 'reference leg stayed cold: ' + p.ind.refLegT.toFixed(0) + ' C');
  assert(p.th.pzrLevel < 1, 'pressurizer should be empty by now');
  assert(p.ind.pzrLevel > p.th.pzrLevel + 3,
    'indicated level ' + p.ind.pzrLevel.toFixed(1) + ' should read high of true ' + p.th.pzrLevel.toFixed(1));
  assert(p.ind.pzrLevel > before, 'the bias did not grow as the leg heated');
});

t('instruments: thermocouples lag the true temperature during a fast transient', () => {
  const p = mk();
  run(p, 30);
  DH.Plant.act(p, 'trip');
  run(p, 4);
  assert(p.ind.tHot[0] > p.th.tHot + 1.5,
    'indicated hot leg ' + p.ind.tHot[0].toFixed(2) + ' should still be above true ' + p.th.tHot.toFixed(2));
});

t('instruments: narrow and wide range disagree once level leaves the narrow span', () => {
  const p = mk();
  p.sec.mfwFailed = true;
  p.sec.mfw = false;
  run(p, 240);
  assert(p.ind.sgNr[0] < 5, 'narrow range did not go off scale low: ' + p.ind.sgNr[0].toFixed(1));
  assert(p.ind.sgWr[0] > p.ind.sgNr[0] + 10, 'wide range should still be reading on scale');
});

// ----------------------------------------------------------------- determinism
t('determinism: same seed and same input script produce an identical trace', () => {
  const script = [
    [12, 'rodMode', 'MANUAL'], [14, 'rodCmd', -1], [30, 'rodCmd', 0],
    [45, 'heaterMode', 'ON'], [60, 'turbDemand', 70], [90, 'rcp', false, 0],
    [140, 'porvMode', 'OPEN', 0], [200, 'porvBlock', false, 0], [260, 'trip'],
    [300, 'dispatch', 'AFW', 'AFW_CHECK'], [420, 'ack']
  ];
  function play() {
    const p = DH.Plant.create(scen('loadfollow'), 4242);
    let si = 0;
    for (let i = 0; i < 900 / DT; i++) {
      while (si < script.length && p.t >= script[si][0]) {
        DH.Plant.act(p, script[si][1], script[si][2], script[si][3]);
        si++;
      }
      DH.Plant.step(p, DT);
    }
    return p;
  }
  const a = play(), b = play();
  assert(a.trace.length === b.trace.length, 'trace lengths differ');
  for (let i = 0; i < a.trace.length; i++) {
    for (let k = 0; k < a.trace[i].length; k++) {
      if (a.trace[i][k] !== b.trace[i][k]) {
        throw new Error('trace diverged at sample ' + i + ' field ' + k + ': ' + a.trace[i][k] + ' vs ' + b.trace[i][k]);
      }
    }
  }
  assert(a.events.length === b.events.length, 'event lists differ');
  assert(a.aux.eta === b.aux.eta && a.rad.released === b.rad.released, 'random-driven state diverged');
  assert(a.trace.length > 500, 'trace was too short to be meaningful');
});

t('determinism: a different seed actually changes something', () => {
  const a = DH.Plant.create(scen('loadfollow'), 1);
  const b = DH.Plant.create(scen('loadfollow'), 2);
  DH.Plant.act(a, 'dispatch', 'AFW', 'AFW_CHECK');
  DH.Plant.act(b, 'dispatch', 'AFW', 'AFW_CHECK');
  assert(a.aux.eta !== b.aux.eta, 'seed had no effect on the field operator walk time');
});

// -------------------------------------------------------------- plant behaviour
t('natural circulation removes decay heat after the pumps are lost', () => {
  const p = mk();
  DH.Plant.act(p, 'trip');
  run(p, 120);
  for (let i = 0; i < 4; i++) DH.Plant.act(p, 'rcp', false, i);
  run(p, 3600);
  assert(p.th.flowFrac > 0.01 && p.th.flowFrac < 0.06, 'natural circulation flow ' + (p.th.flowFrac * 100).toFixed(2) + '%');
  const dT = p.th.tHot - p.th.tCold;
  assert(dT > 8 && dT < 45, 'loop delta-T ' + dT.toFixed(1) + ' C is not a natural circulation number');
  assert(p.ind.subcool > 15, 'lost subcooling on natural circulation: ' + p.ind.subcool.toFixed(1));
  assert(p.th.coreCovered > 0.999, 'core uncovered on natural circulation');
});

t('loss of feedwater with auxiliary feedwater available keeps the core covered', () => {
  const p = DH.Plant.create(scen('lofw'));
  run(p, scen('lofw').endAt);
  assert(p.trip.tripped, 'reactor should have tripped on low steam generator level');
  assert(p.th.coreCovered > 0.999, 'core uncovered');
  assert(p.score.peakClad < 500, 'clad reached ' + p.score.peakClad.toFixed(0) + ' C');
  assert(p.sec.afw.some((a) => a.running), 'auxiliary feedwater never started');
});

t('a stuck-open PORV empties the pressurizer while the level gauge reads high', () => {
  const p = mk();
  run(p, 20);
  p.th.porvStuck = [true, false];
  run(p, 900);
  assert(p.th.p < 13, 'RCS did not depressurise: ' + p.th.p.toFixed(2) + ' MPa');
  assert(p.si.on, 'safety injection never actuated');
  assert(p.ind.pzrLevel > p.th.pzrLevel - 1, 'indicated level should not read below true level here');
  assert(p.prt.m > 500, 'nothing accumulated in the relief tank');
});

t('shutting the block valve stops a stuck-open PORV', () => {
  const p = mk();
  run(p, 20);
  p.th.porvStuck = [true, false];
  run(p, 200);
  const pLow = p.th.p;
  DH.Plant.act(p, 'porvBlock', false, 0);
  run(p, 600);
  assert(p.th.wRelief === 0, 'relief flow continued after the block valve shut');
  assert(p.th.p > pLow, 'pressure did not recover after isolating the PORV');
});

t('scenario 6 is unsolvable from the chair and solvable with the field operator', () => {
  const s = scen('lofw-shut');
  const a = DH.Plant.create(s);
  run(a, 2400);
  assert(a.sec.afwValves.every((v) => !v), 'valves should still be shut with no dispatch');
  assert(a.sec.afw.some((x) => x.running), 'pumps should be running, which is exactly the trap');
  assert(a.ind.sgNr[0] < 5, 'level should be off scale low: ' + a.ind.sgNr[0].toFixed(1));
  assert(a.th.sg[0].m < 21000, 'generators should still be draining: ' + a.th.sg[0].m.toFixed(0) + ' kg');

  const b = DH.Plant.create(s);
  run(b, 330);
  DH.Plant.act(b, 'dispatch', 'AFW', 'AFW_OPEN');
  run(b, 2070);
  assert(b.sec.afwValves.every((v) => v), 'operator did not open the valves');
  assert(b.th.sg[0].m > a.th.sg[0].m + 15000,
    'dispatching the operator did not refill the generators: ' + b.th.sg[0].m.toFixed(0) + ' vs ' + a.th.sg[0].m.toFixed(0));
  assert(b.th.coreCovered > 0.999, 'core uncovered even with feed restored');
});

t('every scenario runs its full duration without a non-finite state', () => {
  for (const s of DH.Scenarios) {
    const p = DH.Plant.create(s);
    const n = Math.round(s.endAt / DT);
    for (let i = 0; i < n; i++) {
      DH.Plant.step(p, DT);
      if (i % 5000 === 0) {
        const vals = [p.k.n, p.th.p, p.th.tAvg, p.th.tFuel, p.th.tClad, p.th.mSys, p.cont.p, p.rho.total];
        for (const v of vals) {
          if (!isFinite(v)) throw new Error(s.id + ' produced a non-finite value at t=' + p.t.toFixed(1));
        }
      }
    }
    assert(isFinite(p.k.n), s.id + ' finished with a non-finite power');
  }
});

t('scoring produces a grade for a run and never a non-finite number', () => {
  const p = DH.Plant.create(scen('cleantrip'));
  run(p, 600);
  const sc = DH.Replay.score(p);
  assert(['A', 'B', 'C', 'D', 'F'].indexOf(sc.grade) >= 0, 'bad grade ' + sc.grade);
  assert(isFinite(sc.safety) && isFinite(sc.econ) && isFinite(sc.total), 'non-finite score');
});

t('all fourteen scenarios are registered with the data a run needs', () => {
  assert(DH.Scenarios.length === 14, 'expected 14 scenarios, found ' + DH.Scenarios.length);
  const ids = new Set();
  for (const s of DH.Scenarios) {
    assert(s.id && !ids.has(s.id), 'duplicate or missing id: ' + s.id);
    ids.add(s.id);
    assert(s.title && s.teaches && s.brief.length && s.objectives.length, s.id + ' is missing briefing data');
    assert(s.endAt > 0 && s.seed > 0, s.id + ' is missing endAt or seed');
    assert(typeof s.demand === 'function', s.id + ' has no demand curve');
  }
});

// ---- console layout -----------------------------------------------------
// The boards are drawn into a fixed panorama, so a widget placed on top of
// another one is a permanent defect that no amount of playing works around.
const L = require('./layout.js');
// Panel text below this many panorama units lands under ~6.5 css px on a 1600px
// window and does not survive the lens. Nothing on a board may shrink past it.
const FLOOR = 7.6;

t('no two things on a board are drawn on top of each other', () => {
  const B = L.load(DH);
  // a transient state so lamps, bands and variable-width readouts are populated
  const p = DH.Plant.create(scen('porv'), 12345);
  run(p, 300);
  for (const b of B.boards()) {
    const r = L.measure(b, p);
    for (let i = 0; i < r.length; i++) {
      for (let j = i + 1; j < r.length; j++) {
        const d = L.overlap(r[i], r[j]);
        assert(d < 1, b.name + ': ' + L.where(r[i]) + ' overlaps ' + L.where(r[j]) + ' by ' + d.toFixed(0) + 'px');
      }
    }
  }
});

t('every widget stays inside its own board and on one side of the bench lip', () => {
  const B = L.load(DH);
  const p = DH.Plant.create(scen('startup'), 7);
  run(p, 60);
  for (const b of B.boards()) {
    for (const r of L.measure(b, p)) {
      assert(r.x >= b.x0 + 2 && r.x + r.w <= b.x1 - 2,
        b.name + ': ' + L.where(r) + ' runs past the panel seam');
      assert(r.y >= B.TOP + 4 && r.y + r.h <= 916,
        b.name + ': ' + L.where(r) + ' is off the top or behind the desk');
      assert(r.y >= B.LIP || r.y + r.h <= B.LIP,
        b.name + ': ' + L.where(r) + ' straddles the bench lip');
    }
  }
});

t('every gauge caption still renders at a legible size on its own dial', () => {
  const B = L.load(DH);
  const p = DH.Plant.create(scen('startup'), 7);
  run(p, 60);
  for (const b of B.boards()) {
    for (const r of L.measure(b, p)) {
      for (const [s, size] of r.face || []) {
        assert(size >= FLOOR, b.name + ': "' + s + '" shrinks to ' + size.toFixed(1) + ' units to fit its dial');
      }
    }
  }
});

t('no two controls share a click target', () => {
  const B = L.load(DH);
  for (const b of B.boards()) {
    for (let i = 0; i < b.ctrls.length; i++) {
      for (let j = i + 1; j < b.ctrls.length; j++) {
        const d = L.overlap(b.ctrls[i], b.ctrls[j]);
        assert(d === 0, b.name + ': click targets ' + b.ctrls[i].tip + ' / ' + b.ctrls[j].tip + ' overlap by ' + d.toFixed(0) + 'px');
      }
    }
  }
});

t('every console checkout step points at something that still exists', () => {
  const B = L.load(DH);
  assert(DH.Tutor.STEPS.length > 10, 'the checkout lost its steps');
  const seen = { fire: 0, go: 0, focus: 0 };
  for (let i = 0; i < DH.Tutor.STEPS.length; i++) {
    const s = DH.Tutor.STEPS[i];
    assert(DH.L(s.t).length > 20, 'checkout step ' + (i + 1) + ' has no text');
    // resolving throws if a tooltip or board name it names has been renamed
    if (s.focus) {
      const f = s.focus();
      seen.focus++;
      assert(f.w > 0 && f.h > 0, 'checkout step ' + (i + 1) + ' highlights nothing');
      assert(f.y >= B.TOP && f.y + f.h <= B.BOT, 'checkout step ' + (i + 1) + ' highlights off the console');
    }
    if (s.point) assert(isFinite(s.point()), 'checkout step ' + (i + 1) + ' points nowhere');
    if (s.fire) { seen.fire++; assert(s.after, 'checkout step ' + (i + 1) + ' breaks something without explaining it'); }
    if (s.go) seen.go++;
    assert(!(s.go && s.last), 'checkout step ' + (i + 1) + ' both waits and finishes');
    assert(!s.after || s.fire, 'checkout step ' + (i + 1) + ' has an aftermath but breaks nothing');
  }
  assert(seen.go > 12, 'the checkout barely asks the player to do anything');
  assert(DH.Tutor.STEPS[DH.Tutor.STEPS.length - 1].last, 'the checkout has no last step');
});

t('the checkout fires only real plant actions', () => {
  L.load(DH);
  for (const s of DH.Tutor.STEPS) {
    if (!s.fire) continue;
    const p = DH.Plant.create(scen('startup'), 5);
    run(p, 20);
    const before = JSON.stringify([p.ctl.charging, p.elec.offsite]);
    s.fire(p);
    run(p, 30);
    assert(JSON.stringify([p.ctl.charging, p.elec.offsite]) !== before, 'a checkout step fired nothing');
    assert(isFinite(p.th.p) && isFinite(p.k.n), 'a checkout step left the plant non-finite');
  }
});

// ---- translation --------------------------------------------------------
t('the dictionary is complete and paired in both languages', () => {
  const T = DH.I18N.T;
  const keys = Object.keys(T);
  assert(keys.length > 400, 'the dictionary lost entries: ' + keys.length);
  for (const k of keys) {
    const e = T[k];
    assert(Array.isArray(e) && e.length === 2, k + ' is not an [en, fr] pair');
    assert(e[0] !== undefined && e[0] !== '' && e[1] !== undefined && e[1] !== '', k + ' is missing a language');
    assert(typeof e[0] === typeof e[1], k + ' has different shapes in the two languages');
    if (Array.isArray(e[0])) assert(e[0].length === e[1].length, k + ' has a different number of lines per language');
  }
});

t('nothing asks for a string that does not exist, in either language', () => {
  const B = L.load(DH);
  for (const lang of DH.I18N.LANGS) {
    DH.I18N.set(lang);
    B.reset();
    const p = DH.Plant.create(scen('porv'), 3);
    run(p, 700);
    for (const b of B.boards()) L.measure(b, p);
    for (const a of DH.Plant.ALARMS) a.t();
    for (const tr of DH.Plant.TRIPS) tr.t();
    for (const k in DH.Plant.AUX_LOCS) DH.Plant.AUX_LOCS[k].name();
    for (const s of DH.Scenarios) {
      DH.L(s.title); DH.L(s.teaches); DH.L(s.subtitle);
      assert(DH.L(s.brief).length === 4, s.id + ' briefing is not four lines in ' + lang);
      assert(DH.L(s.objectives).length === 4, s.id + ' has no four objectives in ' + lang);
      for (const c of s.calls || []) { DH.L(c.from); assert(DH.L(c.lines).length > 0, s.id + ' call is empty'); }
    }
    for (const id of ['E-0', 'ES-0.1', 'E-1', 'E-3', 'FR-H.1', 'ECA-0.0', 'GOP-1', 'PANEL', 'DATA']) {
      DH.L('proc.' + id + '.name');
      assert(DH.L('proc.' + id + '.steps').length > 3, id + ' lost its steps in ' + lang);
    }
    for (const st of DH.Tutor.STEPS) { DH.L(st.t); if (st.after) DH.L(st.after); }
    DH.Replay.score(p);
  }
  DH.I18N.set('en');
  B.reset();
  const missed = DH.I18N.missed();
  assert(missed.length === 0, 'missing translations: ' + missed.join(', '));
});

t('the french panel legends still fit the instruments they label', () => {
  const B = L.load(DH);
  DH.I18N.set('fr');
  B.reset();
  const p = DH.Plant.create(scen('startup'), 7);
  run(p, 60);
  try {
    for (const b of B.boards()) {
      const r = L.measure(b, p);
      for (let i = 0; i < r.length; i++) {
        for (const [s2, size] of r[i].face || []) {
          assert(size >= FLOOR, b.name + ': "' + s2 + '" shrinks to ' + size.toFixed(1) + ' units in French');
        }
        assert(r[i].x >= b.x0 + 2 && r[i].x + r[i].w <= b.x1 - 2,
          b.name + ': ' + L.where(r[i]) + ' runs past the panel seam in French');
        for (let j = i + 1; j < r.length; j++) {
          const d = L.overlap(r[i], r[j]);
          assert(d < 1, b.name + ' (fr): ' + L.where(r[i]) + ' overlaps ' + L.where(r[j]) + ' by ' + d.toFixed(0) + 'px');
        }
      }
    }
  } finally { DH.I18N.set('en'); B.reset(); }
});

// ----------------------------------------------------------------- interface
// These boot the real index.html in tests/dom.js — enough of a DOM to run the
// page's scripts and click on things, though nothing is laid out or painted.
const DOM = require('./dom.js');
const fs = require('fs');
const path = require('path');

const langPick = (g) => g.$$('#menu .lang .pick button');
const langOn = (g) => langPick(g).filter((b) => b.classList.contains('on')).map((b) => b.textContent);

t('the language can be changed before a shift starts, not only during one', () => {
  const g = DOM.boot();
  const btns = langPick(g);
  assert(btns.length === g.DH.I18N.LANGS.length,
    'menu offers ' + btns.length + ' languages, dictionary has ' + g.DH.I18N.LANGS.length);
  assert(langOn(g).length === 1, 'menu shows ' + langOn(g).length + ' languages as current');
  assert(langOn(g)[0] === g.DH.I18N.NAMES.en, 'menu opens on ' + langOn(g)[0]);

  const fr = btns.find((b) => b.textContent === g.DH.I18N.NAMES.fr);
  assert(fr, 'no way to pick French from the menu');
  g.fire(fr, 'click');

  assert(g.DH.I18N.get() === 'fr', 'clicking French left the game in ' + g.DH.I18N.get());
  assert(langOn(g)[0] === g.DH.I18N.NAMES.fr, 'the picker did not follow the change');
  assert(g.document.documentElement.attrs.lang === 'fr', 'html lang attribute still says ' + g.document.documentElement.attrs.lang);
  assert(g.saved().lang === 'fr', 'the choice was not saved');
  assert(/SCÉNARIO/.test(g.$('#menu .cards .card').innerHTML), 'the scenario cards did not follow the change');
  assert(g.DH.I18N.missed().length === 0, 'switching from the menu asked for: ' + g.DH.I18N.missed().join(', '));
});

t('every language in the dictionary has a name a player can recognise', () => {
  for (const l of DH.I18N.LANGS) {
    const n = DH.I18N.NAMES[l];
    assert(typeof n === 'string' && n.length > 1, l + ' has no display name');
  }
  assert(Object.keys(DH.I18N.NAMES).length === DH.I18N.LANGS.length, 'NAMES and LANGS disagree');
});

t('a saved language survives a reload, and otherwise the browser decides', () => {
  assert(DOM.boot({ language: 'fr-FR' }).DH.I18N.get() === 'fr', 'a french browser did not open in french');
  assert(DOM.boot({ language: 'en-GB' }).DH.I18N.get() === 'en', 'an english browser did not open in english');
  assert(DOM.boot({ language: 'fr-FR', saved: { best: {}, lang: 'en' } }).DH.I18N.get() === 'en',
    'a saved choice lost to the browser locale');
  assert(DOM.boot({ language: 'en-US', saved: { best: {}, lang: 'fr' } }).DH.I18N.get() === 'fr',
    'a saved choice lost to the browser locale');
});

// The hum, ventilation and turbine come only from Audio.update(), which the loop
// calls while a shift is running and never afterwards, so leaving one used to
// leave them wherever they stood. The klaxon is worse than a stuck gain: one
// safety injection queues eight bursts across the next five seconds, and those
// events outlive the run unless something cancels them.
function loudShift(id) {
  const g = DOM.boot();
  const D = g.DH;
  g.fire(g.$$('#menu .cards .card')[D.Scenarios.findIndex((x) => x.id === id)], 'click');
  g.fire(g.$('#brief .wrap .go'), 'click');
  const p = D.Game.p;
  p.si.on = true;
  p.trip.tripped = true;
  p.phone.ringing = true;
  D.Audio.update(p, 0.02);
  return { g, D, p };
}

const audible = (g, D) => ({
  now: D.Audio.levels().map((v, i) => [i, v]).filter(([, v]) => v > 0.001),
  later: g.pending().length,
  ring: g.timers()
});

t('walking out of a shift takes the room down with it', () => {
  const { g, D } = loudShift('cleantrip');
  const before = audible(g, D);
  assert(before.now.length >= 3, 'the room was not running to begin with: ' + JSON.stringify(before.now));
  assert(before.later > 0, 'the klaxon queued nothing to outlive the run');
  assert(before.ring > 0, 'the phone never started ringing');

  g.key('Escape');

  const after = audible(g, D);
  assert(!after.now.length, 'still running in the menu — ' + JSON.stringify(after.now));
  assert(after.later === 0, after.later + ' sounds still scheduled after leaving');
  assert(after.ring === 0, 'the phone is still ringing in the menu');
  assert(D.Game.mode === 'menu', 'escape did not reach the menu');
});

t('a shift that ends on its own is just as quiet', () => {
  const { g, D, p } = loudShift('cleantrip');
  assert(audible(g, D).now.length >= 3, 'the room was not running to begin with');

  p.over = 'rp.end';
  g.frame();
  assert(D.Game.mode === 'debrief', 'the run did not end, mode is ' + D.Game.mode);

  const after = audible(g, D);
  assert(!after.now.length, 'still running over the debrief — ' + JSON.stringify(after.now));
  assert(after.later === 0, after.later + ' sounds still scheduled over the debrief');
  assert(after.ring === 0, 'the phone is still ringing over the debrief');
});

// The desk sits at its own parallax in front of the console, so an object is not
// under the panorama x of the board behind it and none of this is checkable by
// eye. Each tool routes through the key handler its shortcut uses.
const OPENS = {
  f: (D) => D.Room.R.flashlight,
  b: (D) => D.Binder.isOpen(),
  t: (D) => D.Phone.isOpen(),
  c: (D) => D.Chart.isOpen(),
  Tab: (D) => D.Monitor.isOpen()
};

// Run the loop's two time-dependent bits until the desk is idle again: the hand
// animation, and any head turn it asked for.
function settle(D) {
  for (let i = 0; i < 400; i++) {
    if (!D.Desk.busy() && (D.Room.R.panGoal === null || D.Room.R.panGoal === undefined)) return;
    D.Room.updatePan(0.05);
    D.Desk.tick(0.05);
  }
  throw new Error('the desk never became idle again');
}

function atDesk(g, D, it) {
  const R = D.Room.R;
  const camDesk = (pan) => (pan + R.visW / 2) * D.Desk.PARALLAX - (D.Room.PW / 2) * (D.Desk.PARALLAX - 1);
  R.pan = Math.min(Math.max(it.x / D.Desk.PARALLAX - R.visW / 2 + 150, 0), D.Room.PW - R.visW);
  R.mx = (it.x + it.w / 2 - (camDesk(R.pan) - R.visW / 2)) * R.scale;
  R.my = (it.y + it.h / 2 - R.yTop) * R.scale;
  return D.Room.hitTest(null);
}

t('every tool on the desk can be reached, and does what its shortcut does', () => {
  for (const lang of ['en', 'fr']) {
    const g = DOM.boot({ language: lang === 'fr' ? 'fr-FR' : 'en-US' });
    const D = g.DH;
    g.fire(g.$$('#menu .cards .card')[D.Scenarios.findIndex((x) => x.id === 'cleantrip')], 'click');
    g.fire(g.$('#brief .wrap .go'), 'click');

    const I = D.Desk.items();
    assert(I.length >= 5, lang + ': the desk has only ' + I.length + ' things on it');

    for (let i = 0; i < I.length; i++) {
      for (let j = i + 1; j < I.length; j++) {
        const a = I[i], b = I[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        assert(!(ox > 0 && oy > 0), lang + ': ' + a.k + ' and ' + b.k + ' are stacked on the desk');
      }
    }

    // ordered so the camera terminal, which hides the desk, goes last
    for (const it of I.slice().sort((a, b) => (a.key === 'Tab' ? 1 : 0) - (b.key === 'Tab' ? 1 : 0))) {
      const found = atDesk(g, D, it);
      assert(found === it, lang + ': pointing at ' + it.k + ' hits ' + (found && found.k));
      assert(it.tip && it.tip !== 'dt.' + it.k, lang + ': ' + it.k + ' has no tooltip');
      if (!it.key) continue;
      const probe = OPENS[it.key];
      assert(probe, lang + ': ' + it.k + ' is bound to ' + it.key + ', which opens nothing');
      const before = probe(D);
      D.Desk.activate(it);
      settle(D);
      assert(probe(D) !== before, lang + ': clicking ' + it.k + ' did not work ' + it.key);
      D.Desk.activate(it);
      settle(D);
      assert(probe(D) === before, lang + ': clicking ' + it.k + ' again did not undo it');
    }
    assert(D.I18N.missed().length === 0, lang + ': desk asked for ' + D.I18N.missed().join(', '));
  }
});

// Nothing on the desk is picked up instantly: a hand comes in from below the
// frame and takes it, and until that has finished the object is not in use.
t('reaching for something on the desk takes a moment and shows a hand doing it', () => {
  const g = DOM.boot();
  const D = g.DH;
  g.fire(g.$$('#menu .cards .card')[D.Scenarios.findIndex((x) => x.id === 'sbo')], 'click');
  g.fire(g.$('#brief .wrap .go'), 'click');

  const torch = D.Desk.items().find((x) => x.k === 'torch');
  atDesk(g, D, torch);
  g.key('f');
  assert(D.Desk.busy(), 'the torch came off the desk with nobody picking it up');
  assert(!D.Room.R.flashlight, 'it lit before the hand had hold of it');
  assert(!D.Desk.torchOut(), 'it left its clip before the hand had hold of it');
  settle(D);
  assert(D.Room.R.flashlight && D.Desk.torchOut(), 'the torch never made it into your hand');

  // Putting it back is the one thing that turns your head for you, so it has to
  // work from a board on the other side of the room.
  D.Room.R.pan = D.Room.PW - D.Room.R.visW;
  const far = D.Room.R.pan;
  g.key('f');
  assert(D.Room.R.panGoal !== null && D.Room.R.panGoal !== undefined,
    'putting it back did not go and look at where it lives');
  settle(D);
  assert(Math.abs(D.Room.R.pan - far) > 400, 'the camera never travelled');
  assert(D.Desk.inFrame(torch), 'it was put back somewhere you cannot see');
  assert(!D.Room.R.flashlight && !D.Desk.torchOut(), 'the torch is still out');

  // ...and your own input takes the camera back off it immediately
  D.Room.R.pan = 0;
  g.key('f'); settle(D);
  g.key('f');
  D.Room.R.keyPan = 1;
  D.Room.updatePan(0.05);
  assert(D.Room.R.panGoal === null, 'a scripted pan ignored the player steering');
  D.Room.R.keyPan = 0;
  settle(D);
});

t('the mug empties over a shift and then says so', () => {
  const g = DOM.boot();
  const D = g.DH;
  g.fire(g.$$('#menu .cards .card')[D.Scenarios.findIndex((x) => x.id === 'cleantrip')], 'click');
  g.fire(g.$('#brief .wrap .go'), 'click');
  const mug = D.Desk.items().find((x) => x.k === 'mug');
  assert(!mug.key, 'the mug has a keyboard shortcut, which rather spoils it');
  assert(D.Desk.mugLevel() === 1, 'the shift did not start with a full mug');

  let sips = 0;
  while (D.Desk.mugLevel() > 0 && sips < 20) { D.Desk.activate(mug); sips++; }
  assert(sips > 2 && sips < 12, 'it took ' + sips + ' clicks to finish a mug of coffee');
  assert(D.Desk.mugLevel() === 0, 'the mug never actually emptied');

  const toasts = () => g.$$('#toast div').length;
  const n = toasts();
  D.Desk.activate(mug);
  assert(toasts() > n, 'an empty mug said nothing');
  assert(D.Desk.mugLevel() === 0, 'an empty mug refilled itself');

  // and a fresh shift is a fresh mug
  g.key('Escape');
  g.fire(g.$$('#menu .cards .card')[D.Scenarios.findIndex((x) => x.id === 'cleantrip')], 'click');
  g.fire(g.$('#brief .wrap .go'), 'click');
  assert(D.Desk.mugLevel() === 1, 'the next shift inherited an empty mug');
});

t('the desk keeps its tools where a pan can find them', () => {
  const g = DOM.boot();
  const D = g.DH;
  const R = D.Room.R;
  const f = D.Desk.PARALLAX;
  for (const it of D.Desk.items()) {
    let seen = false;
    for (let pan = 0; pan <= D.Room.PW - R.visW && !seen; pan += 20) {
      const left = (pan + R.visW / 2) * f - (D.Room.PW / 2) * (f - 1) - R.visW / 2;
      if (it.x > left + 20 && it.x + it.w < left + R.visW - 20) seen = true;
    }
    assert(seen, it.k + ' is on the desk but no pan brings it fully into frame');
    assert(it.y >= D.Desk.TOP - 40 && it.y + it.h <= D.Desk.EDGE,
      it.k + ' is not sitting on the desk surface');
  }

  // Parallax shifts x and not y, so a desk object and a console control are
  // directly comparable in y — and the desk is hit tested first. Anything on it
  // that reached up into the bench would quietly swallow clicks meant for a
  // switch, at some pan positions and not others.
  let lowest = 0;
  for (const b of D.Boards.boards()) for (const ct of b.ctrls) lowest = Math.max(lowest, ct.y + ct.h);
  const top = Math.min(...D.Desk.items().map((it) => it.y));
  assert(top > lowest, 'the desk reaches up to ' + top + ', over controls that end at ' + lowest);
});

t('the flashlight switch sample is present, short, and wired to the torch', () => {
  const src = fs.readFileSync(path.join(DOM.ROOT, 'js', 'audio.js'), 'utf8');
  const m = src.match(/url:\s*'([^']+\.mp3)'/);
  assert(m, 'audio.js no longer names a torch sample');
  const f = path.join(DOM.ROOT, m[1]);
  assert(fs.existsSync(f), 'missing sound asset ' + m[1]);
  const kb = fs.statSync(f).size / 1024;
  assert(kb < 40, m[1] + ' is ' + kb.toFixed(0) + ' kB — it should be a click, not a recording session');
  assert(/function torch\([\s\S]*?sample\(SFX\.torch/.test(src), 'torch() no longer plays the sample');
  assert(/function torch\([\s\S]*?clack\(/.test(src), 'torch() lost its fallback for when the file cannot be fetched');
});

t('every image the room asks for exists, and the set stays inside its budget', () => {
  // Two ways in: the canvas art goes through loadArt, and the pane and title
  // backgrounds are plain CSS. Both are checked, or a dead path in either is silent.
  const main = fs.readFileSync(path.join(DOM.ROOT, 'js', 'main.js'), 'utf8');
  const block = main.match(/loadArt\(\{([\s\S]*?)\}\)/);
  assert(block, 'main.js no longer hands a set of images to loadArt');
  const drawn = [...block[1].matchAll(/'([^']+\.webp)'/g)].map((m) => m[1]);
  assert(drawn.length === 13, 'expected 13 drawn images, main.js names ' + drawn.length);

  const styled = [];
  for (const name of fs.readdirSync(path.join(DOM.ROOT, 'css'))) {
    const css = fs.readFileSync(path.join(DOM.ROOT, 'css', name), 'utf8');
    for (const m of css.matchAll(/url\("\.\.\/([^"]+\.webp)"\)/g)) styled.push(m[1]);
  }
  assert(styled.length, 'no css references an image any more');

  let total = 0;
  for (const rel of [...drawn, ...styled]) {
    const f = path.join(DOM.ROOT, rel);
    assert(fs.existsSync(f), 'missing image ' + rel);
    total += fs.statSync(f).size;
  }
  const kb = total / 1024;
  assert(kb < 1500, 'the image set is ' + kb.toFixed(0) + ' kB, over the 1.5 MB budget');

  // Every file in assets/ is wanted by something; an orphan is dead weight shipped.
  const used = new Set([...drawn, ...styled].map((r) => path.basename(r)));
  for (const f of fs.readdirSync(path.join(DOM.ROOT, 'assets'))) {
    if (f.endsWith('.webp')) assert(used.has(f), f + ' is in assets/ but nothing reads it');
  }
});

t('a generated desk still never takes over anything that moves', () => {
  const desk = fs.readFileSync(path.join(DOM.ROOT, 'js', 'ui', 'desk.js'), 'utf8');
  const main = fs.readFileSync(path.join(DOM.ROOT, 'js', 'main.js'), 'utf8');

  // every image the desk reaches for is one the loader actually fetches
  const keys = new Set([...desk.matchAll(/R\.art\.(desk[A-Za-z]+)/g)].map((m) => m[1]));
  for (const m of desk.matchAll(/\[\s*'(desk[A-Za-z]+)'/g)) keys.add(m[1]);
  assert(keys.size === 6, 'expected 6 desk stills, desk.js reaches for ' + keys.size);
  for (const k of keys) {
    assert(new RegExp(k + ":\\s*'assets/[^']+\\.webp'").test(main),
      'desk.js draws ' + k + ' but main.js never loads it');
  }

  // a still that fails to load must fall back, never leave a hole in the desk
  const guards = desk.match(/if \(!still\(|if \(still\(|if \(img\)/g) || [];
  assert(guards.length >= 6, 'only ' + guards.length + ' stills are guarded; a missing '
    + 'image would blank part of the desk');

  // and the live parts have to survive on top of the image
  const alive = [
    [/G\.inset\(c, x \+ 7, y \+ 6, 76, 42, 4, P\.screen\)/, 'the terminal screen well'],
    [/DH\.Monitor\.M\.cam === i/, "the terminal's six camera lamps"],
    [/const ring = p && p\.phone\.ringing/, "the phone's line lamp"],
    [/DH\.Chart\.series\('pwr', 84\)/, "the recorder's live trace"],
    [/L\('desk\.binderSpine'\)/, 'the localised binder spine'],
    [/G\.rr\(c, lit \? -4 : -20/, "the torch's thumb slide"],
    [/c\.ellipse\(45, 0, 4, 13/, "the torch's lens"]
  ];
  for (const [re, what] of alive) {
    assert(re.test(desk), what + ' is gone — a still has swallowed something that moves');
  }
});

t('the paper tile is neutral, so the stock keeps its colour from the palette', () => {
  const css = fs.readFileSync(path.join(DOM.ROOT, 'css', 'room.css'), 'utf8');
  const sheet = css.match(/#binder \.sheet \{([\s\S]*?)\n\}/);
  assert(sheet, 'room.css no longer styles the binder sheet');
  assert(/url\("\.\.\/assets\/paper\.webp"\)[^;]*var\(--dh-paper\)/.test(sheet[1]),
    'the paper tile no longer sits over --dh-paper, so the stock has lost its palette colour');
  assert(/background-blend-mode:\s*multiply/.test(sheet[1]),
    'the paper tile is no longer multiplied, so it now paints its own grey');
});

t('the panel texture is still used the flat way it was graded for', () => {
  // The texture is one image stretched onto all five boards, so it was high-passed
  // free of any light gradient or landmark that would otherwise repeat five times.
  // Tiling it, or dropping the multiply, would invalidate that grade.
  const src = fs.readFileSync(path.join(DOM.ROOT, 'js', 'ui', 'room.js'), 'utf8');
  const use = src.match(/if \(R\.art\.panel\) \{([\s\S]*?)\n      \}/);
  assert(use, 'room.js no longer draws the panel texture');
  assert(/globalCompositeOperation = 'multiply'/.test(use[1]),
    'the panel texture is no longer multiplied, so it now paints its own tone');
  assert(/drawImage\(R\.art\.panel, b\.x0, TOP, b\.x1 - b\.x0, BOT - TOP\)/.test(use[1]),
    'the panel texture is no longer stretched to the whole board');
  assert(/for \(const b of boards\)[\s\S]*?R\.art\.panel/.test(src),
    'the panel texture is no longer drawn once per board');
});

for (const [st, name, msg] of results) console.log(st + '  ' + name + (msg ? '\n      ' + msg : ''));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
