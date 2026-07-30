(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'atws', n: 13, title: 's.atws.title',
    subtitle: 's.atws.sub',
    teaches: 's.atws.teaches',
    seed: 13131, burnup: 0.05, startClock: 3 * 3600, endAt: 2 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [
      { t: 1, kind: 'atws' },
      { t: 300, kind: 'mfwTrip' }
    ],
    brief: 's.atws.brief',
    objectives: 's.atws.obj',
    par: { mwh: 100, noTrip: false }
  });
})();
