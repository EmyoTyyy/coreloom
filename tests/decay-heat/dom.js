// A DOM small enough to boot the real index.html in node. Not a browser — it
// knows nothing about layout or paint — but it is enough to run every script
// the page loads, build the interface, and click things. Canvas work goes into
// a proxy that swallows it, since the geometry is checked in layout.js instead.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..', 'site', 'decay-heat');

const CTX = new Proxy({}, {
  get(t, k) {
    if (k === 'canvas') return { width: 1600, height: 900 };
    if (k === 'measureText') return (s) => ({ width: String(s).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
    // createImageData(w, h) takes two arguments, getImageData(x, y, w, h) four
    if (k === 'getImageData' || k === 'createImageData') {
      return function () {
        const a = arguments;
        const w = a.length > 2 ? a[2] : a[0];
        const h = a.length > 2 ? a[3] : a[1];
        return { data: new Uint8ClampedArray(4 * (w || 1) * (h || 1)) };
      };
    }
    if (k === 'createPattern') return () => null;
    return () => {};
  }
});

// A WebAudio graph that records automation instead of making sound. `value`
// settles on whatever a call aims the parameter at, so reading it answers "where
// is this heading" — which is the question a stuck sound is the wrong answer to.
function Param(v, all) {
  const p = {
    value: v === undefined ? 0 : v,
    events: [],
    setValueAtTime(x, t) { return p._at('set', x, t); },
    linearRampToValueAtTime(x, t) { return p._at('lin', x, t); },
    exponentialRampToValueAtTime(x, t) { return p._at('exp', x, t); },
    setTargetAtTime(x, t, tc) { return p._at('target', x, t, tc); },
    // The real thing drops queued events from t onward, and code that relies on
    // that is exactly what needs testing, so the log drops them too.
    cancelScheduledValues(t) { p.events = p.events.filter((e) => e[2] < t); return p; },
    _at(kind, x, t, tc) { p.events.push([kind, x, t, tc]); p.value = x; return p; }
  };
  if (all) all.push(p);
  return p;
}

function FakeAudioContext(all) {
  const P = (v) => Param(v, all);
  const node = (extra) => Object.assign({ connect() {}, disconnect() {} }, extra || {});
  this.sampleRate = 48000;
  this.currentTime = 0;
  this.destination = node();
  this.state = 'running';
  this.createGain = () => node({ gain: P(1) });
  this.createOscillator = () => node({ type: 'sine', frequency: P(440), detune: P(0), start() {}, stop() {} });
  this.createBiquadFilter = () => node({ type: 'lowpass', frequency: P(350), Q: P(1), gain: P(0) });
  this.createBufferSource = () => node({ buffer: null, playbackRate: P(1), loop: false, start() {}, stop() {} });
  this.createBuffer = (ch, n, sr) => ({
    numberOfChannels: ch, length: n, sampleRate: sr || 48000, duration: n / (sr || 48000),
    getChannelData: () => new Float32Array(n)
  });
  this.decodeAudioData = (b, ok, err) => { if (err) err(new Error('no decoder in tests')); };
  this.resume = () => Promise.resolve();
  this.close = () => Promise.resolve();
}

function El(tag) {
  const e = {
    tag: String(tag).toLowerCase(),
    children: [],
    attrs: {},
    style: {},
    dataset: {},
    listeners: {},
    parent: null,
    _text: '',
    _html: '',
    _cn: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => x && this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, v) { const on = v === undefined ? !this._s.has(c) : !!v; if (on) this._s.add(c); else this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); }
    },
    get className() { return this._cn; },
    set className(v) {
      this._cn = String(v);
      this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean));
    },
    // reflected attributes, same as the real thing
    get id() { return this.attrs.id || ''; },
    set id(v) { this.attrs.id = String(v); },
    get lang() { return this.attrs.lang || ''; },
    set lang(v) { this.attrs.lang = String(v); },
    get textContent() { return this._text || this.children.map((c) => c.textContent).join(''); },
    set textContent(v) { this._text = String(v); this.children = []; },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; this._text = ''; parseInto(this, String(v)); },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    remove() { if (this.parent) this.parent.removeChild(this); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); },
    getContext: () => CTX,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 1600, bottom: 900, width: 1600, height: 900 }),
    querySelector(s) { return find(this, s)[0] || null; },
    querySelectorAll(s) { return find(this, s); },
    focus() {}, blur() {}, scrollTo() {}, scrollIntoView() {},
    click() { fire(this, 'click'); }
  };
  return e;
}

const VOID = ['br', 'img', 'input', 'hr', 'meta', 'link', 'source'];

function parseInto(parent, src) {
  const re = /<(\/?)([a-z0-9]+)([^>]*?)(\/?)>|([^<]+)/gi;
  const stack = [parent];
  let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { if (m[5].trim()) top._text += m[5]; continue; }
    const tag = m[2].toLowerCase();
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    const e = El(tag);
    for (const a of (m[3] || '').matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) {
      e.attrs[a[1]] = a[2];
      if (a[1] === 'class') e.className = a[2];
      if (a[1] === 'id') e.id = a[2];
    }
    top.appendChild(e);
    if (!m[4] && VOID.indexOf(tag) < 0) stack.push(e);
  }
}

