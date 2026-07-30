(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'startup', n: 1, title: 's.startup.title',
    subtitle: 's.startup.sub',
    teaches: 's.startup.teaches',
    seed: 1041, burnup: 0.15, startClock: 22 * 3600, endAt: 5400,
    init: {
      power: 1e-9, trim: false, rodsIn: true, tAvg: 292, p: 15.5,
      turbValve: 0, pzrLevel: 27, sgP: 7.6, xenon: 'none', decayPower: 0.0015,
      ctl: { boron: 1140, rodMode: 'MANUAL' }
    },
    demand: () => 0,
    brief: 's.startup.brief',
    objectives: 's.startup.obj',
    par: { mwh: 0, maxSur: 1.0, noTrip: true }
  });
})();
