(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const KEY = 'decayheat.v1';
  const DT = 0.02;
  const SPEEDS = [1, 10, 60, 600];

  const S = {
    mode: 'menu', p: null, scen: null, speed: 1, paused: false,
    acc: 0, last: 0, t: 0, save: null, armT: 0
  };

  const $ = (s) => document.querySelector(s);
  const L = DH.L;

  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    S.save = d && typeof d === 'object' ? d : { best: {}, mute: false };
    if (!S.save.best) S.save.best = {};
    return S.save;
  }

  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(S.save)); } catch (e) { /* storage blocked */ }
  }

  function toast(msg) {
    const w = $('#toast');
    const d = document.createElement('div');
    d.textContent = msg;
    w.appendChild(d);
    setTimeout(() => d.remove(), 4200);
  }

  // ---- menu ---------------------------------------------------------------
  function buildMenu() {
    const wrap = $('#menu .cards');
    wrap.innerHTML = '';
    for (const s of DH.Scenarios) {
      const b = document.createElement('button');
      b.className = 'card';
      const best = S.save.best[s.id];
      b.innerHTML =
        '<div class="n">' + L('ui.scenario') + ' ' + String(s.n).padStart(2, '0') + '</div>' +
        '<div class="t">' + L(s.title) + '</div>' +
        '<div class="d">' + L(s.teaches) + '</div>' +
        '<div class="best">' + (s.tutorial ? L(best ? 'ui.completed' : 'ui.startHere')
          : best ? L('ui.best', best.grade, best.safety, best.econ)
          : L('ui.notAttempted')) + '</div>';
      b.addEventListener('click', () => showBrief(s));
      wrap.appendChild(b);
    }
  }

  function showMenu() {
    S.mode = 'menu';
    S.p = null;
    DH.Tutor.close();
    buildMenu();
    $('#menu').classList.remove('hidden');
    $('#brief').classList.remove('open');
    DH.Replay.hide();
    closePanes();
    DH.Audio.silence();
  }

  function showBrief(scen) {
    S.scen = scen;
    S.mode = 'brief';
    const w = $('#brief .wrap');
    w.innerHTML =
      '<h2>' + L('ui.briefing') + '</h2>' +
      '<div class="title">' + scen.n + '.  ' + L(scen.title) + '</div>' +
      L(scen.brief).map((l) => '<p>' + l + '</p>').join('') +
      '<h2>' + L('ui.gradedOn') + '</h2><ul>' + L(scen.objectives).map((o) => '<li>' + o + '</li>').join('') + '</ul>' +
      '<button class="go">' + L('ui.take') + '</button><button class="alt">' + L('ui.back') + '</button>';
    w.querySelector('.go').addEventListener('click', () => startScenario(scen));
    w.querySelector('.alt').addEventListener('click', showMenu);
    $('#menu').classList.add('hidden');
    $('#brief').classList.add('open');
  }

  function startScenario(scen) {
    DH.Audio.start();
    S.p = DH.Plant.create(scen, scen.seed);
    S.scen = scen;
    S.mode = 'play';
    S.speed = 1;
    S.paused = false;
    S.acc = 0;
    updateSpeedButtons();
    DH.Desk.newShift();
    DH.Chart.reset();
    DH.Phone.bind(S.p);
    DH.Room.R.pan = 1140 - DH.Room.R.visW / 2;
    DH.Room.R.panVel = 0;
    DH.Room.R.torchLevel = 1;
    DH.Room.R.flashlight = false;
    $('#brief').classList.remove('open');
    $('#menu').classList.add('hidden');
    DH.Replay.hide();
    closePanes();
    DH.Tutor.close();
    if (scen.tutorial) DH.Tutor.start(S.p, () => { if (S.p) S.p.over = 'rp.chk'; });
    toast(L('ui.shiftBegins', clockStr(S.p.clock)));
  }

  function endScenario() {
    S.mode = 'debrief';
    DH.Tutor.close();
    const sc = DH.Replay.show(S.p);
    if (!S.scen.tutorial) {
      const prev = S.save.best[S.scen.id];
      const rec = { grade: sc.grade, total: Math.round(sc.total), safety: Math.round(sc.safety), econ: Math.round(sc.econ) };
      if (!prev || rec.total > prev.total) { S.save.best[S.scen.id] = rec; store(); }
    } else if (!S.save.best[S.scen.id]) { S.save.best[S.scen.id] = { done: true }; store(); }
    closePanes();
    DH.Audio.silence();
  }

  function closePanes() {
    for (const id of ['#phone', '#binder', '#chart']) $(id).classList.remove('open');
    DH.Monitor.close();
  }

  const clockStr = (c) =>
    String(Math.floor(c / 3600) % 24).padStart(2, '0') + ':' +
    String(Math.floor(c / 60) % 60).padStart(2, '0') + ':' +
    String(Math.floor(c) % 60).padStart(2, '0');

  // ---- hud ----------------------------------------------------------------
  function buildHud() {
    $('#hud').innerHTML =
      '<div class="grp"><span class="lbl">' + L('hud.time') + '</span><span class="val" id="h-clock">22:00:00</span></div>' +
      '<div class="grp spd" id="h-speed"></div>' +
      '<div class="grp hide-s"><span class="lbl">' + L('hud.pwr') + '</span><span class="val" id="h-pwr">0.0%</span></div>' +
      '<div class="grp hide-s"><span class="lbl">' + L('hud.mwe') + '</span><span class="val" id="h-mwe">0</span></div>' +
      '<div class="grp"><span class="lbl">' + L('hud.subcool') + '</span><span class="val" id="h-sub">0 C</span></div>' +
      '<div class="grp hide-s"><span class="lbl">' + L('hud.operator') + '</span><span class="val" id="h-aux"></span></div>' +
      '<div class="sp"></div>' +
      '<button class="btn" data-k="Tab">' + L('hud.cameras') + '</button>' +
      '<button class="btn" data-k="b">' + L('hud.binder') + '</button>' +
      '<button class="btn" data-k="c">' + L('hud.chart') + '</button>' +
      '<button class="btn" data-k="t">' + L('hud.phone') + '</button>' +
      '<button class="btn" data-k="f">' + L('hud.torch') + '</button>' +
      '<button class="btn" id="h-mute">' + L('hud.sound') + '</button>' +
      '<button class="btn" id="h-lang" title="' + L('ui.langTitle') + '">' + L('ui.lang') + '</button>' +
      '<button class="btn" data-k="Escape">' + L('hud.menu') + '</button>' +
      '<a href="../">&larr; EmyoT.Fun</a>';
    const sp = $('#h-speed');
    SPEEDS.forEach((v) => {
      const b = document.createElement('button');
      b.textContent = v + '×';
      b.dataset.v = v;
      b.addEventListener('click', () => setSpeed(v));
      sp.appendChild(b);
    });
    for (const b of $('#hud').querySelectorAll('.btn[data-k]')) {
      b.addEventListener('click', () => key({ key: b.dataset.k, preventDefault() {} }));
    }
    $('#h-lang').addEventListener('click', () => setLang(DH.I18N.get() === 'fr' ? 'en' : 'fr'));
    $('#h-mute').addEventListener('click', () => {
      DH.Audio.setMuted(!DH.Audio.isMuted());
      S.save.mute = DH.Audio.isMuted();
      store();
      updateMute();
    });
    updateMute();
    updateSpeedButtons();
  }

  function updateMute() {
    $('#h-mute').textContent = L(DH.Audio.isMuted() ? 'hud.muted' : 'hud.sound');
  }

  // Everything that draws on canvas re-reads its strings every frame, so only
  // the DOM and the board objects (which bake in switch legends) need rebuilding.
  function setLang(l) {
    DH.I18N.set(l);
    S.save.lang = l;
    store();
    document.documentElement.lang = l;
    DH.Boards.reset();
    DH.Desk.reset();
    DH.Room.R.hover = null;
    DH.Room.R.focus = null;
    buildHud();
    DH.Binder.rebuild();
    buildStatic();
    if (S.mode === 'menu') buildMenu();
    else if (S.mode === 'brief') showBrief(S.scen);
  }

  function buildStatic() {
    $('#menu .sub').textContent = L('ui.sub');
    $('#menu .foot span').textContent = L('ui.hint');
    $('#wipe').textContent = L('ui.wipe');
    buildLangPick();
  }

  // The status-bar toggle only exists once a shift is running, and the menu is
  // where someone deciding what language to play in actually is.
  function buildLangPick() {
    $('#menu .lang .cap').textContent = L('ui.langPick');
    const pick = $('#menu .lang .pick');
    pick.innerHTML = '';
    for (const l of DH.I18N.LANGS) {
      const b = document.createElement('button');
      b.textContent = DH.I18N.NAMES[l];
      b.lang = l;
      b.classList.toggle('on', DH.I18N.get() === l);
      b.addEventListener('click', () => { if (DH.I18N.get() !== l) setLang(l); });
      pick.appendChild(b);
    }
  }

  function updateSpeedButtons() {
    for (const b of $('#h-speed').children) b.classList.toggle('on', +b.dataset.v === S.speed && !S.paused);
  }

  function setSpeed(v) {
    S.speed = v;
    S.paused = false;
    updateSpeedButtons();
  }

  function updateHud() {
    const p = S.p;
    if (!p) return;
    $('#h-clock').textContent = clockStr(p.clock);
    $('#h-pwr').textContent = p.ind.power.toFixed(1) + '%';
    $('#h-mwe').textContent = p.ind.mwe.toFixed(0);
    const sub = $('#h-sub');
    sub.textContent = (p.ind.subcool >= 0 ? '+' : '') + p.ind.subcool.toFixed(1) + ' C';
    sub.style.color = p.ind.subcool < 0 ? 'var(--dh-lamp-red)' : p.ind.subcool < 15 ? 'var(--dh-lamp-amber)' : '';
    $('#h-aux').textContent = p.aux.to
      ? L('hud.walking', DH.Plant.AUX_LOCS[p.aux.to].name(), Math.ceil(p.aux.eta / 60))
      : DH.Plant.AUX_LOCS[p.aux.at].name();
  }

  // The torch only adds light the room has stopped providing, so say so rather
  // than leaving a dead-feeling button.
  // You do not toggle a torch, you pick one up — and you have to go and put it
  // back, which is the only thing in the game that turns your head for you.
  function toggleTorch() {
    const R = DH.Room.R;
    if (DH.Desk.busy()) return;
    if (!R.flashlight) {
      DH.Desk.takeTorch(() => {
        R.flashlight = true;
        DH.Audio.torch(true);
        if (DH.Room.lightingState(S.p) === 'normal') toast(L('ui.torchLit'));
        else if (R.torchLevel < 0.3) toast(L('ui.torchFlat'));
      });
    } else {
      DH.Desk.returnTorch(() => {
        R.flashlight = false;
        DH.Audio.torch(false);
      });
    }
  }

  function toggleBinder() {
    if (DH.Binder.isOpen()) { DH.Binder.toggle(false); return; }
    if (DH.Desk.busy()) return;
    DH.Desk.takeDoc(() => DH.Binder.toggle(true));
  }

  // ---- input --------------------------------------------------------------
  function key(e) {
    const k = e.key;
    if (S.mode !== 'play') {
      if (k === 'Escape' && S.mode === 'brief') showMenu();
      return;
    }
    const mon = DH.Monitor.isOpen();
    if (k === 'Enter' && DH.Tutor.isOn()) { DH.Tutor.advance(S.p); return; }
    if (k === 'Tab') { e.preventDefault(); mon ? DH.Monitor.close() : DH.Monitor.open(); return; }
    if (k === 'Escape') {
      e.preventDefault();
      if (mon) DH.Monitor.close();
      else if (DH.Phone.isOpen()) DH.Phone.hangUp();
      else if (DH.Binder.isOpen()) DH.Binder.toggle(false);
      else if (DH.Chart.isOpen()) DH.Chart.toggle(false);
      else showMenu();
      return;
    }
    if (mon) {
      if (k >= '1' && k <= '6') DH.Monitor.select(+k - 1);
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') DH.Monitor.select(DH.Monitor.M.cam - 1);
      if (k === 'ArrowRight' || k === 'd' || k === 'D') DH.Monitor.select(DH.Monitor.M.cam + 1);
      return;
    }
    switch (k) {
      case 'a': case 'A': case 'ArrowLeft': DH.Room.R.keyPan = -1; break;
      case 'd': case 'D': case 'ArrowRight': DH.Room.R.keyPan = 1; break;
      case 'e': case 'E': DH.Plant.act(S.p, 'ack'); DH.Audio.stopBuzzer(); break;
      case 'f': case 'F': toggleTorch(); break;
      case 'b': case 'B': toggleBinder(); break;
      case 'c': case 'C': DH.Chart.toggle(); break;
      case 't': case 'T': DH.Phone.toggle(); break;
      case 'm': case 'M':
        DH.Audio.setMuted(!DH.Audio.isMuted()); S.save.mute = DH.Audio.isMuted(); store(); updateMute(); break;
      case ' ': e.preventDefault(); S.paused = !S.paused; updateSpeedButtons(); break;
      case '1': setSpeed(1); break;
      case '2': setSpeed(10); break;
      case '3': setSpeed(60); break;
      case '4': setSpeed(600); break;
    }
  }

  function keyUp(e) {
    const k = e.key;
    if ((k === 'a' || k === 'A' || k === 'ArrowLeft') && DH.Room.R.keyPan < 0) DH.Room.R.keyPan = 0;
    if ((k === 'd' || k === 'D' || k === 'ArrowRight') && DH.Room.R.keyPan > 0) DH.Room.R.keyPan = 0;
  }

  // ---- loop ---------------------------------------------------------------
  function frame(now) {
    requestAnimationFrame(frame);
    const real = Math.min((now - S.last) / 1000 || 0, 0.1);
    S.last = now;
    S.t += real;

    const p = S.p;
    if (S.mode === 'play' && p) {
      DH.Boards.tick(p, real);
      DH.Desk.tick(real);

      let sp = S.paused ? 0 : S.speed;
      if (p.ctl.rodCmd || p.ctl.sdCmd) sp = Math.min(sp, 1);
      else if (p.ui_chg || p.ui_dump || p.ui_load) sp = Math.min(sp, 10);

      S.acc += real * sp;
      let steps = 0;
      const maxSteps = 1400;
      while (S.acc >= DT && steps < maxSteps) {
        DH.Plant.step(p, DT);
        S.acc -= DT;
        steps++;
        if (p.newAlarm && S.speed > 1) { setSpeed(1); S.acc = 0; break; }
        if (p.over) break;
      }
      if (S.acc > DT * maxSteps) S.acc = 0;

      DH.Chart.sample(p, steps * DT);
      DH.Audio.update(p, real);
      DH.Phone.tick(real);
      DH.Tutor.tick(p, real, { speed: S.speed, paused: S.paused });

      if (p.ui_tripArmed || p.ui_siArmed) {
        S.armT += real;
        if (S.armT > 6) { p.ui_tripArmed = false; p.ui_siArmed = false; S.armT = 0; }
      } else S.armT = 0;

      const R = DH.Room.R;
      if (R.flashlight) R.torchLevel = Math.max(0, R.torchLevel - real / 300);
      else R.torchLevel = Math.min(1, R.torchLevel + real / 900);

      if (!DH.Monitor.isOpen()) {
        DH.Room.updatePan(real);
        DH.Room.setHover(DH.Room.hitTest(p));
      } else DH.Room.setHover(null);

      DH.Room.render(p, S.t);
      if (DH.Monitor.isOpen()) DH.Monitor.draw(DH.Room.R.ctx, p, R.w, R.h, S.t, real);

      const ch = DH.Ann.chevrons(p, DH.Room.centre());
      $('#overlay .chev.l').classList.toggle('on', ch.left);
      $('#overlay .chev.r').classList.toggle('on', ch.right);

      DH.Chart.draw();
      updateHud();

      if (p.over) endScenario();
    }
  }

  // ---- boot ---------------------------------------------------------------
  function boot() {
    load();
    // saved choice first, then the browser's preference
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    DH.I18N.set(S.save.lang || (nav === 'fr' ? 'fr' : 'en'));
    document.documentElement.lang = DH.I18N.get();
    const cs = getComputedStyle(document.documentElement);
    DH.UI_MONO = cs.getPropertyValue('--dh-mono').trim() || 'monospace';
    DH.UI_FONT = cs.getPropertyValue('--dh-sans').trim() || 'Helvetica, Arial, sans-serif';

    DH.Room.init($('#room'));
    DH.Room.loadArt({
      panel: 'assets/panel.webp',
      deskCctv: 'assets/desk-cctv.webp',
      deskPhone: 'assets/desk-phone.webp',
      deskRecorder: 'assets/desk-recorder.webp',
      deskTorch: 'assets/desk-torch.webp',
      deskPens: 'assets/desk-pens.webp',
      deskPile: 'assets/desk-pile.webp',
      camCNMT: 'assets/cam-cnmt.webp',
      camTURB: 'assets/cam-turb.webp',
      camAFW: 'assets/cam-afw.webp',
      camDG: 'assets/cam-dg.webp',
      camSWGR: 'assets/cam-swgr.webp',
      camSFP: 'assets/cam-sfp.webp'
    });
    DH.Tutor.build($('#tutor'));
    DH.Binder.build($('#binder'));
    DH.Phone.build($('#phone'));
    DH.Chart.build($('#chart'));
    DH.Replay.build($('#debrief'), (what) => {
      DH.Replay.hide();
      if (what === 'again') showBrief(S.scen); else showMenu();
    });
    buildHud();
    buildStatic();
    DH.Audio.setMuted(!!S.save.mute);
    updateMute();

    // Picking a thing off the desk goes through the same handler its shortcut
    // does, so the two can never come to mean different things.
    DH.Desk.bind((k) => key({ key: k, preventDefault() {} }), toast);
    DH.Room.bindPointer($('#room'), () => (S.mode === 'play' && !DH.Monitor.isOpen() ? S.p : null));
    $('#room').addEventListener('mousedown', (e) => {
      if (DH.Monitor.isOpen()) DH.Monitor.clickAt(e.clientX, e.clientY);
    });
    $('#room').addEventListener('click', () => DH.Audio.start(), { once: true });

    window.addEventListener('keydown', key);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', () => { DH.Room.R.keyPan = 0; DH.Room.R.mouseEdge = 0; });

    showMenu();
    S.last = performance.now();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  DH.Game = S;
})();
