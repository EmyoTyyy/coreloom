(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const L = DH.L;

  // The console checkout. Each step either tells you something and waits for
  // CONTINUE, or asks you to do something and watches for it. Nothing here is
  // faked: `fire` runs real plant actions through DH.Plant.act, and `go` reads
  // the same state the panels read.
  const T = { on: false, i: 0, el: null, p: null, base: null, onDone: null, fired: false };

  // a control by the tooltip it already carries, so no coordinate that lives in
  // boards.js is duplicated here
  function ctl(board, key) {
    const b = DH.Boards.boards().find((x) => x.name === board);
    const c = b && b.ctrls.find((x) => x.k === key);
    if (!c) throw new Error('checkout target missing: ' + board + ' / ' + key);
    return c;
  }

  // a fractional region of a board, for pointing at instruments rather than controls
  function zone(board, fx, fy, fw, fh) {
    const b = DH.Boards.boards().find((x) => x.name === board);
    if (!b) throw new Error('checkout board missing: ' + board);
    const w = b.x1 - b.x0, h = DH.Boards.BOT - DH.Boards.TOP;
    return { x: b.x0 + w * fx, y: DH.Boards.TOP + h * fy, w: w * fw, h: h * fh };
  }

  const rect = (c) => ({ x: c.x, y: c.y, w: c.w, h: c.h });
  const boardX = (name) => {
    const b = DH.Boards.boards().find((x) => x.name === name);
    return (b.x0 + b.x1) / 2;
  };
  // You can never centre an end board — half a viewport is wider than one board —
  // so "looking at it" means having essentially all of it in frame.
  const atBoard = (name, e) => {
    const b = DH.Boards.boards().find((x) => x.name === name);
    const vis = Math.min(b.x1, e.R.pan + e.R.visW) - Math.max(b.x0, e.R.pan);
    return vis > (b.x1 - b.x0) * 0.95;
  };
  const unacked = (p) => DH.Plant.ALARMS.some((a) => p.alarms[a.id].st === 1);

  const STEPS = [
    {
      t: 'tut.0',
      arm: (p, e) => e.R.pan,
      go: (p, e) => Math.abs(e.R.pan - T.base) > 260
    },
    {
      t: 'tut.1',
      point: () => boardX('REACTOR'),
      go: (p, e) => atBoard('REACTOR', e)
    },
    {
      t: 'tut.2',
      focus: () => zone('REACTOR', 0.645, 0.055, 0.33, 0.10)
    },
    {
      t: 'tut.3',
      focus: () => rect(ctl('REACTOR', 'rodMode')),
      go: (p) => p.ctl.rodMode === 'MANUAL'
    },
    {
      t: 'tut.4',
      focus: () => rect(ctl('REACTOR', 'rodCmd')),
      arm: (p) => p.ctl.bankD,
      go: (p) => p.ctl.bankD > T.base + 1.2
    },
    {
      t: 'tut.5',
      focus: () => rect(ctl('REACTOR', 'rodMode')),
      go: (p) => p.ctl.rodMode === 'AUTO'
    },
    {
      t: 'tut.6',
      focus: () => zone('REACTOR', 0.655, 0.375, 0.29, 0.20)
    },
    {
      t: 'tut.7',
      point: () => boardX('PRIMARY'),
      go: (p, e) => atBoard('PRIMARY', e)
    },
    {
      t: 'tut.8',
      focus: () => zone('PRIMARY', 0.03, 0.03, 0.36, 0.17)
    },
    {
      t: 'tut.9',
      focus: () => zone('PRIMARY', 0.64, 0.03, 0.11, 0.27)
    },
    {
      t: 'tut.10',
      focus: () => zone('PRIMARY', 0.04, 0.63, 0.38, 0.09)
    },
    {
      t: 'tut.11',
      point: () => boardX('SECONDARY'),
      go: (p, e) => atBoard('SECONDARY', e)
    },
    {
      t: 'tut.12',
      focus: () => zone('SECONDARY', 0.015, 0.04, 0.97, 0.28)
    },
    {
      t: 'tut.13',
      focus: () => zone('SECONDARY', 0.19, 0.45, 0.46, 0.16)
    },
    {
      t: 'tut.14',
      focus: () => rect(ctl('SECONDARY', 'loadDem')),
      go: (p) => p.ctl.turbDemand < 96
    },
    {
      t: 'tut.15',
      go: (p, e) => e.speed >= 10
    },
    {
      t: 'tut.16',
      fire: (p) => DH.Plant.act(p, 'charging', 34),
      after: 'tut.16a',
      go: (p) => !unacked(p)
    },
    {
      t: 'tut.17',
      point: () => boardX('PRIMARY'),
      focus: () => rect(ctl('PRIMARY', 'chargingMode')),
      go: (p) => p.ctl.chargingMode === 'AUTO'
    },
    {
      t: 'tut.18',
      point: () => boardX('ELECTRICAL'),
      go: (p, e) => atBoard('ELECTRICAL', e)
    },
    {
      t: 'tut.19',
      focus: () => zone('ELECTRICAL', 0.02, 0.04, 0.96, 0.56)
    },
    {
      t: 'tut.20',
      point: () => boardX('SAFETY'),
      go: (p, e) => atBoard('SAFETY', e)
    },
    {
      t: 'tut.21',
      focus: () => zone('SAFETY', 0.02, 0.04, 0.96, 0.56)
    },
    {
      t: 'tut.22',
      go: () => DH.Chart.isOpen()
    },
    {
      t: 'tut.23',
      go: () => DH.Binder.isOpen()
    },
    {
      t: 'tut.24',
      go: () => DH.Monitor.isOpen()
    },
    {
      t: 'tut.25',
      go: () => DH.Phone.isOpen()
    },
    {
      t: 'tut.26',
      fire: (p) => DH.Plant.act(p, 'offsite', false),
      after: 'tut.26a',
      go: (p, e) => e.R.flashlight
    },
    {
      t: 'tut.27',
      last: true
    }
  ];

  // ---- driving ------------------------------------------------------------
  function build(root) {
    T.el = root;
    root.innerHTML =
      '<div class="hd"><span class="n"></span><button class="skip">' + L('tutor.skip') + '</button></div>' +
      '<div class="tx"></div><button class="go">CONTINUE</button>';
    root.querySelector('.skip').addEventListener('click', () => finish());
    root.querySelector('.go').addEventListener('click', () => advance(T.p));
  }

  function start(p, onDone) {
    T.on = true;
    T.i = 0;
    T.p = p;
    T.onDone = onDone;
    T.el.classList.add('open');
    enter(p);
  }

  const env = (p) => ({ R: DH.Room.R, centre: DH.Room.centre(), speed: T.speed || 1 });

  function enter(p) {
    T.fired = false;
    const s = STEPS[T.i];
    T.base = s.arm ? s.arm(p, env(p)) : null;
    paint();
    apply();
  }

  function apply() {
    const s = STEPS[T.i], R = DH.Room.R;
    // the recorder lives in the same corner as this card
    if (T.el) T.el.classList.toggle('up', DH.Chart.isOpen());
    R.focus = !T.fired && s.focus ? s.focus() : null;
    R.point = s.point ? s.point() : R.focus ? R.focus.x + R.focus.w / 2 : null;
    // sit on the opposite side of the screen from whatever is being pointed at,
    // so the card never covers it
    if (T.el && R.focus) {
      const sx = (R.focus.x + R.focus.w / 2 - R.pan) * R.scale;
      T.el.classList.toggle('right', sx < R.w * 0.55);
    } else if (T.el) T.el.classList.remove('right');
  }

  function paint() {
    if (!T.el) return;
    const s = STEPS[T.i];
    const txt = L(T.fired && s.after ? s.after : s.t);
    T.el.querySelector('.n').textContent = L('tutor.hd', T.i + 1, STEPS.length);
    T.el.querySelector('.tx').innerHTML = txt.split('\n\n').map((q) => '<p>' + q + '</p>').join('');
    const waiting = (T.fired || !s.fire) && !!s.go;
    const b = T.el.querySelector('.go');
    b.textContent = L(s.last ? 'tutor.finish' : waiting ? 'tutor.waiting' : 'tutor.continue');
    b.classList.toggle('wait', waiting);
    b.disabled = waiting;
  }

  // A step with `fire` shows its warning, runs the action on CONTINUE, then
  // shows `after` and waits for the player.
  function advance(p) {
    if (!T.on) return;
    const s = STEPS[T.i];
    if (s.last) { finish(); return; }
    if (s.fire && !T.fired) {
      T.fired = true;
      s.fire(p);
      paint();
      apply();
      return;
    }
    next(p);
  }

  function next(p) {
    T.i++;
    if (T.i >= STEPS.length) finish();
    else enter(p);
  }

  function tick(p, dt, e) {
    if (!T.on) return;
    T.speed = e.speed;
    const s = STEPS[T.i];
    apply();
    if (!s.go || (s.fire && !T.fired)) return;
    if (s.go(p, env(p))) {
      DH.Audio.ping(880, 0.09, 'sine', 0.10, 1320);
      next(p);
    }
  }

  // close() just tears the card down, for the menu and scenario lifecycle.
  // finish() is the player leaving the checkout, which ends the shift.
  function close() {
    T.on = false;
    DH.Room.R.focus = null;
    DH.Room.R.point = null;
    if (T.el) T.el.classList.remove('open');
  }

  function finish() {
    if (!T.on) return;
    close();
    if (T.onDone) T.onDone();
  }

  DH.Tutor = { build, start, tick, advance, finish, close, STEPS, ctl, zone, isOn: () => T.on };
})();
