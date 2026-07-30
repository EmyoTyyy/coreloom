(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'lofw-shut', n: 6, title: 's.lofw-shut.title',
    subtitle: 's.lofw-shut.sub',
    teaches: 's.lofw-shut.teaches',
    seed: 6607, burnup: 0.5, startClock: 4 * 3600, endAt: 2.5 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [
      { t: 0.5, kind: 'afwValvesShut' },
      { t: 300, kind: 'mfwTrip' }
    ],
    brief: 's.lofw-shut.brief',
    objectives: 's.lofw-shut.obj',
    par: { mwh: 100, noTrip: false }
  });
})();
