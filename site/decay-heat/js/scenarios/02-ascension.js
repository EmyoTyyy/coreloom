(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'ascension', n: 2, title: 's.ascension.title',
    subtitle: 's.ascension.sub',
    teaches: 's.ascension.teaches',
    seed: 2207, burnup: 0.15, startClock: 23 * 3600, endAt: 5 * 3600,
    init: {
      power: 0.02, tAvg: 292.4, turbValve: 0.02, pzrLevel: 28,
      xenon: 'none', decayPower: 0.02, ctl: { boron: 1105, rodMode: 'MANUAL' }
    },
    demand: (t) => Math.min(1, t / (3.5 * 3600)),
    brief: 's.ascension.brief',
    objectives: 's.ascension.obj',
    par: { mwh: 3400, noTrip: true, dispatch: true }
  });
})();
