(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const DISPATCH = [
    ['AFW', 'AFW_CHECK'], ['AFW', 'AFW_OPEN'], ['PZR', 'PORV_CHECK'], ['DG', 'DG_START'],
    ['SWGR', 'SWGR_CHECK'], ['SWGR', 'LOAD_SHED'], ['TURB', 'TURB_CHECK'], ['SFP', 'SG_SAMPLE']
  ];

  const S = { el: null, from: null, txt: '', full: '', i: 0, mode: 'idle', menu: false };

  function build(root) {
    S.el = root;
    root.innerHTML =
      '<h3>' + DH.L('phone.title') + '</h3>' +
      '<button class="close">' + DH.L('phone.hangUp') + '</button>' +
      '<div class="body"><div class="from"></div><div class="txt"></div><div class="acts"></div></div>';
    root.querySelector('.close').addEventListener('click', () => hangUp());
  }

  let P = null;
  function bind(p) { P = p; }

  function hangUp() {
    if (P && P.phone.active) DH.Plant.act(P, 'hangUp');
    S.mode = 'idle';
    S.menu = false;
    S.el.classList.remove('open');
    DH.Audio.stopRing();
  }

  function openMenu() {
    if (!P) return;
    S.menu = true;
    S.mode = 'menu';
    S.from = DH.L('aux.title');
    S.full = P.aux.to
      ? DH.L('aux.enRoute', DH.Plant.AUX_LOCS[P.aux.to].name(), Math.ceil(P.aux.eta / 60))
      : DH.L('aux.here', DH.Plant.AUX_LOCS[P.aux.at].name());
    S.txt = '';
    S.i = 0;
    S.el.classList.add('open');
    render();
  }

  function tick(dt) {
    if (!P) return;
    const call = P.phone.active;
    if (call && S.mode !== 'call') {
      S.mode = 'call';
      S.menu = false;
      S.from = call.from;
      S.full = call.lines.join('\n');
      S.txt = '';
      S.i = 0;
      S.el.classList.add('open');
      DH.Audio.stopRing();
      render();
    }
    if (S.i < S.full.length) {
      S.i = Math.min(S.full.length, S.i + dt * 46);
      S.txt = S.full.slice(0, Math.floor(S.i));
      const t = S.el.querySelector('.txt');
      if (t) t.innerHTML = esc(S.txt) + '<span class="cursor">_</span>';
      if (S.i >= S.full.length) render();
    }
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  }

  function render() {
    if (!S.el) return;
    S.el.querySelector('.from').textContent = S.from || '';
    S.el.querySelector('.txt').innerHTML = esc(S.txt);
    const acts = S.el.querySelector('.acts');
    acts.innerHTML = '';
    const add = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', fn);
      acts.appendChild(b);
    };
    if (S.mode === 'call') {
      const call = P.phone.active;
      if (call && call.demand !== undefined) {
        add(DH.L('ph.comply'), () => hangUp());
        add(DH.L('ph.refuse'), () => { P.refusedDemand = true; hangUp(); });
      } else {
        add(DH.L('ph.understood'), () => hangUp());
      }
      add(DH.L('ph.callAux'), () => { DH.Plant.act(P, 'hangUp'); openMenu(); });
    } else if (S.mode === 'menu') {
      if (P.aux.to) {
        add(DH.L('ph.leave'), () => hangUp());
      } else {
        for (const [loc, task] of DISPATCH) {
          add(DH.L('ph.' + task), () => {
            if (P.aux.at === loc) DH.Plant.act(P, 'localTask', task);
            else DH.Plant.act(P, 'dispatch', loc, task);
            S.full = DH.L('aux.onWay', DH.Plant.AUX_LOCS[loc].name());
            S.txt = ''; S.i = 0;
            render();
          });
        }
        add(DH.L('ph.comeBack'), () => {
          DH.Plant.act(P, 'dispatch', 'CTRL', 'NONE');
          hangUp();
        });
      }
      add(DH.L('ph.hangUp'), () => hangUp());
    }
  }

  DH.Phone = {
    build, bind, tick, openMenu, hangUp,
    isOpen: () => S.el && S.el.classList.contains('open'),
    toggle: () => { if (S.el.classList.contains('open')) hangUp(); else openMenu(); }
  };
})();
