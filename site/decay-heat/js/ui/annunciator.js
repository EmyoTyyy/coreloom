(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const G = DH.G;

  const COLS = 9;
  const BOARD_X = [380, 1140, 1900, 2660, 3440];

  // Tile legends are the most urgent text in the room and the only text the lens
  // never touches, since the annunciator is drawn in screen space over the blit.
  // SIZE is therefore a real pixel size, not a panorama unit.
  const SIZE = 10.5;
  const LH = 11.5;
  const LINES = 2;

  function layout(w) {
    const pw = Math.min(w * 0.94, 1400);
    const n = DH.Plant.ALARMS.length;
    const rows = Math.ceil(n / COLS);
    const tw = (pw - 10) / COLS;
    const th = 29;
    return { pw: pw, rows: rows, tw: tw, th: th, ph: rows * th + 12 };
  }

  function wrap(c, s, maxw) {
    const words = s.split(' ');
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (c.measureText(t).width > maxw && cur) { lines.push(cur); cur = wd; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // A legend that will not fit the tile gives up size rather than words. Losing
  // the end of an alarm is worse than reading a small one, and which legends run
  // long depends on the language and the window, so nothing static can decide it.
  function fitLines(c, s, maxw) {
    let best = null;
    for (let sz = SIZE; sz > SIZE - 3; sz -= 0.5) {
      c.font = sz + 'px ' + (DH.UI_FONT || 'Helvetica, Arial, sans-serif');
      const ls = wrap(c, s, maxw);
      if (!best) best = { lines: ls, size: sz };
      if (ls.length <= LINES) return { lines: ls, size: sz };
    }
    return best;
  }

  function draw(c, p, w, t) {
    const P = G.pal();
    const L = layout(w);
    const x0 = (w - L.pw) / 2;
    const y0 = 0;

    c.save();
    G.rr(c, x0, y0 - 14, L.pw, L.ph + 14, 4);
    const bg = c.createLinearGradient(0, y0, 0, y0 + L.ph);
    bg.addColorStop(0, P.annHi);
    bg.addColorStop(1, P.annLo);
    c.fillStyle = bg; c.fill();
    c.strokeStyle = P.annEdge; c.lineWidth = 2; c.stroke();

    const flash = Math.floor(t * 2.6) % 2 === 0;
    const A = DH.Plant.ALARMS;
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      const st = p.alarms[a.id].st;
      const cx = x0 + 5 + (i % COLS) * L.tw;
      const cy = y0 + 6 + Math.floor(i / COLS) * L.th;
      const tw = L.tw - 3, th = L.th - 3;

      let fill = P.tileOff, ink = P.tileInkDim;
      if (st === 1 && flash) { fill = P.red; ink = P.btnInkLit; }
      else if (st === 1) { fill = P.tileLitDim; ink = P.face; }
      else if (st === 2) { fill = P.amber; ink = P.btnInkLit; }

      G.rr(c, cx, cy, tw, th, 2);
      c.fillStyle = fill; c.fill();
      if (st) {
        c.save(); c.shadowColor = fill; c.shadowBlur = 9; c.fill(); c.restore();
      }
      c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 1; c.stroke();

      c.fillStyle = ink;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const f = fitLines(c, a.t(), tw - 8);
      const lh = LH * (f.size / SIZE);
      const sy = cy + th / 2 - ((f.lines.length - 1) * lh) / 2;
      for (let k = 0; k < f.lines.length; k++) c.fillText(f.lines[k], cx + tw / 2, sy + k * lh);
    }

    const un = A.some((a) => p.alarms[a.id].st === 1);
    const aw = 112, ah = 21;
    const ax = x0 + L.pw - aw - 6, ay = y0 + L.ph - 2;
    G.rr(c, ax, ay, aw, ah, 2);
    c.fillStyle = un ? (flash ? P.amber : P.tileLitDim) : P.tileOff;
    c.fill();
    c.fillStyle = un ? P.btnInkLit : P.tileInkDim;
    c.font = '10px ' + (DH.UI_MONO || 'monospace');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(DH.L('ann.ack'), ax + aw / 2, ay + ah / 2);
    c.restore();
    return { x: ax, y: ay, w: aw, h: ah };
  }

  // which side of the current view has an unacknowledged alarm
  function chevrons(p, viewCx) {
    let left = false, right = false;
    for (const a of DH.Plant.ALARMS) {
      if (p.alarms[a.id].st !== 1) continue;
      const bx = BOARD_X[a.b];
      if (bx < viewCx - 300) left = true;
      else if (bx > viewCx + 300) right = true;
    }
    return { left: left, right: right };
  }

  DH.Ann = { draw, chevrons, layout };
})();
