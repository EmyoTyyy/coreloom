(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'lofw', n: 5, title: 's.lofw.title',
    subtitle: 's.lofw.sub',
    teaches: 's.lofw.teaches',
    seed: 5501, burnup: 0.5, startClock: 2 * 3600, endAt: 2.5 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [{ t: 300, kind: 'mfwTrip' }],
    brief: 's.lofw.brief',
    objectives: 's.lofw.obj',
    par: { mwh: 100, noTrip: false }
  });
})();
