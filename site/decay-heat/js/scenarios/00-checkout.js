(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  (DH.Scenarios = DH.Scenarios || []).push({
    id: 'checkout', n: 0, title: 's.checkout.title',
    subtitle: 's.checkout.sub',
    teaches: 's.checkout.teaches',
    tutorial: true,
    seed: 1101, burnup: 0.5, startClock: 20 * 3600, endAt: 6 * 3600,
    init: { power: 1, ctl: { rodMode: 'AUTO' } },
    demand: () => 1,
    faults: [],
    brief: 's.checkout.brief',
    objectives: 's.checkout.obj',
    par: {}
  });
})();
