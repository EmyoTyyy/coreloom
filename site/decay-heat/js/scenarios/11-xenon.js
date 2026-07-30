(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'xenon', n: 11, title: 's.xenon.title',
    subtitle: 's.xenon.sub',
    teaches: 's.xenon.teaches',
    seed: 11113, burnup: 0.5, startClock: 2 * 3600, endAt: 4 * 3600,
    init: {
      power: 1e-9, trim: false, rodsIn: true, tAvg: 292, p: 15.5,
      turbValve: 0, pzrLevel: 27, sgP: 7.6,
      xenonPower: 1, xenonAge: 4 * 3600, xenonAgePower: 0, decayPower: 0.012,
      ctl: { boron: 914, rodMode: 'MANUAL' }
    },
    demand: () => 0,
    calls: [
      { t: 90, from: 'aux.dispatcher', lines: 's.xenon.call0' },
      { t: 1500, from: 's.xenon.mgr', lines: 's.xenon.call1' }
    ],
    brief: 's.xenon.brief',
    objectives: 's.xenon.obj',
    par: { mwh: 0, noTrip: true, noCritical: true }
  });
})();
