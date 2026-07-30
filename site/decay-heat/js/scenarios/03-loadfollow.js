(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'loadfollow', n: 3, title: 's.loadfollow.title',
    subtitle: 's.loadfollow.sub',
    teaches: 's.loadfollow.teaches',
    seed: 3313, burnup: 0.5, startClock: 22 * 3600, endAt: 8 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: (t) => (t < 3600 ? 1 : t < 4.5 * 3600 ? 0.6 : t < 5.5 * 3600 ? 0.6 + (0.4 * (t - 4.5 * 3600)) / 3600 : 1),
    brief: 's.loadfollow.brief',
    objectives: 's.loadfollow.obj',
    calls: [
      { t: 3300, from: 'aux.dispatcher', lines: 's.loadfollow.call0', demand: 0.6 },
      { t: 4.4 * 3600, from: 'aux.dispatcher', lines: 's.loadfollow.call1', demand: 1 }
    ],
    par: { mwh: 7000, noTrip: true, dispatch: true }
  });
})();
