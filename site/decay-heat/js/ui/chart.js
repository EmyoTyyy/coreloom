(function () {
  const DH = (globalThis.DH = globalThis.DH || {});

  const SPAN = 1800;
  const DTS = 2;
  const N = SPAN / DTS;

  const CH = [
    { id: 'pwr', name: () => DH.L('ch.pwr'), unit: '%', min: 0, max: 110, get: (p) => p.ind.power },
    { id: 'tavg', name: () => DH.L('ch.tavg'), unit: 'C', min: 280, max: 330, get: (p) => p.ind.tAvg },
    { id: 'prcs', name: () => DH.L('ch.prcs'), unit: 'MPa', min: 0, max: 18, get: (p) => p.ind.pPzr },
    { id: 'lvl', name: () => DH.L('ch.lvl'), unit: '%', min: 0, max: 100, get: (p) => p.ind.pzrLevel },
    { id: 'sub', name: () => DH.L('ch.sub'), unit: 'C', min: -40, max: 90, get: (p) => p.ind.subcool },
    { id: 'sg1', name: () => DH.L('ch.sg1'), unit: '%NR', min: 0, max: 100, get: (p) => p.ind.sgNr[0] },
    { id: 'sgp', name: () => DH.L('ch.sgp'), unit: 'MPa', min: 0, max: 10, get: (p) => p.ind.sgP[0] },
    { id: 'feed', name: () => DH.L('ch.feed'), unit: 'kg/s', min: 0, max: 2200, get: (p) => p.ind.wFeed.reduce((a, b) => a + b, 0) },
    { id: 'stm', name: () => DH.L('ch.stm'), unit: 'kg/s', min: 0, max: 2200, get: (p) => p.ind.wSteam.reduce((a, b) => a + b, 0) },
    { id: 'cet', name: () => DH.L('ch.cet'), unit: 'C', min: 250, max: 900, get: (p) => p.th.tClad },
    { id: 'cnmt', name: () => DH.L('ch.cnmt'), unit: 'MPa', min: 0.09, max: 0.5, get: (p) => p.ind.contP },
    { id: 'mwe', name: () => DH.L('ch.mwe'), unit: 'MWe', min: 0, max: 1300, get: (p) => p.ind.mwe },
    { id: 'rho', name: () => DH.L('ch.rho'), unit: 'pcm', min: -4000, max: 1000, get: (p) => p.rho.total },
    { id: 'xe', name: () => DH.L('ch.xe'), unit: 'pcm', min: -8000, max: 0, get: (p) => p.rho.xenon }
  ];

  const S = { el: null, cv: null, ctx: null, sel: ['pwr', 'tavg', 'prcs', 'sub'], data: {}, acc: 0, head: 0, count: 0 };

  function reset() {
    S.data = {};
    for (const c of CH) S.data[c.id] = new Float32Array(N);
    S.head = 0; S.count = 0; S.acc = 0;
  }

  function build(root) {
    S.el = root;
    root.innerHTML = '<h3>' + DH.L('chart.title') + '</h3>' +
      '<button class="close">CLOSE</button><canvas></canvas><div class="chans"></div>';
    S.cv = root.querySelector('canvas');
    S.ctx = S.cv.getContext('2d');
    root.querySelector('.close').addEventListener('click', () => toggle(false));
    const cw = root.querySelector('.chans');
    for (const c of CH) {
      const b = document.createElement('button');
      b.textContent = c.name();
      b.dataset.id = c.id;
      b.addEventListener('click', () => {
        const i = S.sel.indexOf(c.id);
        if (i >= 0) S.sel.splice(i, 1);
        else { if (S.sel.length >= 4) S.sel.shift(); S.sel.push(c.id); }
        paintButtons();
      });
      cw.appendChild(b);
    }
    reset();
    paintButtons();
  }

  function paintButtons() {
    const cs = getComputedStyle(document.documentElement);
    const cols = [1, 2, 3, 4].map((i) => cs.getPropertyValue('--dh-trace-' + i).trim());
    for (const b of S.el.querySelectorAll('.chans button')) {
      const i = S.sel.indexOf(b.dataset.id);
      b.classList.toggle('on', i >= 0);
      b.style.background = i >= 0 ? cols[i] : 'transparent';
      b.style.borderColor = i >= 0 ? cols[i] : '';
    }
  }

  function sample(p, dt) {
    S.acc += dt;
    while (S.acc >= DTS) {
      S.acc -= DTS;
      for (const c of CH) S.data[c.id][S.head] = c.get(p);
      S.head = (S.head + 1) % N;
      if (S.count < N) S.count++;
    }
  }

  function draw() {
    if (!S.el.classList.contains('open')) return;
    const cv = S.cv, c = S.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    c.fillStyle = cs.getPropertyValue('--dh-paper').trim();
    c.fillRect(0, 0, w, h);

    c.strokeStyle = 'rgba(180,60,50,0.16)';
    c.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (h * i) / 10;
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    }
    for (let i = 0; i <= 30; i++) {
      const x = (w * i) / 30;
      c.strokeStyle = i % 5 === 0 ? 'rgba(180,60,50,0.32)' : 'rgba(180,60,50,0.14)';
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }
    c.fillStyle = 'rgba(60,50,40,0.6)';
    c.font = '9px ' + (DH.UI_MONO || 'monospace');
    c.textAlign = 'center';
    for (let i = 0; i <= 6; i++) c.fillText('-' + (30 - i * 5) + ' min', (w * i * 5) / 30, h - 4);

    const cols = [1, 2, 3, 4].map((i) => cs.getPropertyValue('--dh-trace-' + i).trim());
    S.sel.forEach((id, k) => {
      const ch = CH.find((x) => x.id === id);
      if (!ch) return;
      const d = S.data[id];
      c.beginPath();
      let started = false;
      for (let i = 0; i < S.count; i++) {
        const idx = (S.head - S.count + i + N * 2) % N;
        const x = w - ((S.count - 1 - i) * w) / (N - 1);
        const v = Math.min(1, Math.max(0, (d[idx] - ch.min) / (ch.max - ch.min)));
        const y = h - 16 - v * (h - 26);
        if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
      }
      c.strokeStyle = cols[k];
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = cols[k];
      c.textAlign = 'left';
      const last = S.count ? d[(S.head - 1 + N) % N] : 0;
      c.fillText(ch.name + '  ' + last.toFixed(1) + ' ' + ch.unit, 8, 13 + k * 12);
      c.textAlign = 'right';
      c.fillText(String(ch.max), w - 4, 13 + k * 12);
    });
  }

  function toggle(v) {
    const on = v === undefined ? !S.el.classList.contains('open') : v;
    S.el.classList.toggle('open', on);
  }

  // Last n samples of one channel, normalised to its own span, oldest first —
  // what the recorder on the desk needs to draw the same trend this pane does.
  function series(id, n) {
    const ch = CH.find((c) => c.id === id);
    if (!ch || !S.count) return null;
    const k = Math.min(n, S.count);
    const out = [];
    for (let i = 0; i < k; i++) {
      const v = S.data[id][(S.head - k + i + N * 2) % N];
      out.push(isFinite(v) ? Math.min(1, Math.max(0, (v - ch.min) / (ch.max - ch.min))) : 0);
    }
    return out;
  }

  DH.Chart = { build, sample, draw, reset, toggle, series, CH, isOpen: () => S.el && S.el.classList.contains('open') };
})();
