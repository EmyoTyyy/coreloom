(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'cleantrip', n: 4, title: 's.cleantrip.title',
    subtitle: 's.cleantrip.sub',
    teaches: 's.cleantrip.teaches',
    seed: 4409, burnup: 0.5, startClock: 1 * 3600, endAt: 3 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [{ t: 240, kind: 'condenser' }],
    brief: 's.cleantrip.brief',
    objectives: 's.cleantrip.obj',
    par: { mwh: 85, noTrip: false }
  });
})();