function matchesOne(e, sel) {
  return sel.split(/(?=[.#])/).every((p) => {
    if (p[0] === '#') return e.id === p.slice(1);
    if (p[0] === '.') return e.classList.contains(p.slice(1));
    return e.tag === p.toLowerCase();
  });
}

function walk(n, f) { for (const c of n.children) { f(c); walk(c, f); } }

// descendant combinator only — that is all the game's selectors use
function find(root, sel) {
  const out = [];
  for (const part of String(sel).split(',')) {
    let cur = [root];
    for (const step of part.trim().split(/\s+/)) {
      const next = [];
      for (const n of cur) walk(n, (x) => { if (matchesOne(x, step) && next.indexOf(x) < 0) next.push(x); });
      cur = next;
    }
    for (const x of cur) if (out.indexOf(x) < 0) out.push(x);
  }
  return out;
}

function fire(el, type, ev) {
  const e = Object.assign({ type, target: el, preventDefault() {}, stopPropagation() {} }, ev || {});
  for (const f of (el.listeners[type] || []).slice()) f(e);
  return e;
}

// Boots index.html the way a browser would: parse the markup, then run every
// <script src> it lists, in order, against one shared global.
function boot(opts) {
  const o = opts || {};
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  const docEl = El('html');
  const body = El('body');
  docEl.appendChild(body);
  parseInto(body, html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<head[\s\S]*?<\/head>/i, ''));

  const saved = {};
  if (o.saved) saved['decayheat.v1'] = JSON.stringify(o.saved);

  const document = {
    documentElement: docEl,
    body,
    readyState: 'complete',
    createElement: El,
    createElementNS: (ns, t) => El(t),
    querySelector: (s) => find(body, s)[0] || null,
    querySelectorAll: (s) => find(body, s),
    getElementById: (id) => find(body, '#' + id)[0] || null,
    addEventListener() {},
    removeEventListener() {}
  };

  const keys = {};
  const intervals = new Set();
  const params = [];
  let timerId = 0, raf = null, clock = 0, audio = null;
  function AC() { audio = this; FakeAudioContext.call(this, params); }
  const sandbox = {
    document,
    console: { log() {}, warn() {}, error() {} },
    navigator: { language: o.language || 'en-US' },
    localStorage: {
      getItem: (k) => (k in saved ? saved[k] : null),
      setItem: (k, v) => { saved[k] = String(v); },
      removeItem: (k) => { delete saved[k]; }
    },
    performance: { now: () => clock },
    // Held rather than run, so a test drives the loop itself and knows exactly
    // how many frames went by. main.js re-arms at the top of every frame.
    requestAnimationFrame: (f) => { raf = f; return ++timerId; },
    cancelAnimationFrame() { raf = null; },
    // Real timer ids are truthy, and code that guards on one must see that.
    // Nothing fires: these record that a timer was asked for, not run.
    setTimeout: () => ++timerId,
    clearTimeout() {},
    setInterval: () => { intervals.add(++timerId); return timerId; },
    clearInterval: (h) => { intervals.delete(h); },
    getComputedStyle: () => ({ getPropertyValue: () => '#ffa42b' }),
    Image: function Img() { this.addEventListener = () => {}; this.width = 1600; this.height = 900; },
    Math, Date, JSON, Set, Map, Array, Object, String, Number, Boolean, Error, Promise
  };
  sandbox.window = {
    document,
    addEventListener: (t, f) => { (keys[t] = keys[t] || []).push(f); },
    removeEventListener() {},
    devicePixelRatio: 1,
    innerWidth: 1600,
    innerHeight: 900,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    AudioContext: AC
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  if (!scripts.length) throw new Error('index.html lists no scripts');
  for (const s of scripts) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });
  }

  return {
    DH: sandbox.DH,
    document,
    scripts,
    $: (s) => document.querySelector(s),
    $$: (s) => document.querySelectorAll(s),
    fire,
    key: (k) => { for (const f of keys.keydown || []) f({ key: k, preventDefault() {} }); },
    saved: () => JSON.parse(saved['decayheat.v1'] || 'null'),
    timers: () => intervals.size,
    // one animation frame, `ms` of wall clock later
    frame: (ms) => { clock += ms === undefined ? 16 : ms; const f = raf; raf = null; if (f) f(clock); },
    // Automation queued to be audible more than `horizon` from now. The horizon
    // is what separates a sound finishing from a sound continuing: every one-shot
    // in the game decays inside half a second, so its tail is not a leak, while
    // the klaxon queues bursts out to five seconds and a bed holds indefinitely.
    pending: (horizon) => {
      if (!audio) return [];
      const t = audio.currentTime + (horizon === undefined ? 1 : horizon);
      const out = [];
      for (const pm of params) {
        for (const e of pm.events) if (e[2] > t && Math.abs(e[1]) > 0.001) out.push(e);
      }
      return out;
    }
  };
}

module.exports = { boot, ROOT };
