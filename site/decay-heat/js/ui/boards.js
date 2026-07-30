(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const G = DH.G;
  const L = DH.L;

  // Console geometry. TOP..LIP is the vertical face and carries the instruments
  // in three rows; LIP..BOT is the bench and carries the controls. Nothing is
  // placed by eye: every board divides its width into columns of COL and keeps
  // MARGIN clear at each end, and tests/run.js walks the drawn footprints and
  // fails if any two of them intersect.
  const TOP = 250, BOT = 1010;
  const LIP = 720;
  const ROW1 = 338, ROW2 = 478, ROW3 = 618;
  const BENCH = 838, SHELF = 770, HEADER = 730;
  const COL = 182, MARGIN = 16;

  const act = (p, t, v, i) => DH.Plant.act(p, t, v, i);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  function cycle(p, list, cur, set) {
    const i = list.indexOf(cur);
    set(list[(i + 1) % list.length]);
  }

  function C(x, y, w, h, o) {
    return Object.assign({ x: x - w / 2, y: y - h / 2, w: w, h: h, cx: x, cy: y }, o);
  }

  function tglDraw(label, states, idxOf, o) {
    return function (c, p) {
      G.toggle(c, Object.assign({ x: this.cx, y: this.cy, label: label, states: states, index: idxOf(p) }, o || {}));
    };
  }

  function rotDraw(label, states, idxOf, r) {
    return function (c, p) {
      G.rotary(c, { x: this.cx, y: this.cy, r: r || 14, label: label, states: states, index: idxOf(p) });
    };
  }

  // ======================= REACTOR ========================================
  function reactorBoard() {
    const X = 0;
    const ctrls = [
      C(X + 108, BENCH, 44, 58, {
        k: 'rodMode', tip: L('t.rodMode'),
        draw: rotDraw(L('c.rodMode'), [L('c.man'), L('c.auto')], (p) => (p.ctl.rodMode === 'AUTO' ? 1 : 0)),
        click: (p) => act(p, 'rodMode', p.ctl.rodMode === 'AUTO' ? 'MANUAL' : 'AUTO')
      }),
      C(X + 196, BENCH, 34, 56, {
        k: 'rodCmd', tip: L('t.rodCmd'),
        draw: tglDraw(L('g.bankD'), [L('c.in'), L('c.hold'), L('c.out')], (p) => p.ctl.rodCmd + 1),
        down: (p, mx, my, ctl) => act(p, 'rodCmd', my < ctl.cy ? 1 : -1),
        up: (p) => act(p, 'rodCmd', 0)
      }),
      C(X + 278, BENCH, 34, 56, {
        k: 'sdCmd', tip: L('t.sdCmd'),
        draw: tglDraw(L('c.sdBank'), [L('c.in'), L('c.hold'), L('c.out')], (p) => (p.ctl.sdCmd || 0) + 1),
        down: (p, mx, my, ctl) => act(p, 'sdCmd', my < ctl.cy ? 1 : -1),
        up: (p) => act(p, 'sdCmd', 0)
      }),
      C(X + 386, BENCH, 44, 58, {
        k: 'boronCmd', tip: L('t.boronCmd'),
        draw: rotDraw(L('c.boron'), [L('c.dilute'), L('c.off'), L('c.borate')], (p) => p.ctl.boronCmd + 1),
        click: (p) => act(p, 'boronCmd', p.ctl.boronCmd === 1 ? -1 : p.ctl.boronCmd + 1)
      }),
      C(X + 480, BENCH, 54, 26, {
        k: 'sampleBoron', tip: L('t.sampleBoron'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 54, h: 24, text: L('c.sample'), label: L('c.boron') }); },
        click: (p) => act(p, 'sampleBoron')
      }),
      C(X + 630, BENCH - 4, 82, 60, {
        k: 'trip', tip: L('t.trip'),
        draw: function (c, p) {
          G.guarded(c, { x: this.cx, y: this.cy, w: 82, h: 58, label: L('c.rxTrip'), armed: !!p.ui_tripArmed });
        },
        click: (p) => { if (p.ui_tripArmed) { act(p, 'trip'); p.ui_tripArmed = false; } else p.ui_tripArmed = true; }
      })
    ];

    return {
      name: 'REACTOR', x0: 0, x1: 760, ctrls: ctrls,
      draw: function (c, p) {
        const i = p.ind;
        G.logmeter(c, { x: X + 40, y: ROW1 - 34, w: 200, h: 62, dec0: 0, dec1: 6, val: Math.max(i.srCps, 1), label: L('g.srcRange') });
        G.logmeter(c, { x: X + 268, y: ROW1 - 34, w: 200, h: 62, dec0: -11, dec1: -3, val: Math.max(i.irAmps, 1e-12), label: L('g.intRange') });
        G.digital(c, { x: X + 500, y: ROW1 - 34, w: 106, h: 40, text: G.fmt(i.power, 1), label: L('g.nuclearPwr'), unit: '%', size: 22, lit: i.backlight[0] });
        G.digital(c, { x: X + 624, y: ROW1 - 34, w: 106, h: 40, text: (i.sur >= 0 ? '+' : '') + G.fmt(i.sur, 2), label: L('g.startupRate'), unit: L('g.dpm'), size: 22, lit: i.backlight[0], color: Math.abs(i.sur) > 1 ? G.pal().red : undefined });

        for (let k = 0; k < 3; k++) {
          G.needle(c, {
            cx: X + 84 + k * 128, cy: ROW2, r: 50, min: 0, max: 120, val: i.pr[k],
            label: L('g.prN4', k + 1), unit: L('g.pctPower'), majors: 6, minors: 2,
            bands: [[100, 109, 'rgba(255,164,43,0.55)'], [109, 120, 'rgba(184,36,28,0.6)']]
          });
        }
        G.needle(c, {
          cx: X + 466, cy: ROW2, r: 52, min: -1, max: 5, val: clamp(i.sur, -1, 5),
          label: L('g.sur'), unit: L('g.decMin'), majors: 6, minors: 2, dec: 0,
          bands: [[1, 5, 'rgba(184,36,28,0.6)']]
        });
        G.needle(c, {
          cx: X + 604, cy: ROW2, r: 52, min: 270, max: 320, val: clamp(i.tAvg, 270, 320),
          label: L('g.tavg'), unit: L('g.degC'), majors: 5, minors: 2, setpoint: clamp(i.tRef, 270, 320)
        });

        G.needle(c, {
          cx: X + 84, cy: ROW3, r: 44, min: -30, max: 30, val: clamp(i.axialFlux, -30, 30),
          label: L('g.deltaI'), unit: '%', majors: 6, minors: 2,
          bands: [[-30, -9, 'rgba(255,164,43,0.5)'], [9, 30, 'rgba(255,164,43,0.5)']]
        });
        G.needle(c, {
          cx: X + 196, cy: ROW3, r: 44, min: 0, max: 60, val: clamp(i.dT, 0, 60),
          label: L('g.deltaT'), unit: L('g.degC'), majors: 6, minors: 2, setpoint: clamp(i.dTsp, 0, 60)
        });

        G.vmeter(c, { x: X + 268, y: ROW3 - 66, w: 44, h: 132, min: 0, max: 100, val: p.ctl.bankD, label: L('g.bankD'), ticks: 10, majEvery: 2, bar: true, barColor: G.pal().needleAlt });
        G.vmeter(c, { x: X + 326, y: ROW3 - 66, w: 44, h: 132, min: 0, max: 100, val: 100 - p.ctl.sdBank * 100, label: L('g.shutdownBk'), ticks: 10, majEvery: 2, bar: true, barColor: G.pal().needleAlt });
        G.digital(c, { x: X + 386, y: ROW3 - 64, w: 96, h: 32, text: L('g.steps', G.fmt(p.ctl.bankD, 0)), label: L('g.bankDpos'), size: 16, lit: i.backlight[0] });
        G.digital(c, { x: X + 386, y: ROW3 - 10, w: 96, h: 32, text: G.fmt(i.boronSample, 0), label: L('g.boronPpm'), size: 16, lit: i.backlight[0] });
        G.mono(c, L('g.sampleAge', Math.floor(i.boronSampleAge / 60)), X + 482, ROW3 + 30, 9, 'right', G.pal().inkDim);

        G.engrave(c, L('g.rhoBalance'), X + 604, ROW3 - 72, 9);
        const r = p.rho;
        const rows = [[L('g.rods'), r.rods], [L('g.boron'), r.boron], [L('g.doppler'), r.doppler], [L('g.moderator'), r.mod], [L('g.xenon'), r.xenon], [L('g.samarium'), r.samarium], [L('g.total'), r.total]];
        for (let k = 0; k < rows.length; k++) {
          const yy = ROW3 - 56 + k * 17;
          G.mono(c, rows[k][0], X + 512, yy, 10, 'left', k === 6 ? G.pal().ink : G.pal().inkDim);
          G.mono(c, (rows[k][1] >= 0 ? '+' : '') + G.fmt(rows[k][1], 0), X + 700, yy, 10, 'right', k === 6 ? G.pal().ink : G.pal().inkDim);
        }
        G.lamp(c, { x: X + 700, y: BENCH - 46, r: 8, on: p.ctl.bankD < 3, color: G.pal().amber, label: L('g.rodBottom') });
      }
    };
  }

  // ======================= PRIMARY ========================================
  function primaryBoard() {
    const X = 760;
    const ctrls = [
      C(X + 74, BENCH, 44, 58, {
        k: 'heaters', tip: L('t.heaters'),
        draw: rotDraw(L('c.heaters'), [L('c.off'), L('c.auto'), L('c.on')], (p) => ['OFF', 'AUTO', 'ON'].indexOf(p.ctl.heaterMode)),
        click: (p) => cycle(p, ['OFF', 'AUTO', 'ON'], p.ctl.heaterMode, (v) => act(p, 'heaterMode', v))
      }),
      C(X + 186, BENCH, 44, 58, {
        k: 'spray', tip: L('t.spray'),
        draw: rotDraw(L('c.spray'), [L('c.auto'), L('c.man')], (p) => (p.ctl.sprayMode === 'AUTO' ? 0 : 1)),
        click: (p) => { const v = p.ctl.sprayMode === 'AUTO' ? 'MANUAL' : 'AUTO'; act(p, 'sprayMode', v); if (v === 'MANUAL') act(p, 'sprayManual', 0); }
      }),
      C(X + 254, BENCH, 30, 56, {
        k: 'sprayVlv', tip: L('t.sprayVlv'),
        draw: tglDraw(L('c.sprayVlv'), [L('c.shut'), '', L('c.open')], (p) => (p.ctl.sprayManual > 0.5 ? 2 : 0)),
        click: (p) => act(p, 'sprayManual', p.ctl.sprayManual > 0.5 ? 0 : 1)
      }),
      C(X + 346, BENCH, 44, 58, {
        k: 'porv', tip: L('t.porv', 1),
        draw: rotDraw(L('g.porv', 1), [L('c.shut'), L('c.auto'), L('c.open')], (p) => ['CLOSE', 'AUTO', 'OPEN'].indexOf(p.ctl.porvMode[0])),
        click: (p) => cycle(p, ['CLOSE', 'AUTO', 'OPEN'], p.ctl.porvMode[0], (v) => act(p, 'porvMode', v, 0))
      }),
      C(X + 414, BENCH, 30, 56, {
        k: 'block', tip: L('t.block', 1),
        draw: tglDraw(L('c.block', 1), [L('c.shut'), '', L('c.open')], (p) => (p.ctl.porvBlockCmd[0] ? 2 : 0)),
        click: (p) => act(p, 'porvBlock', !p.ctl.porvBlockCmd[0], 0)
      }),
      C(X + 486, BENCH, 44, 58, {
        k: 'porv', tip: L('t.porv', 2),
        draw: rotDraw(L('g.porv', 2), [L('c.shut'), L('c.auto'), L('c.open')], (p) => ['CLOSE', 'AUTO', 'OPEN'].indexOf(p.ctl.porvMode[1])),
        click: (p) => cycle(p, ['CLOSE', 'AUTO', 'OPEN'], p.ctl.porvMode[1], (v) => act(p, 'porvMode', v, 1))
      }),
      C(X + 554, BENCH, 30, 56, {
        k: 'block', tip: L('t.block', 2),
        draw: tglDraw(L('c.block', 2), [L('c.shut'), '', L('c.open')], (p) => (p.ctl.porvBlockCmd[1] ? 2 : 0)),
        click: (p) => act(p, 'porvBlock', !p.ctl.porvBlockCmd[1], 1)
      }),
      C(X + 636, BENCH, 44, 58, {
        k: 'chargingMode', tip: L('t.chargingMode'),
        draw: rotDraw(L('c.charging'), [L('c.auto'), L('c.man')], (p) => (p.ctl.chargingMode === 'AUTO' ? 0 : 1)),
        click: (p) => act(p, 'chargingMode', p.ctl.chargingMode === 'AUTO' ? 'MANUAL' : 'AUTO')
      }),
      C(X + 704, BENCH, 30, 56, {
        k: 'chgFlow', tip: L('t.chgFlow'),
        draw: tglDraw(L('c.chgFlow'), [L('c.decr'), '', L('c.incr')], () => 1),
        down: (p, mx, my, ctl) => { p.ui_chg = my < ctl.cy ? 1 : -1; },
        up: (p) => { p.ui_chg = 0; }
      })
    ];
    for (let k = 0; k < 4; k++) {
      ctrls.push(C(X + 62 + k * 74, SHELF, 46, 24, {
        k: 'rcp', idx: k, tip: L('t.rcp', k + 1),
        draw: function (c, p) {
          G.button(c, {
            x: this.cx, y: this.cy, w: 46, h: 22, text: p.th.pumps[this.idx].on ? L('c.stop') : L('c.start'),
            label: L('g.rcp', this.idx + 1), lit: p.th.pumps[this.idx].w > 500, litColor: G.pal().green, size: 8
          });
        },
        click: function (p) { act(p, 'rcp', !p.th.pumps[this.idx].on, this.idx); }
      }));
    }

    return {
      name: 'PRIMARY', x0: 760, x1: 1520, ctrls: ctrls,
      draw: function (c, p) {
        const i = p.ind, P = G.pal();
        const sub = i.subcool;
        const subCol = sub < 0 ? P.red : sub < 15 ? P.amber : P.green;
        G.engrave(c, L('g.subcoolMargin'), X + 158, TOP + 34, 12);
        G.digital(c, { x: X + 34, y: TOP + 48, w: 248, h: 72, text: (sub >= 0 ? '+' : '') + G.fmt(sub, 1), unit: L('g.degC'), size: 46, color: subCol, lit: i.backlight[1] });
        G.mono(c, sub < 0 ? L('g.coreSat') : L('g.tsat', G.fmt(i.tsat, 1)), X + 158, TOP + 136, 11, 'center', sub < 0 ? P.red : P.inkDim);

        G.needle(c, { cx: X + 380, cy: ROW1 + 30, r: 56, min: 12, max: 18, val: clamp(i.pPzr, 12, 18), label: L('g.pzrPress'), unit: L('g.mpa'), majors: 6, minors: 5, dec: 0, bands: [[12, 12.97, 'rgba(184,36,28,0.55)'], [15.9, 18, 'rgba(255,164,43,0.55)']] });
        G.digital(c, { x: X + 332, y: ROW1 + 104, w: 96, h: 30, text: G.fmt(i.pPzr, 3), unit: L('g.mpa'), size: 16, lit: i.backlight[1] });

        G.vmeter(c, { x: X + 500, y: TOP + 36, w: 52, h: 168, min: 0, max: 100, val: clamp(i.pzrLevel, -3, 103), label: L('g.pzrLevel'), ticks: 10, majEvery: 2, setpoint: p.ctl.levelProg, bands: [[0, 17, 'rgba(184,36,28,0.5)'], [92, 100, 'rgba(184,36,28,0.5)']] });
        G.vmeter(c, { x: X + 566, y: TOP + 36, w: 40, h: 168, min: 0, max: 60, val: clamp(p.ctl.charging, 0, 60), label: L('g.charge'), ticks: 6, majEvery: 2, bar: true, numbers: false });
        G.vmeter(c, { x: X + 618, y: TOP + 36, w: 40, h: 168, min: 0, max: 60, val: clamp(p.ctl.letdown, 0, 60), label: L('g.letdown'), ticks: 6, majEvery: 2, bar: true, numbers: false });
        G.lamp(c, { x: X + 700, y: TOP + 60, r: 9, on: p.th.porvOpen[0] && p.th.porvBlock[0], color: P.red, label: L('g.porv', 1) });
        G.lamp(c, { x: X + 700, y: TOP + 116, r: 9, on: p.th.porvOpen[1] && p.th.porvBlock[1], color: P.red, label: L('g.porv', 2) });
        G.lamp(c, { x: X + 700, y: TOP + 172, r: 9, on: p.prt.m > 200, color: P.amber, label: L('g.prtTemp') });

        // one column per loop: hot leg above cold leg, flow beside them
        for (let k = 0; k < 4; k++) {
          const c0 = X + MARGIN + k * COL;
          G.needle(c, { cx: c0 + 62, cy: 526, r: 44, min: 260, max: 340, val: clamp(i.tHot[k], 260, 340), label: L('g.tHot', k + 1), unit: L('g.degC'), majors: 4, minors: 2 });
          G.needle(c, { cx: c0 + 62, cy: 632, r: 44, min: 260, max: 340, val: clamp(i.tCold[k], 260, 340), label: L('g.tCold', k + 1), unit: L('g.degC'), majors: 4, minors: 2 });
          G.vmeter(c, { x: c0 + 122, y: 486, w: 34, h: 176, min: 0, max: 120, val: clamp(i.loopFlow[k], 0, 120), label: L('g.flow'), ticks: 6, majEvery: 3, bar: true, numbers: false, barColor: i.loopFlow[k] < 88 ? P.red : P.needleAlt });
        }
        G.engrave(c, L('g.rcps'), X + 174, HEADER, 9);
      }
    };
  }

  // ======================= SECONDARY ======================================
  function secondaryBoard() {
    const X = 1520;
    const ctrls = [
      C(X + 96, BENCH, 44, 58, {
        k: 'dumpMode', tip: L('t.dumpMode'),
        draw: rotDraw(L('c.steamDump'), [L('c.off'), L('c.auto'), L('c.man')], (p) => ['OFF', 'AUTO', 'MANUAL'].indexOf(p.sec.dumpMode)),
        click: (p) => cycle(p, ['OFF', 'AUTO', 'MANUAL'], p.sec.dumpMode, (v) => act(p, 'dumpMode', v))
      }),
      C(X + 164, BENCH, 30, 56, {
        k: 'dumpDem', tip: L('t.dumpDem'),
        draw: tglDraw(L('c.dumpDem'), [L('c.shut'), '', L('c.open')], () => 1),
        down: (p, mx, my, ctl) => { p.ui_dump = my < ctl.cy ? 1 : -1; },
        up: (p) => { p.ui_dump = 0; }
      }),
      C(X + 262, BENCH, 30, 56, {
        k: 'loadDem', tip: L('t.loadDem'),
        draw: tglDraw(L('c.loadDem'), [L('c.lower'), '', L('c.raise')], () => 1),
        down: (p, mx, my, ctl) => { p.ui_load = my < ctl.cy ? 1 : -1; },
        up: (p) => { p.ui_load = 0; }
      }),
      C(X + 340, BENCH, 44, 58, {
        k: 'loadRate', tip: L('t.loadRate'),
        draw: rotDraw(L('c.loadRate'), ['1', '3', '5', '10'], (p) => [1, 3, 5, 10].indexOf(p.ctl.loadRate) < 0 ? 1 : [1, 3, 5, 10].indexOf(p.ctl.loadRate)),
        click: (p) => { const l = [1, 3, 5, 10]; act(p, 'loadRate', l[(l.indexOf(p.ctl.loadRate) + 1) % 4]); }
      }),
      C(X + 424, BENCH, 60, 26, {
        k: 'turbTrip', tip: L('t.turbTrip'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 60, h: 24, text: L('c.trip'), label: L('g.turbine'), lit: p.sec.turbTripped, litColor: G.pal().red }); },
        click: (p) => act(p, 'turbTrip')
      }),
      C(X + 520, BENCH, 60, 26, {
        k: 'mfw', tip: L('t.mfw'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 60, h: 24, text: p.sec.mfw ? L('c.trip') : L('c.start'), label: L('c.mainFeed'), lit: p.sec.mfw, litColor: G.pal().green }); },
        click: (p) => act(p, 'mfw', !p.sec.mfw)
      })
    ];
    for (let k = 0; k < 4; k++) {
      ctrls.push(C(X + 598 + (k % 2) * 66, BENCH - 22 + Math.floor(k / 2) * 44, 60, 24, {
        k: 'sgPorv', idx: k, tip: L('t.sgPorv', k + 1),
        draw: function (c, p) {
          G.button(c, { x: this.cx, y: this.cy, w: 60, h: 22, text: L('c.arv', this.idx + 1), lit: p.sec.sgPorv[this.idx] > 0, litColor: G.pal().amber, size: 8 });
        },
        click: function (p) { act(p, 'sgPorv', p.sec.sgPorv[this.idx] > 0 ? 0 : 1, this.idx); }
      }));
    }
    for (let k = 0; k < 4; k++) {
      ctrls.push(C(X + MARGIN + k * COL + 52, SHELF - 14, 52, 24, {
        k: 'feedMode', idx: k, tip: L('t.feedMode', k + 1),
        draw: function (c, p) {
          G.button(c, { x: this.cx, y: this.cy, w: 52, h: 22, text: p.sec.feedMode[this.idx], label: L('c.fw', this.idx + 1), size: 8 });
        },
        click: function (p) { act(p, 'feedMode', p.sec.feedMode[this.idx] === 'AUTO' ? 'MANUAL' : 'AUTO', this.idx); }
      }));
    }

    return {
      name: 'SECONDARY', x0: 1520, x1: 2280, ctrls: ctrls,
      draw: function (c, p) {
        const i = p.ind, P = G.pal();
        // one column per steam generator: the two level channels side by side,
        // pressure over steam flow, feed flow and the two lamps underneath
        for (let k = 0; k < 4; k++) {
          const c0 = X + MARGIN + k * COL;
          G.vmeter(c, { x: c0 + 2, y: 288, w: 44, h: 176, min: 0, max: 100, val: clamp(i.sgNr[k], -4, 104), label: L('g.sgNr', k + 1), ticks: 10, majEvery: 2, setpoint: 60, bands: [[0, 17, 'rgba(184,36,28,0.5)'], [17, 25, 'rgba(255,164,43,0.45)']] });
          G.vmeter(c, { x: c0 + 52, y: 288, w: 28, h: 176, min: 0, max: 100, val: clamp(i.sgWr[k], -4, 104), label: L('g.sgWr'), ticks: 10, majEvery: 5, numbers: false, bar: true, barColor: P.needleAlt });
          G.needle(c, { cx: c0 + 128, cy: 326, r: 36, min: 0, max: 10, val: clamp(i.sgP[k], 0, 10), label: L('g.sg', k + 1), unit: L('g.mpa'), majors: 5, minors: 2, bands: [[7.9, 10, 'rgba(184,36,28,0.55)']] });
          G.needle(c, { cx: c0 + 128, cy: 418, r: 36, min: 0, max: 600, val: clamp(i.wSteam[k], 0, 600), label: L('g.steam'), unit: L('g.kgs'), majors: 3, minors: 2, needleColor: P.needle });
          G.needle(c, { cx: c0 + 50, cy: 538, r: 40, min: 0, max: 600, val: clamp(i.wFeed[k], 0, 600), label: L('g.feed', k + 1), unit: L('g.kgs'), majors: 3, minors: 2, needleColor: G.pal().trace[1] });
          G.lamp(c, { x: c0 + 128, y: 512, r: 8, on: p.th.sg[k].wAfw > 0.5, color: P.blue, label: L('g.afw', k + 1) });
          G.lamp(c, { x: c0 + 128, y: 560, r: 8, on: p.th.sg[k].p > 7.88, color: P.red, label: L('g.sfty') });
        }

        // turbine group, across the full width under the generators
        G.needle(c, { cx: X + 70, cy: 654, r: 50, min: 0, max: 110, val: clamp(i.turbLoad, 0, 110), label: L('g.turbine'), unit: L('g.pctDemand'), majors: 11, minors: 2 });
        G.digital(c, { x: X + 150, y: 604, w: 160, h: 40, text: G.fmt(i.mwe, 0), label: L('g.generator'), unit: L('g.mwe'), size: 20, lit: i.backlight[2] });
        G.digital(c, { x: X + 150, y: 662, w: 160, h: 34, text: G.fmt(p.ctl.turbDemand, 0), label: L('g.loadDemand'), unit: '%', size: 17, lit: i.backlight[2] });
        G.digital(c, { x: X + 330, y: 604, w: 160, h: 40, text: G.fmt(sum(i.wSteam), 0), label: L('g.totalSteam'), unit: L('g.kgs'), size: 20, lit: i.backlight[2] });
        G.digital(c, { x: X + 330, y: 662, w: 160, h: 34, text: G.fmt(sum(i.wFeed), 0), label: L('g.totalFeed'), unit: L('g.kgs'), size: 17, lit: i.backlight[2], color: sum(i.wFeed) < sum(i.wSteam) - 60 ? P.amber : undefined });
        G.vmeter(c, { x: X + 520, y: 602, w: 44, h: 100, min: 0, max: 100, val: clamp(p.th.dumpValve * 100, 0, 100), label: L('g.dump'), ticks: 4, majEvery: 2, bar: true, numbers: false, barColor: P.needleAlt });
        G.needle(c, { cx: X + 644, cy: 654, r: 50, min: 0, max: 100, val: clamp(i.condVac, 0, 100), label: L('g.condVac'), unit: L('g.pctNormal'), majors: 5, minors: 2, bands: [[0, 70, 'rgba(184,36,28,0.5)']] });
      }
    };
  }

  // ======================= ELECTRICAL =====================================
  function electricalBoard() {
    const X = 2280;
    const ctrls = [
      C(X + 96, BENCH, 34, 56, {
        k: 'offsite', tip: L('t.offsite'),
        draw: tglDraw(L('c.offsiteBkr'), [L('c.opened'), '', L('c.closed')], (p) => (p.elec.offsite ? 2 : 0)),
        click: (p) => act(p, 'offsite', !p.elec.offsite)
      }),
      C(X + 214, BENCH, 62, 26, {
        k: 'edg', tip: L('t.edg', 1),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 24, text: p.elec.edg[0].cmd ? L('c.stop') : L('c.start'), label: L('g.edg', 1), lit: p.elec.edg[0].running, litColor: G.pal().green }); },
        click: (p) => act(p, 'edg', !p.elec.edg[0].cmd, 0)
      }),
      C(X + 300, BENCH, 62, 26, {
        k: 'edg', tip: L('t.edg', 2),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 24, text: p.elec.edg[1].cmd ? L('c.stop') : L('c.start'), label: L('g.edg', 2), lit: p.elec.edg[1].running, litColor: G.pal().green }); },
        click: (p) => act(p, 'edg', !p.elec.edg[1].cmd, 1)
      })
    ];

    return {
      name: 'ELECTRICAL', x0: 2280, x1: 3040, ctrls: ctrls,
      draw: function (c, p) {
        const i = p.ind, P = G.pal(), e = p.elec;
        G.engrave(c, L('g.busesHdr'), X + 190, TOP + 26, 11);
        const busV = (b) => (b === 'dead' ? 0 : b === 'edg' ? 4120 : 4180);
        G.needle(c, { cx: X + 92, cy: ROW1 + 26, r: 50, min: 0, max: 5000, val: busV(e.busA), label: L('g.bus', 'A'), unit: L('g.vac'), majors: 5, minors: 2, bands: [[0, 3500, 'rgba(184,36,28,0.5)']] });
        G.needle(c, { cx: X + 210, cy: ROW1 + 26, r: 50, min: 0, max: 5000, val: busV(e.busB), label: L('g.bus', 'B'), unit: L('g.vac'), majors: 5, minors: 2, bands: [[0, 3500, 'rgba(184,36,28,0.5)']] });
        G.needle(c, { cx: X + 340, cy: ROW1 + 26, r: 50, min: 90, max: 140, val: clamp(e.battV, 90, 140), label: L('g.battery'), unit: L('g.vdc'), majors: 5, minors: 2, bands: [[90, 108, 'rgba(184,36,28,0.55)'], [108, 115, 'rgba(255,164,43,0.5)']] });
        G.digital(c, { x: X + 410, y: ROW1 + 6, w: 104, h: 32, text: G.fmt(e.battery * 100, 0) + '%', label: L('g.battCharge'), size: 17, lit: i.backlight[3] });
        G.digital(c, { x: X + 410, y: ROW1 + 62, w: 104, h: 32, text: G.fmt(e.battV, 1), unit: L('g.vdc'), size: 17, lit: i.backlight[3] });

        G.lamp(c, { x: X + 560, y: TOP + 46, r: 11, on: e.offsite, color: P.green, label: L('g.offsite', 1) });
        G.lamp(c, { x: X + 622, y: TOP + 46, r: 11, on: e.offsite, color: P.green, label: L('g.offsite', 2) });
        G.lamp(c, { x: X + 684, y: TOP + 46, r: 11, on: !e.offsite, color: P.red, label: L('g.lossPwr') });
        G.lamp(c, { x: X + 560, y: TOP + 118, r: 11, on: e.busA !== 'dead', color: e.busA === 'edg' ? P.amber : P.green, label: L('g.busLamp', 'A') });
        G.lamp(c, { x: X + 622, y: TOP + 118, r: 11, on: e.busB !== 'dead', color: e.busB === 'edg' ? P.amber : P.green, label: L('g.busLamp', 'B') });
        G.lamp(c, { x: X + 684, y: TOP + 118, r: 11, on: e.battV > 105, color: P.green, label: L('g.dcBus') });

        for (let k = 0; k < 2; k++) {
          const d = e.edg[k];
          const cx = X + 110 + k * 200;
          G.needle(c, { cx: cx, cy: ROW3 + 4, r: 46, min: 0, max: 7, val: d.running ? (k === 0 ? (e.busA === 'edg' ? 4.2 : 0.4) : (e.busB === 'edg' ? 4.2 : 0.4)) : 0, label: L('g.edg', k + 1), unit: L('g.mw'), majors: 7, minors: 2 });
          G.lamp(c, { x: cx + 76, y: ROW3 - 24, r: 9, on: d.running, color: P.green, label: L('g.run') });
          G.lamp(c, { x: cx + 76, y: ROW3 + 22, r: 9, on: d.failed || (d.cmd && !d.running), color: P.red, label: L('g.trouble') });
        }
        G.needle(c, { cx: X + 560, cy: ROW3 + 4, r: 46, min: 0, max: 1300, val: clamp(i.mwe, 0, 1300), label: L('g.grossOut'), unit: L('g.mwe'), majors: 13, minors: 2, numbers: false });
        G.digital(c, { x: X + 620, y: ROW3 - 12, w: 118, h: 36, text: G.fmt(i.mwe, 0), unit: L('g.mwe'), size: 20, lit: i.backlight[3] });
        G.digital(c, { x: X + 620, y: ROW3 + 30, w: 118, h: 30, text: G.fmt(p.mwhDelivered, 0), unit: L('g.mwh'), size: 15, lit: i.backlight[3] });
      }
    };
  }

  // ======================= SAFETY =========================================
  function safetyBoard() {
    const X = 3040;
    const ctrls = [
      C(X + 92, BENCH - 4, 82, 60, {
        k: 'siMan', tip: L('t.siMan'),
        draw: function (c, p) { G.guarded(c, { x: this.cx, y: this.cy, w: 82, h: 58, label: L('c.si'), armed: !!p.ui_siArmed }); },
        click: (p) => { if (p.ui_siArmed) { act(p, 'si', true); p.ui_siArmed = false; } else p.ui_siArmed = true; }
      }),
      C(X + 190, BENCH, 62, 26, {
        k: 'siReset', tip: L('t.siReset'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 24, text: L('c.reset'), label: L('c.siShort'), lit: p.si.blocked, litColor: G.pal().amber }); },
        click: (p) => act(p, 'si', false)
      }),
      C(X + 282, BENCH, 62, 26, {
        k: 'contSpray', tip: L('t.contSpray'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 24, text: L('c.sprayBtn'), label: L('c.contain'), lit: p.cont.spray, litColor: G.pal().blue }); },
        click: (p) => act(p, 'contSpray', !p.cont.spray)
      })
    ];
    for (let k = 0; k < 2; k++) {
      ctrls.push(C(X + 386 + k * 70, BENCH - 26, 62, 24, {
        k: 'hpi', idx: k, tip: L('t.hpi'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 22, text: L('c.hpi', this.idx === 0 ? 'A' : 'B'), lit: p.si.on && p.si.hpi[this.idx], litColor: G.pal().green, size: 8 }); },
        click: function (p) { act(p, 'hpi', !p.si.hpi[this.idx], this.idx); }
      }));
      ctrls.push(C(X + 386 + k * 70, BENCH + 18, 62, 24, {
        k: 'lpi', idx: k, tip: L('t.lpi'),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 22, text: L('c.lpi', this.idx === 0 ? 'A' : 'B'), lit: p.si.on && p.si.lpi[this.idx], litColor: G.pal().green, size: 8 }); },
        click: function (p) { act(p, 'lpi', !p.si.lpi[this.idx], this.idx); }
      }));
    }
    for (let k = 0; k < 3; k++) {
      ctrls.push(C(X + 566 + k * 70, BENCH - 26, 62, 24, {
        k: 'afw', idx: k, tip: L('t.afw'),
        draw: function (c, p) {
          const a = p.sec.afw[this.idx];
          G.button(c, { x: this.cx, y: this.cy, w: 62, h: 22, text: L('c.afwPump', a.id), lit: a.running, litColor: a.failed ? G.pal().red : G.pal().green, size: 8 });
        },
        click: function (p) { act(p, 'afw', !p.sec.afw[this.idx].manual, this.idx); }
      }));
    }
    for (let k = 0; k < 4; k++) {
      ctrls.push(C(X + 566 + (k % 2) * 70, BENCH + 18 + Math.floor(k / 2) * 28, 62, 24, {
        k: 'acc', idx: k, tip: L('t.acc', k + 1),
        draw: function (c, p) { G.button(c, { x: this.cx, y: this.cy, w: 62, h: 22, text: L('c.accBtn', this.idx + 1), lit: !p.si.accIso[this.idx] && p.si.accM[this.idx] > 100, litColor: G.pal().blue, size: 8 }); },
        click: function (p) { act(p, 'accIso', !p.si.accIso[this.idx], this.idx); }
      }));
    }

    return {
      name: 'SAFETY', x0: 3040, x1: 3840, ctrls: ctrls,
      draw: function (c, p) {
        const i = p.ind, P = G.pal();
        G.needle(c, { cx: X + 88, cy: ROW1 + 20, r: 52, min: 0.09, max: 0.55, val: clamp(i.contP, 0.09, 0.55), label: L('g.cnmtPress'), unit: L('g.mpaAbs'), majors: 4, minors: 2, dec: 2, bands: [[0.117, 0.42, 'rgba(255,164,43,0.5)'], [0.42, 0.55, 'rgba(184,36,28,0.6)']] });
        G.needle(c, { cx: X + 212, cy: ROW1 + 20, r: 52, min: 20, max: 160, val: clamp(i.contT, 20, 160), label: L('g.cnmtTemp'), unit: L('g.degC'), majors: 7, minors: 2 });
        G.logmeter(c, { x: X + 282, y: ROW1 - 6, w: 200, h: 60, dec0: 0, dec1: 8, val: Math.max(i.contRad, 1), label: L('g.cnmtRad') });
        G.logmeter(c, { x: X + 510, y: ROW1 - 6, w: 200, h: 60, dec0: 0, dec1: 6, val: Math.max.apply(null, i.slRad), label: L('g.slRad') });
        for (let k = 0; k < 4; k++) {
          G.lamp(c, { x: X + 528 + k * 46, y: ROW1 + 74, r: 8, on: i.slRad[k] > 8, color: P.red, label: L('g.sl', k + 1) });
        }

        G.needle(c, { cx: X + 88, cy: ROW3 - 6, r: 46, min: 0, max: 120, val: clamp(p.th.wHpi, 0, 120), label: L('g.hpiFlow'), unit: L('g.kgs'), majors: 6, minors: 2 });
        G.needle(c, { cx: X + 206, cy: ROW3 - 6, r: 46, min: 0, max: 300, val: clamp(p.th.wLpi, 0, 300), label: L('g.lpiFlow'), unit: L('g.kgs'), majors: 6, minors: 2 });
        G.needle(c, { cx: X + 324, cy: ROW3 - 6, r: 46, min: 0, max: 80, val: clamp(p.th.sg.reduce((a, s) => a + s.wAfw, 0), 0, 80), label: L('g.afwFlow'), unit: L('g.kgs'), majors: 4, minors: 2 });
        for (let k = 0; k < 4; k++) {
          G.vmeter(c, { x: X + 396 + k * 44, y: ROW3 - 62, w: 36, h: 116, min: 0, max: 28000, val: p.si.accM[k], label: L('g.acc', k + 1), ticks: 4, majEvery: 4, bar: true, numbers: false, barColor: P.blue });
        }
        G.lamp(c, { x: X + 610, y: ROW3 - 40, r: 11, on: p.si.on, color: P.red, label: L('g.siAct') });
        G.lamp(c, { x: X + 682, y: ROW3 - 40, r: 11, on: p.cont.isolated, color: P.amber, label: L('g.cnmtIsol') });
        G.lamp(c, { x: X + 610, y: ROW3 + 18, r: 11, on: p.th.coreCovered < 0.999, color: P.red, label: L('g.coreUncov') });
        G.lamp(c, { x: X + 682, y: ROW3 + 18, r: 11, on: p.rad.cladFail > 0.001, color: P.red, label: L('g.fuelDamage') });
        G.digital(c, { x: X + 566, y: ROW3 + 62, w: 160, h: 30, text: G.fmt(p.th.tClad, 0), label: L('g.coreExit'), size: 16, lit: i.backlight[4], color: p.th.tClad > 700 ? P.red : undefined });
      }
    };
  }

  let BOARDS = null;
  function boards() {
    if (!BOARDS) BOARDS = [reactorBoard(), primaryBoard(), secondaryBoard(), electricalBoard(), safetyBoard()];
    return BOARDS;
  }

  // switch legends and tooltips are baked in when a board is built, so changing
  // language rebuilds them
  function reset() { BOARDS = null; }

  // continuous controls held down between frames
  function tick(p, dt) {
    if (p.ui_chg) act(p, 'charging', clamp(p.ctl.charging + p.ui_chg * 12 * dt, 0, 60));
    if (p.ui_dump) { act(p, 'dumpMode', 'MANUAL'); act(p, 'dumpManual', clamp(p.sec.dumpManual + p.ui_dump * 0.35 * dt, 0, 1)); }
    if (p.ui_load) act(p, 'turbDemand', clamp(p.ctl.turbDemand + p.ui_load * 9 * dt, 0, 100));
  }

  DH.Boards = { boards: boards, reset: reset, tick: tick, TOP: TOP, BOT: BOT, LIP: LIP, BENCH: BENCH };
})();
