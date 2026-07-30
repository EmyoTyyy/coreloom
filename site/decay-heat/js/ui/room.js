(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const G = DH.G;

  const PW = 3840, PH = 1080;
  const TOP = 250, BOT = 1010;
  const ANN_H = 140;
  const HUD_H = 34;

  // Where the camera sits. VIEW_W is how much panorama the viewport spans on a
  // roomy window; FILL caps how much of the free height the console may eat on a
  // short one. Whichever puts the camera further back wins, so the console never
  // crowds the frame and there is always wall above it and desk below.
  const VIEW_W = 1880;
  const FILL = 0.76;
  const ABOVE = 0.44;
  const VIEW_W_MAX = 1960;

  const R = {
    canvas: null, ctx: null, off: null, offCtx: null,
    w: 0, h: 0, dpr: 1, scale: 1, visW: VIEW_W, visH: PH, yTop: 0,
    pan: 1140 - VIEW_W / 2, panVel: 0, keyPan: 0, mouseEdge: 0,
    mx: -1, my: -1, hover: null, held: null,
    flashlight: false, flashX: 0, flashY: 0, torchLevel: 1,
    tex: null, art: {}, ackRect: null, shake: 0,
    focus: null, point: null,
    panGoal: null, panDone: null
  };

  function init(canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    R.off = document.createElement('canvas');
    R.offCtx = R.off.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    R.tex = makeNoise(256);
  }

  function resize() {
    R.dpr = Math.min(window.devicePixelRatio || 1, 2);
    R.w = window.innerWidth;
    R.h = window.innerHeight;
    R.canvas.width = Math.round(R.w * R.dpr);
    R.canvas.height = Math.round(R.h * R.dpr);
    R.off.width = R.canvas.width;
    R.off.height = R.canvas.height;
    const avail = Math.max(R.h - ANN_H - HUD_H, 180);
    const deck = BOT - TOP;
    let sc = Math.min(R.w / VIEW_W, (avail * FILL) / deck);
    if (R.w / sc > VIEW_W_MAX) sc = R.w / VIEW_W_MAX;
    R.scale = sc;
    R.visW = R.w / sc;
    R.visH = R.h / sc;
    const slack = Math.max(avail - deck * sc, 0);
    R.yTop = TOP - (ANN_H + slack * ABOVE) / sc;
    R.pan = clampPan(R.pan);
  }

  const clampPan = (v) => Math.min(Math.max(v, 0), PW - R.visW);

  function makeNoise(n) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d');
    const d = x.createImageData(n, n);
    let s = 1234567;
    for (let i = 0; i < n * n; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const v = 118 + ((s >> 16) & 63);
      d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
      d.data[i * 4 + 3] = 22;
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  // camera x for a layer with the given parallax factor
  function camFor(f) {
    const centre = R.pan + R.visW / 2;
    return centre * f + (PW / 2) * (1 - f);
  }

  function layer(c, f) {
    c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    c.scale(R.scale, R.scale);
    c.translate(-camFor(f) + R.visW / 2, -R.yTop);
  }

  function toPano(sx, sy, f) {
    const x = sx / R.scale + camFor(f === undefined ? 1 : f) - R.visW / 2;
    const y = sy / R.scale + R.yTop;
    return [x, y];
  }

  // ---- room shell --------------------------------------------------------
  function drawWall(c) {
    const P = G.pal();
    const g = c.createLinearGradient(0, 0, 0, PH);
    g.addColorStop(0, P.ceiling);
    g.addColorStop(0.22, P.wall);
    g.addColorStop(1, P.wallLo);
    c.fillStyle = g;
    c.fillRect(-400, -200, PW + 800, PH + 400);

    // ceiling plane, so backing the camera off shows a room rather than a flat band
    const cg = c.createLinearGradient(0, -500, 0, 170);
    cg.addColorStop(0, P.wallLo);
    cg.addColorStop(1, P.ceiling);
    c.fillStyle = cg;
    c.fillRect(-400, -500, PW + 800, 670);
    c.strokeStyle = 'rgba(0,0,0,0.28)';
    c.lineWidth = 2;
    for (let x = -200; x < PW + 200; x += 235) {
      c.beginPath(); c.moveTo(x, -500); c.lineTo(x, 165); c.stroke();
    }
    for (const yy of [-330, -160, 10]) {
      c.beginPath(); c.moveTo(-400, yy); c.lineTo(PW + 400, yy); c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(-400, 158, PW + 800, 10);

    c.fillStyle = 'rgba(0,0,0,0.30)';
    for (let x = -200; x < PW + 200; x += 320) c.fillRect(x, 168, 3, PH + 400);
    for (let x = -200; x < PW + 200; x += 640) {
      const gg = c.createLinearGradient(x, 0, x + 300, 0);
      gg.addColorStop(0, 'rgba(255,255,255,0.035)');
      gg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gg;
      c.fillRect(x, 0, 300, 240);
    }
    for (let x = 120; x < PW; x += 470) {
      const gg = c.createRadialGradient(x, 60, 8, x, 60, 260);
      gg.addColorStop(0, 'rgba(255,248,225,0.34)');
      gg.addColorStop(1, 'rgba(255,248,225,0)');
      c.fillStyle = gg;
      c.fillRect(x - 270, -80, 540, 380);
      c.fillStyle = 'rgba(246,240,220,0.60)';
      c.fillRect(x - 92, 44, 184, 13);
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(x - 98, 38, 196, 5);
    }
  }

  function drawConsole(c, p, t) {
    const boards = DH.Boards.boards();

    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(-40, TOP + 8, PW + 80, BOT - TOP + 40);

    for (const b of boards) {
      G.panelSection(c, b.x0, TOP, b.x1 - b.x0, BOT - TOP);
      if (R.art.panel) {
        c.save(); c.globalAlpha = 0.5; c.globalCompositeOperation = 'multiply';
        c.drawImage(R.art.panel, b.x0, TOP, b.x1 - b.x0, BOT - TOP);
        c.restore();
      }
      G.screws(c, b.x0 + 6, TOP + 6, b.x1 - b.x0 - 12, BOT - TOP - 12, 4);
      G.engrave(c, DH.L('b.' + b.name), (b.x0 + b.x1) / 2, TOP + 14, 13, 'center', 'rgba(30,30,26,0.75)');
    }

    const lip = DH.Boards.LIP;
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(-40, lip, PW + 80, 4);
    const bg = c.createLinearGradient(0, lip + 4, 0, BOT);
    bg.addColorStop(0, 'rgba(255,255,255,0.06)');
    bg.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = bg;
    c.fillRect(-40, lip + 4, PW + 80, BOT - lip - 4);

    for (const b of boards) {
      b.draw(c, p);
      for (const ct of b.ctrls) ct.draw(c, p);
    }
    for (const b of boards) if (b.x0 > 0) G.seam(c, b.x0, TOP, BOT);
    G.seam(c, 0, TOP, BOT);
    G.seam(c, PW, TOP, BOT);

    if (R.hover) {
      const ct = R.hover;
      c.save();
      c.globalAlpha = 0.55;
      G.rr(c, ct.x - 3, ct.y - 3, ct.w + 6, ct.h + 6, 4);
      c.strokeStyle = G.pal().amber; c.lineWidth = 1.6; c.stroke();
      c.restore();
    }

    // what the walkthrough is talking about
    if (R.focus) {
      const f = R.focus, k = 0.5 + 0.5 * Math.sin(t * 4.2);
      c.save();
      c.globalAlpha = 0.4 + 0.55 * k;
      G.rr(c, f.x - 9, f.y - 9, f.w + 18, f.h + 18, 7);
      c.strokeStyle = G.pal().amber; c.lineWidth = 2.4 + 2 * k; c.stroke();
      c.restore();
    }
  }

  const DESK_F = 1.15;

  // ---- lighting ----------------------------------------------------------
  function lightingState(p) {
    if (!p) return 'normal';
    const acDead = p.elec.busA === 'dead' && p.elec.busB === 'dead';
    if (acDead && p.elec.battV < 108) return 'blackout';
    if (acDead) return 'emergency';
    if (!p.elec.offsite) return 'emergency';
    return 'normal';
  }

  function applyLighting(c, p, t) {
    const P = G.pal();
    const st = lightingState(p);
    const w = R.w, h = R.h;
    c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);

    if (st === 'emergency') {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = P.emerg;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(10,6,2,0.42)';
      c.fillRect(0, 0, w, h);
    } else if (st === 'blackout') {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = P.metalLo;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(2,3,5,0.86)';
      c.fillRect(0, 0, w, h);
    }

    if (R.flashlight && R.torchLevel > 0.02) {
      const rad = 260 * R.scale * (0.72 + 0.28 * R.torchLevel);
      const g = c.createRadialGradient(R.flashX, R.flashY, 8, R.flashX, R.flashY, rad);
      const a = 0.85 * R.torchLevel;
      g.addColorStop(0, 'rgba(255,247,220,' + a + ')');
      g.addColorStop(0.45, 'rgba(255,240,200,' + a * 0.42 + ')');
      g.addColorStop(1, 'rgba(255,235,190,0)');
      if (st === 'normal') {
        // A torch in a lit room does nearly nothing, and nearly nothing is not
        // the same as nothing: a soft warm patch and a small hot spot sliding
        // over the enamel is how you notice you left it switched on.
        const sp = c.createRadialGradient(R.flashX, R.flashY, 2, R.flashX, R.flashY, rad * 0.34);
        sp.addColorStop(0, 'rgba(255,250,232,0.30)');
        sp.addColorStop(1, 'rgba(255,246,220,0)');
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.13 * R.torchLevel;
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.globalAlpha = 0.5 * R.torchLevel;
        c.fillStyle = sp;
        c.fillRect(0, 0, w, h);
        c.globalAlpha = 1;
      } else {
        c.globalCompositeOperation = 'soft-light';
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.30 * R.torchLevel;
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        c.globalAlpha = 1;
      }
    }
    c.globalCompositeOperation = 'source-over';

    const v = c.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.28, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.62)');
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);

    c.globalAlpha = 0.5;
    const n = R.tex;
    for (let x = 0; x < w; x += 256) for (let y = 0; y < h; y += 256) c.drawImage(n, x, y);
    c.globalAlpha = 1;
  }

  // ---- lens ---------------------------------------------------------------
  // Each strip is 1:1 horizontally and squashed vertically, so the only thing
  // that softens type is that vertical resample — worst at the frame edges, where
  // the curve deviates most, and nil down the middle. BOW is therefore a direct
  // trade of barrel against legibility; 0.042 bends visibly and costs about four
  // percent. Snapping both edges of every strip to whole device pixels keeps the
  // seams from landing mid-glyph.
  const BOW = 0.042;
  const STRIPS = 48;

  function blitCurved(dst, src) {
    const w = R.canvas.width, h = R.canvas.height;
    dst.setTransform(1, 0, 0, 1, 0, 0);
    dst.clearRect(0, 0, w, h);
    for (let i = 0; i < STRIPS; i++) {
      const x0 = Math.round((w * i) / STRIPS);
      const x1 = Math.round((w * (i + 1)) / STRIPS);
      const u = (i + 0.5) / STRIPS - 0.5;
      const dh = Math.round(h * (1 - BOW * (u * u * 4)));
      const dy = Math.round((h - dh) / 2);
      dst.drawImage(src, x0, 0, x1 - x0, h, x0, dy, x1 - x0, dh);
    }
  }

  // ---- main render --------------------------------------------------------
  function render(p, t) {
    const c = R.offCtx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, R.off.width, R.off.height);
    c.fillStyle = G.pal().wallLo;
    c.fillRect(0, 0, R.off.width, R.off.height);

    if (R.shake > 0.001) {
      c.save();
      c.translate((Math.random() - 0.5) * R.shake * 10, (Math.random() - 0.5) * R.shake * 10);
    }

    layer(c, 0.85); drawWall(c);
    layer(c, 1.0); drawConsole(c, p, t);
    layer(c, DESK_F); DH.Desk.draw(c, p, t);
    if (R.shake > 0.001) c.restore();

    blitCurved(R.ctx, R.off);
    applyLighting(R.ctx, p, t);

    R.ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    R.ackRect = DH.Ann.draw(R.ctx, p, R.w, t);
    drawGuide(R.ctx, t);
    drawTip(R.ctx);
    drawCursor(R.ctx);
  }

  // an arrow at the screen edge when the walkthrough is pointing at a board you
  // are not looking at
  function drawGuide(c, t) {
    if (R.point === null || R.point === undefined) return;
    // only when the target is genuinely off frame — an arrow toward something
    // already in view just looks broken
    const margin = R.visW * 0.05;
    if (R.point > R.pan - margin && R.point < R.pan + R.visW + margin) return;
    const dir = R.point <= R.pan ? -1 : 1;
    const x = dir < 0 ? 42 : R.w - 42;
    const y = R.h * 0.5;
    const k = 0.5 + 0.5 * Math.sin(t * 5);
    c.save();
    c.globalAlpha = 0.55 + 0.45 * k;
    c.translate(x + dir * k * 7, y);
    c.scale(dir, 1);
    c.beginPath();
    c.moveTo(16, 0); c.lineTo(-8, -22); c.lineTo(-8, -8); c.lineTo(-26, -8);
    c.lineTo(-26, 8); c.lineTo(-8, 8); c.lineTo(-8, 22);
    c.closePath();
    c.fillStyle = G.pal().amber;
    c.fill();
    c.restore();
  }

  function drawTip(c) {
    if (!R.hover || !R.hover.tip) return;
    const P = G.pal();
    const s = R.hover.tip;
    c.font = '12px ' + (DH.UI_MONO || 'monospace');
    const w = c.measureText(s).width + 18;
    const h = 24;
    let x = R.mx + 16, y = R.my + 18;
    if (x + w > R.w - 8) x = R.mx - w - 16;
    if (y + h > R.h - 44) y = R.my - h - 12;
    G.rr(c, x, y, w, h, 3);
    c.fillStyle = 'rgba(10,12,14,0.94)';
    c.fill();
    c.strokeStyle = P.amber; c.lineWidth = 1; c.stroke();
    c.fillStyle = P.face;
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(s, x + 9, y + h / 2);
  }

  function drawCursor(c) {
    if (R.mx < 0) return;
    const on = !!R.hover;
    c.save();
    c.strokeStyle = on ? G.pal().amber : 'rgba(220,214,198,0.55)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(R.mx, R.my, on ? 9 : 5, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(R.mx - 13, R.my); c.lineTo(R.mx - 5, R.my);
    c.moveTo(R.mx + 5, R.my); c.lineTo(R.mx + 13, R.my);
    c.stroke();
    c.restore();
  }

  // ---- input ---------------------------------------------------------------
  // The desk is nearer than the console and drawn over it, so it gets first
  // refusal on a click — and it is hit tested in its own parallax, or the object
  // you are pointing at is not the one under the cursor.
  function hitTest(p) {
    if (R.mx < 0) return null;
    const [dx, dy] = toPano(R.mx, R.my, DESK_F);
    const it = DH.Desk.hit(dx, dy);
    if (it) return it;
    const [px, py] = toPano(R.mx, R.my, 1);
    for (const b of DH.Boards.boards()) {
      if (px < b.x0 - 20 || px > b.x1 + 20) continue;
      for (const ct of b.ctrls) {
        if (px >= ct.x && px <= ct.x + ct.w && py >= ct.y && py <= ct.y + ct.h) return ct;
      }
    }
    return null;
  }

  // A scripted head turn, for the few things worth looking at before you do them.
  // Your own input takes it back the moment you touch a key.
  function panTo(x, done) {
    R.panGoal = clampPan(x);
    R.panDone = done || null;
  }

  function updatePan(dt) {
    if (R.panGoal !== null && R.panGoal !== undefined) {
      if (R.keyPan || R.mouseEdge) { R.panGoal = null; R.panDone = null; }
      else {
        const d = R.panGoal - R.pan;
        if (Math.abs(d) < 6) {
          R.pan = R.panGoal;
          R.panVel = 0;
          const f = R.panDone;
          R.panGoal = null; R.panDone = null;
          if (f) f();
        } else {
          R.panVel += (d * 3.2 - R.panVel) * Math.min(1, dt * 5);
          R.pan = clampPan(R.pan + R.panVel * dt);
        }
        return;
      }
    }
    let a = 0;
    if (R.keyPan) a = R.keyPan;
    else if (R.mouseEdge) a = R.mouseEdge;
    const target = a * 900;
    R.panVel += (target - R.panVel) * Math.min(1, dt * 3.4);
    if (!a) R.panVel *= Math.exp(-dt * 4.5);
    R.pan = clampPan(R.pan + R.panVel * dt);
    if (R.pan <= 0 || R.pan >= PW - R.visW) R.panVel *= 0.4;
  }

  function onMove(e) {
    R.mx = e.clientX;
    R.my = e.clientY;
    R.flashX = R.mx * R.dpr;
    R.flashY = R.my * R.dpr;
    const edge = R.w * 0.20;
    if (R.mx < edge) R.mouseEdge = -Math.pow(1 - R.mx / edge, 1.6);
    else if (R.mx > R.w - edge) R.mouseEdge = Math.pow(1 - (R.w - R.mx) / edge, 1.6);
    else R.mouseEdge = 0;
  }

  function bindPointer(canvas, p_get) {
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', () => { R.mouseEdge = 0; R.mx = -1; });
    canvas.addEventListener('mousedown', (e) => {
      const p = p_get();
      if (!p) return;
      if (R.ackRect && R.mx >= R.ackRect.x && R.mx <= R.ackRect.x + R.ackRect.w &&
        R.my >= R.ackRect.y && R.my <= R.ackRect.y + R.ackRect.h) {
        DH.Plant.act(p, 'ack');
        DH.Audio.stopBuzzer();
        return;
      }
      const ct = hitTest(p);
      if (!ct) return;
      if (ct.deskItem) {
        DH.Desk.activate(ct);
        if (ct.key !== 'f') DH.Audio.click();   // the torch makes its own noise
        e.preventDefault();
        return;
      }
      R.held = ct;
      const [px, py] = toPano(R.mx, R.my, 1);
      if (ct.down) ct.down(p, px, py, ct);
      else if (ct.click) ct.click.call(ct, p);
      DH.Audio.click();
      e.preventDefault();
    });
    window.addEventListener('mouseup', () => {
      const p = p_get();
      if (R.held && R.held.up && p) R.held.up(p);
      R.held = null;
    });
  }

  // art is a skin: every one of these is optional and the room draws without them
  function loadArt(map) {
    for (const key in map) {
      const img = new Image();
      img.onload = (function (k, i) { return function () { R.art[k] = i; }; })(key, img);
      img.src = map[key];
    }
  }

  DH.Room = {
    R, init, loadArt, render, updatePan, hitTest, bindPointer, toPano, layer,
    lightingState, panTo, PW, PH, VIEW_W,
    setHover: (h) => { R.hover = h; },
    centre: () => R.pan + R.visW / 2
  };
})();
