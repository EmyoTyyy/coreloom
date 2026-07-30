(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'sbloca', n: 8, title: 's.sbloca.title',
    subtitle: 's.sbloca.sub',
    teaches: 's.sbloca.teaches',
    seed: 8811, burnup: 0.5, startClock: 3 * 3600, endAt: 3 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [{ t: 420, kind: 'loca', area: 0.0009 }],
    brief: 's.sbloca.brief',
    objectives: 's.sbloca.obj',
    par: { mwh: 135, noTrip: false }
  });
})();
