(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'sbo', n: 10, title: 's.sbo.title',
    subtitle: 's.sbo.sub',
    teaches: 's.sbo.teaches',
    seed: 10007, burnup: 0.5, startClock: 3 * 3600, endAt: 6 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [
      { t: 300, kind: 'lossOffsite' },
      { t: 302, kind: 'dgFail', i: 0 },
      { t: 900, kind: 'afwPumpFail', i: 0 }
    ],
    brief: 's.sbo.brief',
    objectives: 's.sbo.obj',
    par: { mwh: 92, noTrip: false }
  });
})();
