(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const TAU = Math.PI * 2;

  let P = null;
  function pal() {
    if (P) return P;
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => cs.getPropertyValue('--dh-' + n).trim();
    P = {
      wall: g('wall'), wallLo: g('wall-lo'), ceiling: g('ceiling'),
      panel: g('panel'), panelHi: g('panel-hi'), panelLo: g('panel-lo'), panelEdge: g('panel-edge'),
      bezel: g('bezel'), bezelHi: g('bezel-hi'),
      face: g('face'), faceLo: g('face-lo'),
      ink: g('ink'), inkDim: g('ink-dim'),
      needle: g('needle'), needleAlt: g('needle-alt'),
      desk: g('desk'), deskHi: g('desk-hi'), deskLo: g('desk-lo'), underDesk: g('under-desk'),
      red: g('lamp-red'), amber: g('lamp-amber'), green: g('lamp-green'),
      white: g('lamp-white'), blue: g('lamp-blue'), off: g('lamp-off'),
      tileOff: g('tile-off'), screen: g('screen'), screenInk: g('screen-ink'),
      paper: g('paper'),
      trace: [g('trace-1'), g('trace-2'), g('trace-3'), g('trace-4')],
      emerg: g('emerg'),
      metalHi: g('metal-hi'), metalLo: g('metal-lo'), metalMid: g('metal-mid'),
      lever: g('lever'), knobMark: g('knob-mark'),
      btnInk: g('btn-ink'), btnInkLit: g('btn-ink-lit'),
      guardWell: g('guard-well'), guardGlass: g('guard-glass'),
      tripHi: g('trip-hi'), tripLo: g('trip-lo'), tripDark: g('trip-dark'),
      nixieBg: g('nixie-bg'), screw: g('screw'),
      mug: g('mug'), mugLo: g('mug-lo'), brew: g('brew'), brewHi: g('brew-hi'),
      binder: g('binder'), binderHi: g('binder-hi'),
      torchBody: g('torch-body'), torchHi: g('torch-hi'),
      markerY: g('marker-y'), markerG: g('marker-g'),
      penBlue: g('pen-blue'), penRed: g('pen-red'), pencil: g('pencil'),
      hand: g('hand'), handRim: g('hand-rim'),
      docInk: g('doc-ink'), docEdge: g('doc-edge'), docTab: g('doc-tab'),
      tileLitDim: g('tile-lit-dim'), tileInkDim: g('tile-ink-dim'),
      annHi: g('ann-bg-hi'), annLo: g('ann-bg-lo'), annEdge: g('ann-edge'),
      camFar: g('cam-far'), camMid: g('cam-mid'), camNear: g('cam-near'),
      camSteel: g('cam-steel'), camSteelLo: g('cam-steel-lo'),
      camInk: g('cam-ink'), camWater: g('cam-water'), plotBg: g('plot-bg')
    };
    return P;
  }

  function rr(c, x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + k, y);
    c.arcTo(x + w, y, x + w, y + h, k);
    c.arcTo(x + w, y + h, x, y + h, k);
    c.arcTo(x, y + h, x, y, k);
    c.arcTo(x, y, x + w, y, k);
    c.closePath();
  }

  // Panel typography, in panorama units. The camera is far enough back that these
  // land at roughly 0.85× on a 1600px window, so anything under about 8 here is
  // not readable once the lens has resampled it — that is the floor everything
  // below respects, and tests/run.js holds it there.
  const T = {
    cap: 10.5,      // instrument nameplate
    capMin: 7.8,    // ...after chord fitting on a crowded dial
    unit: 9,        // engineering unit under a nameplate
    tick: 9.5,      // numbers on a scale
    read: 11,       // digital readout on an analogue instrument
    legend: 9.5,    // switch position legends
    state: 9.5      // what a switch currently reads
  };

  function engrave(c, s, x, y, size, align, col) {
    const p = pal();
    c.font = '600 ' + size + 'px ' + (DH.UI_FONT || 'Helvetica, Arial, sans-serif');
    c.textAlign = align || 'center';
    c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,255,255,0.20)';
    c.fillText(s, x, y + size * 0.07);
    c.fillStyle = col || p.ink;
    c.fillText(s, x, y);
  }

  function mono(c, s, x, y, size, align, col) {
    c.font = size + 'px ' + (DH.UI_MONO || 'monospace');
    c.textAlign = align || 'left';
    c.textBaseline = 'middle';
    c.fillStyle = col || pal().ink;
    c.fillText(s, x, y);
  }

  function screws(c, x, y, w, h, r) {
    const p = pal();
    const pts = [[x + 7, y + 7], [x + w - 7, y + 7], [x + 7, y + h - 7], [x + w - 7, y + h - 7]];
    for (const [sx, sy] of pts) {
      c.beginPath(); c.arc(sx, sy, r || 3.2, 0, TAU);
      c.fillStyle = p.panelLo; c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.7; c.stroke();
      c.beginPath(); c.moveTo(sx - 2, sy - 1.2); c.lineTo(sx + 2, sy + 1.2);
      c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1; c.stroke();
    }
  }

  function panelSection(c, x, y, w, h, tone) {
    const p = pal();
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, p.panelHi);
    g.addColorStop(0.42, p.panel);
    g.addColorStop(1, p.panelLo);
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    if (tone) { c.fillStyle = tone; c.fillRect(x, y, w, h); }
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.fillRect(x, y, w, 2);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x, y + h - 2, w, 2);
    c.strokeStyle = p.panelEdge; c.lineWidth = 1;
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function inset(c, x, y, w, h, r, fill) {
    const p = pal();
    rr(c, x, y, w, h, r === undefined ? 3 : r);
    c.fillStyle = fill || p.bezel;
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1.4; c.stroke();
    rr(c, x + 1, y + 1, w - 2, h - 2, Math.max((r || 3) - 1, 0));
    c.strokeStyle = 'rgba(255,255,255,0.09)'; c.lineWidth = 1; c.stroke();
  }

  function fmt(v, d) {
    if (!isFinite(v)) return '---';
    return v.toFixed(d === undefined ? 0 : d);
  }

  function sci(v) {
    if (!isFinite(v) || v <= 0) return '0.0E0';
    const e = Math.floor(Math.log10(v));
    return (v / Math.pow(10, e)).toFixed(1) + 'E' + e;
  }

  // ---- round needle gauge, 250 degree sweep -------------------------------
  function needle(c, o) {
    const p = pal();
    const r = o.r, cx = o.cx, cy = o.cy;
    const A0 = Math.PI * 0.72, A1 = Math.PI * 2.28;
    const lo = o.min, hi = o.max;
    const norm = (v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    const ang = (v) => A0 + (A1 - A0) * norm(v);

    c.beginPath(); c.arc(cx, cy, r + 6, 0, TAU);
    const bg = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bg.addColorStop(0, p.bezelHi); bg.addColorStop(0.5, p.bezel); bg.addColorStop(1, p.metalLo);
    c.fillStyle = bg; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1.5; c.stroke();

    c.beginPath(); c.arc(cx, cy, r, 0, TAU);
    const fg = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    fg.addColorStop(0, p.face); fg.addColorStop(1, p.faceLo);
    c.fillStyle = fg; c.fill();

    if (o.bands) {
      for (const b of o.bands) {
        c.beginPath();
        c.arc(cx, cy, r - 5, ang(b[0]), ang(b[1]));
        c.lineWidth = 5; c.strokeStyle = b[2]; c.stroke();
      }
    }

    const nMaj = o.majors === undefined ? 5 : o.majors;
    const nMin = o.minors === undefined ? 4 : o.minors;
    const tick = (t) => (o.fmtTick ? o.fmtTick(lo + (hi - lo) * t) : fmt(lo + (hi - lo) * t, o.dec || 0));
    const numSize = Math.max(T.tick, r * 0.19);
    const rNum = r - 12 - numSize * 0.75;
    // Number only as many majors as fit shoulder to shoulder at that radius. A
    // gauge with eleven divisions still gets eleven ticks, just not eleven
    // legends piled on top of one another.
    let widest = 0;
    if (o.numbers !== false) for (let j = 0; j <= nMaj; j++) widest = Math.max(widest, tick(j / nMaj).length);
    const step = Math.max(1, Math.ceil((widest * numSize * 0.54) / ((rNum * (A1 - A0)) / nMaj)));

    for (let i = 0; i <= nMaj * nMin; i++) {
      const t = i / (nMaj * nMin);
      const a = A0 + (A1 - A0) * t;
      const maj = i % nMin === 0;
      const r0 = r - (maj ? 12 : 7), r1 = r - 2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      c.lineWidth = maj ? 1.8 : 0.9;
      c.strokeStyle = p.ink; c.stroke();
      if (maj && o.numbers !== false && (i / nMin) % step === 0) {
        mono(c, tick(t), cx + Math.cos(a) * rNum, cy + Math.sin(a) * rNum, numSize, 'center', p.ink);
      }
    }

    // caption and unit go in the clear disc the number ring leaves behind,
    // shrunk to the chord available at their own height. The ring eats its own
    // text width inwards, which is what the widest term accounts for.
    const inner = Math.max(rNum - widest * numSize * 0.3 - numSize * 0.35, r * 0.24);
    const chord = (yy) => 1.72 * Math.sqrt(Math.max(inner * inner - yy * yy, 1));
    if (o.label) {
      const yy = -inner * 0.46;
      engrave(c, o.label, cx, cy + yy, Math.max(T.capMin, Math.min(r * 0.21, chord(yy) / (0.55 * o.label.length))));
    }
    if (o.unit) {
      const yy = inner * 0.52;
      mono(c, o.unit, cx, cy + yy, Math.max(T.unit * 0.92, Math.min(r * 0.155, chord(yy) / (0.6 * o.unit.length))), 'center', p.inkDim);
    }

    const a = ang(o.val);
    c.save();
    c.translate(cx, cy); c.rotate(a);
    c.beginPath();
    c.moveTo(-r * 0.18, 0);
    c.lineTo(0, -r * 0.055);
    c.lineTo(r - 6, 0);
    c.lineTo(0, r * 0.055);
    c.closePath();
    c.fillStyle = o.needleColor || p.needle;
    c.fill();
    c.restore();

    if (o.setpoint !== undefined) {
      const sa = ang(o.setpoint);
      c.beginPath();
      c.moveTo(cx + Math.cos(sa) * (r - 14), cy + Math.sin(sa) * (r - 14));
      c.lineTo(cx + Math.cos(sa) * (r - 1), cy + Math.sin(sa) * (r - 1));
      c.lineWidth = 2.2; c.strokeStyle = p.blue; c.stroke();
    }

    c.beginPath(); c.arc(cx, cy, r * 0.09, 0, TAU);
    c.fillStyle = p.metalLo; c.fill();

    c.beginPath(); c.arc(cx, cy, r, Math.PI * 1.05, Math.PI * 1.65);
    c.lineWidth = r * 0.16; c.strokeStyle = 'rgba(255,255,255,0.07)'; c.stroke();
  }

  // ---- vertical edgewise meter -------------------------------------------
  function vmeter(c, o) {
    const p = pal();
    const x = o.x, y = o.y, w = o.w, h = o.h;
    inset(c, x, y, w, h, 3);
    const ix = x + 3, iy = y + 3, iw = w - 6, ih = h - 6;
    const fg = c.createLinearGradient(ix, 0, ix + iw, 0);
    fg.addColorStop(0, p.face); fg.addColorStop(1, p.faceLo);
    c.fillStyle = fg; c.fillRect(ix, iy, iw, ih);

    const norm = (v) => Math.min(1, Math.max(0, (v - o.min) / (o.max - o.min)));
    if (o.bands) for (const b of o.bands) {
      const y0 = iy + ih * (1 - norm(b[1])), y1 = iy + ih * (1 - norm(b[0]));
      c.fillStyle = b[2]; c.fillRect(ix, y0, 4, y1 - y0);
    }
    const nT = o.ticks || 10;
    for (let i = 0; i <= nT; i++) {
      const yy = iy + ih * (1 - i / nT);
      const maj = i % (o.majEvery || 2) === 0;
      c.beginPath(); c.moveTo(ix + iw - (maj ? 11 : 6), yy); c.lineTo(ix + iw, yy);
      c.lineWidth = maj ? 1.5 : 0.8; c.strokeStyle = p.ink; c.stroke();
      if (maj && o.numbers !== false) {
        mono(c, fmt(o.min + (o.max - o.min) * (i / nT), o.dec || 0),
          ix + iw - 13, yy, T.tick, 'right', p.ink);
      }
    }
    if (o.bar) {
      const bh = ih * norm(o.val);
      c.fillStyle = o.barColor || p.needle;
      c.fillRect(ix + 5, iy + ih - bh, iw - 16, bh);
    } else {
      const yy = iy + ih * (1 - norm(o.val));
      c.beginPath();
      c.moveTo(ix, yy); c.lineTo(ix + iw - 2, yy - 3.2); c.lineTo(ix + iw - 2, yy + 3.2);
      c.closePath(); c.fillStyle = o.barColor || p.needle; c.fill();
    }
    if (o.setpoint !== undefined) {
      const sy = iy + ih * (1 - norm(o.setpoint));
      c.beginPath(); c.moveTo(ix, sy - 3); c.lineTo(ix + 5, sy); c.lineTo(ix, sy + 3);
      c.closePath(); c.fillStyle = p.blue; c.fill();
    }
    if (o.label) engrave(c, o.label, x + w / 2, y + h + 9, T.cap);
  }

  // ---- logarithmic decade meter ------------------------------------------
  function logmeter(c, o) {
    const p = pal();
    inset(c, o.x, o.y, o.w, o.h, 3);
    const ix = o.x + 3, iy = o.y + 3, iw = o.w - 6, ih = o.h - 6;
    c.fillStyle = p.face; c.fillRect(ix, iy, iw, ih);
    const d0 = o.dec0, d1 = o.dec1, nd = d1 - d0;
    const lv = Math.log10(Math.max(o.val, Math.pow(10, d0 - 1)));
    for (let d = 0; d <= nd; d++) {
      const xx = ix + (iw * d) / nd;
      c.beginPath(); c.moveTo(xx, iy + ih - 12); c.lineTo(xx, iy + ih);
      c.lineWidth = 1.5; c.strokeStyle = p.ink; c.stroke();
      mono(c, '1E' + (d0 + d), xx, iy + ih - 18, T.tick, 'center', p.ink);
      for (let m = 2; m < 10; m++) {
        const mx = ix + (iw * (d + Math.log10(m))) / nd;
        if (mx > ix + iw) break;
        c.beginPath(); c.moveTo(mx, iy + ih - 6); c.lineTo(mx, iy + ih);
        c.lineWidth = 0.7; c.strokeStyle = p.inkDim; c.stroke();
      }
    }
    const px = ix + (iw * Math.min(Math.max(lv - d0, 0), nd)) / nd;
    c.beginPath();
    c.moveTo(px, iy + 2); c.lineTo(px - 4, iy + 9); c.lineTo(px + 4, iy + 9);
    c.closePath(); c.fillStyle = p.needle; c.fill();
    c.beginPath(); c.moveTo(px, iy + 8); c.lineTo(px, iy + ih - 12);
    c.lineWidth = 1.4; c.strokeStyle = p.needle; c.stroke();
    if (o.label) engrave(c, o.label, o.x + o.w / 2, o.y - 9, T.cap);
    if (o.readout !== false) mono(c, sci(o.val), o.x + o.w - 4, o.y + 11, T.read, 'right', p.ink);
  }

  // ---- digital readout ---------------------------------------------------
  function digital(c, o) {
    const p = pal();
    inset(c, o.x, o.y, o.w, o.h, 2, p.nixieBg);
    const lit = o.lit === undefined ? 1 : o.lit;
    c.save();
    c.globalAlpha = 0.25 + 0.75 * lit;
    const size = o.size || o.h * 0.62;
    c.font = size + 'px ' + (DH.UI_MONO || 'monospace');
    c.textAlign = 'right'; c.textBaseline = 'middle';
    c.shadowColor = o.color || p.amber; c.shadowBlur = 7;
    c.fillStyle = o.color || p.amber;
    c.fillText(o.text, o.x + o.w - 7, o.y + o.h / 2 + 0.5);
    c.restore();
    if (o.label) engrave(c, o.label, o.x + o.w / 2, o.y - 9, T.cap);
    if (o.unit) mono(c, o.unit, o.x + 6, o.y + o.h / 2, Math.max(T.unit, o.h * 0.3), 'left', p.inkDim);
  }

  function lamp(c, o) {
    const p = pal();
    const r = o.r || 7;
    const col = o.color || p.green;
    c.beginPath(); c.arc(o.x, o.y, r + 2.5, 0, TAU);
    c.fillStyle = p.bezel; c.fill();
    c.beginPath(); c.arc(o.x, o.y, r, 0, TAU);
    if (o.on) {
      c.save(); c.shadowColor = col; c.shadowBlur = r * 2.2;
      c.fillStyle = col; c.fill(); c.restore();
      c.beginPath(); c.arc(o.x - r * 0.3, o.y - r * 0.3, r * 0.32, 0, TAU);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
    } else {
      c.fillStyle = p.off; c.fill();
    }
    if (o.label) engrave(c, o.label, o.x, o.y + r + 9, T.unit, 'center', p.ink);
  }

  // ---- controls -----------------------------------------------------------
  function toggle(c, o) {
    const p = pal();
    const w = o.w || 26, h = o.h || 40;
    const x = o.x - w / 2, y = o.y - h / 2;
    inset(c, x, y, w, h, 4, p.panelLo);
    const n = o.states.length;
    const idx = o.index;
    const frac = n === 1 ? 0.5 : idx / (n - 1);
    const ty = y + 7 + (h - 14) * frac;
    c.beginPath();
    c.moveTo(o.x, y + h / 2);
    c.lineTo(o.x, ty);
    c.lineWidth = 5; c.lineCap = 'round';
    c.strokeStyle = p.lever; c.stroke();
    c.beginPath(); c.arc(o.x, ty, 6, 0, TAU);
    const g = c.createLinearGradient(o.x - 6, ty - 6, o.x + 6, ty + 6);
    g.addColorStop(0, p.metalHi); g.addColorStop(1, p.metalLo);
    c.fillStyle = g; c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.stroke();
    if (o.label) engrave(c, o.label, o.x, y - 10, T.cap);
    if (o.showState !== false) mono(c, o.states[idx], o.x, y + h + 9, T.state, 'center', p.ink);
  }

  function rotary(c, o) {
    const p = pal();
    const r = o.r || 15;
    c.beginPath(); c.arc(o.x, o.y, r + 3, 0, TAU);
    c.fillStyle = p.bezel; c.fill();
    const g = c.createLinearGradient(o.x - r, o.y - r, o.x + r, o.y + r);
    g.addColorStop(0, p.metalMid); g.addColorStop(1, p.metalLo);
    c.beginPath(); c.arc(o.x, o.y, r, 0, TAU); c.fillStyle = g; c.fill();
    const n = o.states.length;
    const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25;
    for (let i = 0; i < n; i++) {
      const a = A0 + ((A1 - A0) * i) / Math.max(n - 1, 1);
      const ca = Math.cos(a), sa = Math.sin(a);
      // aligned away from the knob, or a four-position switch puts its middle
      // legends on top of its own body
      mono(c, o.states[i], o.x + ca * (r + 13), o.y + sa * (r + 13) + sa * 3, T.legend,
        ca < -0.3 ? 'right' : ca > 0.3 ? 'left' : 'center',
        i === o.index ? p.ink : p.inkDim);
    }
    const a = A0 + ((A1 - A0) * o.index) / Math.max(n - 1, 1);
    c.beginPath();
    c.moveTo(o.x, o.y);
    c.lineTo(o.x + Math.cos(a) * (r - 2), o.y + Math.sin(a) * (r - 2));
    c.lineWidth = 3.5; c.lineCap = 'round'; c.strokeStyle = p.knobMark; c.stroke();
    // clear of the legends, including the one an odd-position switch puts at top dead centre
    if (o.label) engrave(c, o.label, o.x, o.y - r - 29, T.cap);
  }

  function button(c, o) {
    const p = pal();
    const w = o.w || 46, h = o.h || 24;
    const x = o.x - w / 2, y = o.y - h / 2;
    rr(c, x, y, w, h, 4);
    const g = c.createLinearGradient(0, y, 0, y + h);
    if (o.down) { g.addColorStop(0, p.metalLo); g.addColorStop(1, p.metalMid); }
    else { g.addColorStop(0, o.tint || p.metalMid); g.addColorStop(1, p.metalLo); }
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 1.2; c.stroke();
    if (o.lit) {
      rr(c, x + 2, y + 2, w - 4, h - 4, 3);
      c.save(); c.globalAlpha = 0.85; c.shadowColor = o.litColor || p.red; c.shadowBlur = 12;
      c.fillStyle = o.litColor || p.red; c.fill(); c.restore();
    }
    mono(c, o.text, o.x, o.y + 0.5, o.size || T.state, 'center', o.lit ? p.btnInkLit : p.btnInk);
    if (o.label) engrave(c, o.label, o.x, y - 9, T.cap);
  }

  function guarded(c, o) {
    const p = pal();
    const w = o.w || 74, h = o.h || 52;
    const x = o.x - w / 2, y = o.y - h / 2;
    inset(c, x, y, w, h, 4, p.guardWell);
    c.beginPath(); c.arc(o.x, o.y + 3, 17, 0, TAU);
    const g = c.createRadialGradient(o.x - 5, o.y - 4, 3, o.x, o.y + 3, 18);
    g.addColorStop(0, p.tripHi); g.addColorStop(1, p.tripLo);
    c.fillStyle = o.armed ? g : p.tripDark; c.fill();
    c.strokeStyle = p.annEdge; c.lineWidth = 2; c.stroke();
    if (o.armed) {
      c.save(); c.shadowColor = p.red; c.shadowBlur = 16;
      c.beginPath(); c.arc(o.x, o.y + 3, 17, 0, TAU); c.strokeStyle = p.red; c.lineWidth = 1.5; c.stroke();
      c.restore();
    }
    if (!o.armed) {
      c.save();
      c.translate(o.x, o.y);
      rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 3);
      c.fillStyle = p.guardGlass; c.fill();
      c.strokeStyle = 'rgba(230,230,240,0.55)'; c.lineWidth = 1.6; c.stroke();
      c.beginPath();
      c.moveTo(-w / 2 + 8, h / 2 - 8); c.lineTo(w / 2 - 8, -h / 2 + 8);
      c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1; c.stroke();
      c.restore();
    }
    engrave(c, o.label, o.x, y - 10, T.cap, 'center', p.ink);
    mono(c, o.armed ? 'ARMED' : 'COVER', o.x, y + h + 9, T.unit, 'center', o.armed ? p.red : p.inkDim);
  }

  // ---- panel-mounted trend window ----------------------------------------
  function trend(c, o) {
    const p = pal();
    inset(c, o.x, o.y, o.w, o.h, 2, p.paper);
    c.save();
    c.beginPath(); c.rect(o.x + 2, o.y + 2, o.w - 4, o.h - 4); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.10)'; c.lineWidth = 0.6;
    for (let i = 1; i < 5; i++) {
      const yy = o.y + (o.h * i) / 5;
      c.beginPath(); c.moveTo(o.x, yy); c.lineTo(o.x + o.w, yy); c.stroke();
    }
    const d = o.data;
    if (d && d.length > 1) {
      c.beginPath();
      for (let i = 0; i < d.length; i++) {
        const xx = o.x + (o.w * i) / (d.length - 1);
        const yy = o.y + o.h - o.h * Math.min(1, Math.max(0, (d[i] - o.min) / (o.max - o.min)));
        if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
      }
      c.strokeStyle = o.color || p.trace[0]; c.lineWidth = 1.3; c.stroke();
    }
    c.restore();
    if (o.label) engrave(c, o.label, o.x + o.w / 2, o.y - 7, 7);
  }

  function seam(c, x, y0, y1) {
    const p = pal();
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x - 3, y0, 6, y1 - y0);
    c.fillStyle = p.panelLo; c.fillRect(x - 2, y0, 4, y1 - y0);
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x - 2, y0, 1, y1 - y0);
    for (let yy = y0 + 26; yy < y1; yy += 54) {
      c.beginPath(); c.arc(x, yy, 3, 0, TAU);
      c.fillStyle = p.screw; c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 0.6; c.stroke();
    }
  }

  DH.G = {
    T, pal, rr, engrave, mono, screws, panelSection, inset, needle, vmeter,
    logmeter, digital, lamp, toggle, rotary, button, guarded, trend, seam, fmt, sci, TAU
  };
})();
