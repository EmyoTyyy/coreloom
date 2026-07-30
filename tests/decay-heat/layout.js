// Stand-in for ui/gauges.js that records the rectangle each primitive covers
// instead of drawing it, so the board layout can be checked without a browser.
// The footprints below mirror the geometry in gauges.js: if a primitive's
// extent changes there, it has to change here too.
const { load: loadScript } = require('./load.js');

// The real type scale, not a copy of it. gauges.js touches no DOM at load, so it
// can be required here purely for T — sizes then cannot drift out of step with
// what the panel actually draws. Footprint geometry below is still a mirror.
loadScript('ui', 'gauges.js');
const T = globalThis.DH.G.T;

const monoW = (s, size) => String(s).length * size * 0.6;
const engW = (s, size) => String(s).length * size * 0.55;

let REC = [];
const push = (kind, x, y, w, h, note) => REC.push({ kind, x, y, w, h, note: note || '' });

const PAL = new Proxy({}, { get: (t, k) => (k === 'trace' ? ['#111', '#222', '#333', '#444'] : '#888') });

function text(s, x, y, size, align, w) {
  const ww = w(String(s), size);
  push('text', align === 'left' ? x : align === 'right' ? x - ww : x - ww / 2,
    y - size * 0.6, ww, size * 1.2, JSON.stringify(String(s)));
}

const G = {
  pal: () => PAL,
  fmt: (v, d) => (isFinite(v) ? v.toFixed(d === undefined ? 0 : d) : '---'),
  sci: () => '0.0E0',
  TAU: Math.PI * 2,
  screws() {}, panelSection() {}, inset() {}, seam() {}, rr() {},
  engrave: (c, s, x, y, size, align) => text(s, x, y, size, align || 'center', engW),
  mono: (c, s, x, y, size, align) => text(s, x, y, size, align || 'left', monoW),
  needle(c, o) {
    push('needle', o.cx - o.r - 6, o.cy - o.r - 6, (o.r + 6) * 2, (o.r + 6) * 2, o.label || '');
    // the face text auto-shrinks to the clear disc inside the number ring, so
    // report the size it lands on and let the caller decide if it is legible
    const numSize = Math.max(T.tick, o.r * 0.19);
    const rNum = o.r - 12 - numSize * 0.75;
    const nMaj = o.majors === undefined ? 5 : o.majors;
    let widest = 0;
    if (o.numbers !== false) {
      for (let j = 0; j <= nMaj; j++) {
        const v = o.min + (o.max - o.min) * (j / nMaj);
        widest = Math.max(widest, (o.fmtTick ? o.fmtTick(v) : G.fmt(v, o.dec || 0)).length);
      }
    }
    const inner = Math.max(rNum - widest * numSize * 0.3 - numSize * 0.35, o.r * 0.24);
    const chord = (yy) => 1.72 * Math.sqrt(Math.max(inner * inner - yy * yy, 1));
    REC[REC.length - 1].face = [
      [o.label, Math.max(T.capMin, Math.min(o.r * 0.21, chord(-inner * 0.46) / (0.55 * (o.label || ' ').length)))],
      [o.unit, Math.max(T.unit * 0.92, Math.min(o.r * 0.155, chord(inner * 0.52) / (0.6 * (o.unit || ' ').length)))]
    ].filter((x) => x[0]);
  },
  vmeter(c, o) {
    push('vmeter', o.x, o.y, o.w, o.h, o.label || '');
    if (o.label) G.engrave(null, o.label, o.x + o.w / 2, o.y + o.h + 9, T.cap);
  },
  logmeter(c, o) {
    push('logmeter', o.x, o.y, o.w, o.h, o.label || '');
    if (o.label) G.engrave(null, o.label, o.x + o.w / 2, o.y - 9, T.cap);
  },
  digital(c, o) {
    push('digital', o.x, o.y, o.w, o.h, o.label || o.text);
    if (o.label) G.engrave(null, o.label, o.x + o.w / 2, o.y - 9, T.cap);
  },
  lamp(c, o) {
    const r = (o.r || 7) + 2.5;
    push('lamp', o.x - r, o.y - r, r * 2, r * 2, o.label || '');
    if (o.label) G.engrave(null, o.label, o.x, o.y + (o.r || 7) + 9, T.unit);
  },
  toggle(c, o) {
    const w = o.w || 26, h = o.h || 40;
    push('toggle', o.x - w / 2, o.y - h / 2, w, h, o.label || '');
    if (o.label) G.engrave(null, o.label, o.x, o.y - h / 2 - 10, T.cap);
    if (o.showState !== false) G.mono(null, o.states[o.index], o.x, o.y + h / 2 + 9, T.state, 'center');
  },
  rotary(c, o) {
    const r = o.r || 15;
    push('rotary', o.x - r - 3, o.y - r - 3, (r + 3) * 2, (r + 3) * 2, o.label || '');
    const n = o.states.length, A0 = Math.PI * 0.75, A1 = Math.PI * 2.25;
    for (let i = 0; i < n; i++) {
      const a = A0 + ((A1 - A0) * i) / Math.max(n - 1, 1);
      const ca = Math.cos(a), sa = Math.sin(a);
      G.mono(null, o.states[i], o.x + ca * (r + 13), o.y + sa * (r + 13) + sa * 3, T.legend,
        ca < -0.3 ? 'right' : ca > 0.3 ? 'left' : 'center');
    }
    if (o.label) G.engrave(null, o.label, o.x, o.y - r - 29, T.cap);
  },
  button(c, o) {
    const w = o.w || 46, h = o.h || 24;
    push('button', o.x - w / 2, o.y - h / 2, w, h, o.label || o.text);
    if (o.label) G.engrave(null, o.label, o.x, o.y - h / 2 - 9, T.cap);
  },
  guarded(c, o) {
    const w = o.w || 74, h = o.h || 52;
    push('guarded', o.x - w / 2, o.y - h / 2, w, h, o.label || '');
    G.engrave(null, o.label, o.x, o.y - h / 2 - 10, T.cap);
    G.mono(null, o.armed ? 'ARMED' : 'COVER', o.x, o.y + h / 2 + 9, T.unit, 'center');
  },
  trend(c, o) { push('trend', o.x, o.y, o.w, o.h, o.label || ''); }
};

// boards.js captures DH.G at load, so it must not have been required yet
function load(DH) {
  if (!DH.Boards) {
    DH.G = G;
    loadScript('ui', 'boards.js');
    loadScript('ui', 'tutor.js');
  }
  return DH.Boards;
}

// every footprint on one board, in panorama coordinates
function measure(board, p) {
  REC = [];
  // room.js stencils the board name across the top of the panel
  G.engrave(null, require('./harness.js').L('b.' + board.name), (board.x0 + board.x1) / 2, 250 + 14, 13);
  board.draw(null, p);
  for (const ct of board.ctrls) ct.draw.call(ct, null, p);
  return REC.slice();
}

function overlap(a, b) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return x > 0 && y > 0 ? Math.min(x, y) : 0;
}

const where = (r) => r.kind + ' ' + r.note + ' at ' + Math.round(r.x) + ',' + Math.round(r.y);

module.exports = { load, measure, overlap, where, T };
