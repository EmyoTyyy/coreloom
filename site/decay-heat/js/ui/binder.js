(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const IDS = ['E-0', 'ES-0.1', 'E-1', 'E-3', 'FR-H.1', 'ECA-0.0', 'GOP-1', 'PANEL', 'DATA'];

  let el = null, tabsEl = null, bodyEl = null, cur = 0;

  // Not a user interface: a controlled copy out of a ring binder, punched, tabbed,
  // typed and a bit grubby. The tabs are the divider tabs of the binder itself.
  function build(root) {
    el = root;
    el.innerHTML =
      '<div class="tabs"></div>' +
      '<div class="sheet">' +
      '<button class="close" aria-label="Close">' + DH.L('binder.close') + '</button>' +
      '<div class="punch"></div>' +
      '<div class="head">' +
      '<span class="rev">' + DH.L('binder.title') + '</span>' +
      '<span class="stamp">' + DH.L('binder.stamp') + '</span>' +
      '</div>' +
      '<div class="body"></div>' +
      '<div class="foot"></div>' +
      '</div>';
    tabsEl = el.querySelector('.tabs');
    bodyEl = el.querySelector('.body');
    el.querySelector('.close').addEventListener('click', () => toggle(false));
    IDS.forEach((id, i) => {
      const b = document.createElement('button');
      b.textContent = id;
      b.addEventListener('click', () => { cur = i; render(); });
      tabsEl.appendChild(b);
    });
    render();
  }

  function render() {
    const id = IDS[cur];
    Array.from(tabsEl.children).forEach((b, i) => b.classList.toggle('on', i === cur));
    el.querySelector('.rev').textContent = DH.L('binder.rev', id);
    let h = '<h4>' + DH.L('proc.' + id + '.name') + '</h4>';
    for (const s of DH.L('proc.' + id + '.steps')) {
      if (s[0] === '#') { h += '<p class="sec">' + s[1] + '</p>'; continue; }
      h += '<p class="step">' + (s[0] ? '<b>' + s[0] + '.</b> ' : '&mdash;&nbsp;') + s[1];
      if (s[2]) h += '<br><span class="note">' + s[2] + '</span>';
      h += '</p>';
    }
    bodyEl.innerHTML = h;
    bodyEl.scrollTop = 0;
    el.querySelector('.foot').textContent = DH.L('binder.foot', id, cur + 1, IDS.length);
  }

  function toggle(v) {
    const on = v === undefined ? !el.classList.contains('open') : v;
    el.classList.toggle('open', on);
  }

  function openTo(id) {
    const i = IDS.indexOf(id);
    if (i >= 0) { cur = i; render(); }
    toggle(true);
  }

  DH.Binder = { build, rebuild: () => { if (tabsEl) render(); }, toggle, openTo, isOpen: () => el && el.classList.contains('open') };
})();
