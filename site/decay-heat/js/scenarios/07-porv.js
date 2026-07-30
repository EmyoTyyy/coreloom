(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'porv', n: 7, title: 's.porv.title',
    subtitle: 's.porv.sub',
    teaches: 's.porv.teaches',
    seed: 7703, burnup: 0.5, startClock: 4 * 3600, endAt: 3 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [
      { t: 300, kind: 'mfwTrip' },
      { t: 312, kind: 'porvStuck', i: 0 }
    ],
    brief: 's.porv.brief',
    objectives: 's.porv.obj',
    par: { mwh: 100, noTrip: false }
  });
})();
