(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'sgtr', n: 9, title: 's.sgtr.title',
    subtitle: 's.sgtr.sub',
    teaches: 's.sgtr.teaches',
    seed: 9917, burnup: 0.5, startClock: 2 * 3600, endAt: 3 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [{ t: 300, kind: 'sgtr', area: 0.00035, i: 1 }],
    brief: 's.sgtr.brief',
    objectives: 's.sgtr.obj',
    par: { mwh: 115, noTrip: false }
  });
})();
