(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'ejection', n: 12, title: 's.ejection.title',
    subtitle: 's.ejection.sub',
    teaches: 's.ejection.teaches',
    seed: 12119, burnup: 0.5, startClock: 5 * 3600, endAt: 1.5 * 3600,
    init: { power: 0.6, ctl: { rodMode: 'MANUAL' } },
    demand: () => 0.6,
    faults: [{ t: 400, kind: 'rodEject' }],
    brief: 's.ejection.brief',
    objectives: 's.ejection.obj',
    par: { mwh: 75, noTrip: false }
  });
})();
