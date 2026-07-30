(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const G = DH.G;
  const L = DH.L;

  const CAMS = [
    { id: 'CNMT', n: '01', loc: 'CNMT' },
    { id: 'TURB', n: '02', loc: 'TURB' },
    { id: 'AFW', n: '03', loc: 'AFW' },
    { id: 'DG', n: '04', loc: 'DG' },
    { id: 'SWGR', n: '05', loc: 'SWGR' },
    { id: 'SFP', n: '06', loc: 'SFP' }
  ];

  // Where each camera's annotations hang, as a fraction of the frame, measured
  // off the photographs in assets/. Every marker, plume and bracket comes from
  // here so it lands on the machine it is about instead of in mid-air. The
  // placeholder scene drawn when the art is missing uses the same points.
  const ANCHOR = {
    CNMT: { head: [0.49, 0.50], vent: [0.86, 0.44], op: [0.17, 0.86] },
    TURB: { rotor: [0.40, 0.56], op: [0.62, 0.88] },
    AFW: {
      pump: [[0.28, 0.56], [0.60, 0.66], [0.85, 0.56]],
      valve: [[0.35, 0.47], [0.53, 0.45], [0.68, 0.47], [0.85, 0.47]],
      op: [0.12, 0.82]
    },
    DG: { set: [[0.32, 0.58], [0.74, 0.53]], stack: [[0.33, 0.17], [0.71, 0.24]], op: [0.13, 0.86] },
    SWGR: { bus: [[0.26, 0.44], [0.75, 0.40]], op: [0.09, 0.74] },
    SFP: { pool: [0.45, 0.56], op: [0.07, 0.78] }
  };

  const M = { open: false, cam: 0, switchT: 0, roll: 0 };

  function open() { M.open = true; M.switchT = 0.5; }
  function close() { M.open = false; }
  function select(i) { if (i !== M.cam) { M.cam = (i + CAMS.length) % CAMS.length; M.switchT = 0.42; DH.Audio.camSwitch(); } }

  function rnd(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >> 8) / 8388608; };
  }

  // ---- annotations --------------------------------------------------------
  function bracket(c, x, y, r, col) {
    c.strokeStyle = col; c.lineWidth = 1.6;
    for (const s of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.beginPath();
      c.moveTo(x + s[0] * r, y + s[1] * r - s[1] * 5);
      c.lineTo(x + s[0] * r, y + s[1] * r);
      c.lineTo(x + s[0] * r - s[0] * 5, y + s[1] * r);
      c.stroke();
    }
  }

  // a bracket on the equipment and a chip above it, the way a camera system
  // labels what it is watching
  function tag(c, a, w, h, label, col, rad) {
    const P = G.pal();
    const x = a[0] * w, y = a[1] * h;
    const cw = 24 + label.length * 6.6, cy = y - (rad || 12) - 20;
    G.rr(c, x - cw / 2, cy - 9, cw, 18, 3);
    c.fillStyle = 'rgba(5,9,7,0.74)'; c.fill();
    c.strokeStyle = 'rgba(150,205,175,0.30)'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(x - cw / 2 + 11, cy, 4, 0, Math.PI * 2);
    if (col) {
      c.save(); c.shadowColor = col; c.shadowBlur = 9;
      c.fillStyle = col; c.fill(); c.restore();
    } else { c.fillStyle = 'rgba(64,70,66,0.95)'; c.fill(); }
    G.mono(c, label, x - cw / 2 + 20, cy + 0.5, 10.5, 'left', P.camInk);
    c.strokeStyle = 'rgba(150,205,175,0.30)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, cy + 9); c.lineTo(x, y - (rad || 12)); c.stroke();
    bracket(c, x, y, rad || 12, col || 'rgba(150,205,175,0.45)');
  }

  function plume(c, a, w, h, t, n, size, rise, col) {
    const x = a[0] * w, y = a[1] * h;
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const f = ((t * rise + i * 37) % 100) / 100;
      c.globalAlpha = 0.5 * (1 - f);
      c.beginPath();
      c.arc(x + Math.sin(f * 5 + i) * size * 0.8, y - f * h * 0.34, size * (0.5 + f * 1.6), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  function box(c, a, w, h, bw, bh) {
    const P = G.pal();
    const x = a[0] * w, y = a[1] * h;
    c.fillStyle = P.camSteel; c.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    c.fillStyle = P.camSteelLo; c.fillRect(x - bw / 2, y - bh / 2, bw, Math.min(10, bh * 0.2));
  }

  function scene(c, cam, p, w, h, t) {
    const P = G.pal();
    const A = ANCHOR[cam.id];
    const r = rnd(cam.n.charCodeAt(1) * 7919 + 13);
    c.save();
    c.beginPath(); c.rect(0, 0, w, h); c.clip();

    const art = DH.Room.R.art['cam' + cam.id];
    const bare = !art;
    if (art) c.drawImage(art, 0, 0, w, h);
    else {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, P.camFar); g.addColorStop(0.5, P.camMid); g.addColorStop(1, P.camNear);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.beginPath(); c.moveTo(0, h * 0.2); c.lineTo(w, h * 0.34); c.lineTo(w, h * 0.42); c.lineTo(0, h * 0.3); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = w * (0.05 + r() * 0.9);
        c.beginPath(); c.moveTo(x, h * 0.18); c.lineTo(x + (r() - 0.5) * 40, h); c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(0, h * 0.78, w, h * 0.22);
      for (let i = 0; i < 5; i++) {
        const x = w * r(), rr2 = 12 + r() * 26;
        c.fillStyle = 'rgba(200,200,205,0.06)';
        c.beginPath(); c.arc(x, h * (0.4 + r() * 0.4), rr2, 0, Math.PI * 2); c.fill();
      }
    }

    const th = p.th;
    const off = null;
    if (cam.id === 'CNMT') {
      if (bare) box(c, A.head, w, h, w * 0.34, h * 0.22);
      const hot = p.cont.t > 60;
      if (hot) {
        c.globalAlpha = Math.min(0.7, (p.cont.t - 60) / 70);
        for (let i = 0; i < 26; i++) {
          const x = (i * 97 + t * 30) % w;
          const y = h - ((t * 42 + i * 61) % h);
          c.fillStyle = 'rgba(235,235,240,0.5)';
          c.beginPath(); c.arc(x, y, 18 + (i % 5) * 9, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
      }
      const venting = th.wRelief > 0.5 || p.prt.burst;
      if (venting) plume(c, A.vent, w, h, t, 14, 13, 34, 'rgba(240,240,245,0.9)');
      const covered = p.th.coreCovered > 0.999;
      tag(c, A.head, w, h, covered ? L('cam.rxVessel') : L('cam.coreUncov'), covered ? P.green : P.red, 34);
      if (venting) tag(c, A.vent, w, h, L('cam.relief'), P.amber);
      status(c, w, h, [
        [L('cam.rcsPress'), G.fmt(th.p, 2) + ' MPa'],
        [L('cam.cnmtPress'), G.fmt(p.cont.p, 3) + ' MPa'],
        [L('cam.cnmtTemp'), G.fmt(p.cont.t, 0) + ' C'],
        [L('cam.radiation'), G.sci(p.rad.cont) + ' R/hr']
      ]);
    } else if (cam.id === 'TURB') {
      const spin = !p.sec.turbTripped && th.turbValve > 0.02;
      if (bare) {
        box(c, A.rotor, w, h, w * 0.6, h * 0.24);
        if (spin) {
          c.save();
          c.translate(A.rotor[0] * w, A.rotor[1] * h);
          c.rotate(t * 26);
          c.strokeStyle = 'rgba(255,255,255,0.20)'; c.lineWidth = 3;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * h * 0.1, Math.sin(a) * h * 0.1); c.stroke();
          }
          c.restore();
        }
      }
      tag(c, A.rotor, w, h, spin ? L('cam.turbOn') : L('cam.turbOff'), spin ? P.green : P.red, 30);
      status(c, w, h, [
        [L('cam.turbine'), p.sec.turbTripped ? L('cam.tripped') : L('cam.online')],
        [L('cam.load'), G.fmt(p.ind.mwe, 0) + ' MWe'],
        [L('cam.throttle'), G.fmt(th.turbValve * 100, 0) + ' %'],
        [L('cam.condVac'), G.fmt(p.sec.condVac * 100, 0) + ' %']
      ]);
    } else if (cam.id === 'AFW') {
      for (let k = 0; k < 3; k++) {
        const a = p.sec.afw[k];
        if (bare) box(c, A.pump[k], w, h, 84, 52);
        tag(c, A.pump[k], w, h, L(a.failed ? 'cam.pumpFault' : a.running ? 'cam.pumpRun' : 'cam.pumpStop', a.id),
          a.failed ? P.red : a.running ? P.green : off, 24);
      }
      // the discharge valves are the point of this camera: a pump running
      // against a shut valve looks exactly like a pump doing its job
      for (let k = 0; k < 4; k++) {
        const v = p.sec.afwValves[k];
        tag(c, A.valve[k], w, h, L(v ? 'cam.dvOpen' : 'cam.dvShut', k + 1), v ? P.green : P.red, 15);
      }
      status(c, w, h, [
        [L('cam.pumpsRunning'), String(p.sec.afw.filter((a) => a.running).length)],
        [L('cam.valvesOpen'), L('cam.ofFour', p.sec.afwValves.filter(Boolean).length)],
        [L('cam.totalFlow'), G.fmt(th.sg.reduce((s, x) => s + x.wAfw, 0), 1) + ' kg/s']
      ]);
    } else if (cam.id === 'DG') {
      for (let k = 0; k < 2; k++) {
        const d = p.elec.edg[k];
        if (bare) box(c, A.set[k], w, h, 150, 90);
        if (d.running) plume(c, A.stack[k], w, h, t + k * 3, 9, 10, 26, 'rgba(58,58,62,0.85)');
        tag(c, A.set[k], w, h, L(d.failed ? 'cam.edgLock' : d.running ? 'cam.edgRun' : 'cam.edgStop', k + 1),
          d.failed ? P.red : d.running ? P.green : off, 30);
      }
      status(c, w, h, [
        [L('g.edg', 1), L(p.elec.edg[0].failed ? 'cam.lockout' : p.elec.edg[0].running ? 'cam.running' : 'cam.stopped')],
        [L('g.edg', 2), L(p.elec.edg[1].failed ? 'cam.lockout' : p.elec.edg[1].running ? 'cam.running' : 'cam.stopped')]
      ]);
    } else if (cam.id === 'SWGR') {
      const buses = [['A', p.elec.busA], ['B', p.elec.busB]];
      for (let k = 0; k < 2; k++) {
        if (bare) box(c, A.bus[k], w, h, 140, 160);
        const st = buses[k][1];
        const stTxt = L(st === 'dead' ? 'cam.dead' : st === 'edg' ? 'cam.edgSrc' : 'cam.offsiteSrc');
        tag(c, A.bus[k], w, h, L('cam.busTag', buses[k][0], stTxt),
          st === 'dead' ? P.red : st === 'edg' ? P.amber : P.green, 38);
      }
      status(c, w, h, [
        [L('g.busLamp', 'A'), L(p.elec.busA === 'dead' ? 'cam.dead' : p.elec.busA === 'edg' ? 'cam.edgSrc' : 'cam.offsiteSrc')],
        [L('g.busLamp', 'B'), L(p.elec.busB === 'dead' ? 'cam.dead' : p.elec.busB === 'edg' ? 'cam.edgSrc' : 'cam.offsiteSrc')],
        [L('cam.batteryV'), G.fmt(p.elec.battV, 1) + ' V']
      ]);
    } else if (cam.id === 'SFP') {
      if (bare) {
        const lvl = h * 0.42;
        c.fillStyle = P.camWater; c.fillRect(0, lvl, w, h - lvl);
        c.strokeStyle = 'rgba(150,220,255,0.35)'; c.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          for (let x = 0; x < w; x += 12) c.lineTo(x, lvl + 8 + i * 22 + Math.sin(x / 40 + t * 1.6 + i) * 3);
          c.stroke();
        }
      }
      const cool = p.elec.busA !== 'dead' || p.elec.busB !== 'dead';
      tag(c, A.pool, w, h, L(cool ? 'cam.poolOk' : 'cam.poolLost'), cool ? P.green : P.amber, 40);
      status(c, w, h, [[L('cam.poolLevel'), L('cam.normal')], [L('cam.poolTemp'), '38 C'],
        [L('cam.cooling'), L(cool ? 'cam.inService' : 'cam.lost')]]);
    }

    if (p.aux.at === cam.loc && !p.aux.to) {
      const hh = h * 0.16, ox = A.op[0] * w, oy = A.op[1] * h;
      figure(c, ox, oy, hh, t);
      bracket(c, ox, oy - hh * 0.5, hh * 0.44, 'rgba(255,190,60,0.8)');
      G.mono(c, L('cam.auxOp'), ox, oy - hh * 1.12, 10.5, 'center', 'rgba(255,205,120,0.95)');
    }
    c.restore();
  }

  function figure(c, x, y, hh, t) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = 'rgba(235,230,215,0.75)';
    c.fillStyle = 'rgba(235,230,215,0.75)';
    c.lineWidth = Math.max(2, hh * 0.05);
    c.beginPath(); c.arc(0, -hh * 0.86, hh * 0.13, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(0, -hh * 0.72); c.lineTo(0, -hh * 0.3); c.stroke();
    const sw = Math.sin(t * 1.4) * hh * 0.08;
    c.beginPath(); c.moveTo(0, -hh * 0.3); c.lineTo(-hh * 0.16 + sw, 0); c.moveTo(0, -hh * 0.3); c.lineTo(hh * 0.16 + sw, 0); c.stroke();
    c.beginPath(); c.moveTo(0, -hh * 0.66); c.lineTo(-hh * 0.2, -hh * 0.38); c.moveTo(0, -hh * 0.66); c.lineTo(hh * 0.2, -hh * 0.4); c.stroke();
    c.fillStyle = 'rgba(255,190,60,0.85)';
    c.beginPath(); c.arc(0, -hh * 0.95, hh * 0.13, Math.PI, 0); c.fill();
    c.restore();
  }

  function status(c, w, h, rows) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(w - 300, h - 22 - rows.length * 22, 288, rows.length * 22 + 8);
    for (let i = 0; i < rows.length; i++) {
      const y = h - 16 - (rows.length - 1 - i) * 22;
      G.mono(c, rows[i][0], w - 288, y, 12, 'left', 'rgba(200,255,215,0.55)');
      G.mono(c, rows[i][1], w - 26, y, 13, 'right', G.pal().camInk);
    }
    c.restore();
  }

  function draw(c, p, W, H, t, dt) {
    if (!M.open) return;
    c.save();
    c.fillStyle = 'rgba(4,6,8,0.97)';
    c.fillRect(0, 0, W, H);

    const pad = Math.min(W, H) * 0.06;
    let vw = W - pad * 2, vh = vw * 0.72;
    if (vh > H - pad * 2 - 74) { vh = H - pad * 2 - 74; vw = vh / 0.72; }
    const vx = (W - vw) / 2, vy = pad;

    c.save();
    c.translate(vx, vy);
    M.roll = (M.roll + dt * 9) % (vh * 3);
    c.save();
    c.beginPath(); c.rect(0, 0, vw, vh); c.clip();
    c.translate(0, 0);
    scene(c, CAMS[M.cam], p, vw, vh, t);

    if (M.switchT > 0) {
      M.switchT -= dt;
      c.globalAlpha = Math.min(1, M.switchT * 2.4);
      for (let y = 0; y < vh; y += 3) {
        c.fillStyle = 'rgba(' + (140 + Math.random() * 100 | 0) + ',' + (140 + Math.random() * 100 | 0) + ',' + (140 + Math.random() * 100 | 0) + ',0.55)';
        c.fillRect(0, y, vw, 2);
      }
      c.globalAlpha = 1;
    }

    c.fillStyle = 'rgba(0,0,0,0.30)';
    for (let y = 0; y < vh; y += 3) c.fillRect(0, y, vw, 1.4);
    const ry = (M.roll % (vh + 160)) - 80;
    const rg = c.createLinearGradient(0, ry, 0, ry + 80);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = rg; c.fillRect(0, ry, vw, 80);

    const vg = c.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = vg; c.fillRect(0, 0, vw, vh);

    const cam = CAMS[M.cam];
    G.mono(c, 'CAM ' + cam.n + '   ' + L('cam.' + cam.id), 18, 24, 15, 'left', G.pal().camInk);
    const hh = Math.floor(p.clock / 3600) % 24, mm = Math.floor(p.clock / 60) % 60, ss = Math.floor(p.clock) % 60;
    G.mono(c, String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'),
      vw - 18, 24, 15, 'right', G.pal().camInk);
    if (Math.floor(t * 1.6) % 2 === 0) {
      c.fillStyle = 'rgba(255,70,60,0.9)';
      c.beginPath(); c.arc(vw - 150, 20, 5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.strokeStyle = 'rgba(120,140,130,0.35)'; c.lineWidth = 2;
    c.strokeRect(-1, -1, vw + 2, vh + 2);
    c.restore();

    const by = vy + vh + 16;
    for (let i = 0; i < CAMS.length; i++) {
      const bw = Math.min(150, vw / 6.4), bx = vx + (vw - bw * CAMS.length - 8 * (CAMS.length - 1)) / 2 + i * (bw + 8);
      const on = i === M.cam;
      G.rr(c, bx, by, bw, 30, 3);
      c.fillStyle = on ? G.pal().amber : 'rgba(255,255,255,0.05)';
      c.fill();
      c.strokeStyle = on ? 'rgba(255,164,43,1)' : 'rgba(255,255,255,0.18)';
      c.lineWidth = 1; c.stroke();
      G.mono(c, (i + 1) + '  ' + CAMS[i].id, bx + bw / 2, by + 15, 11, 'center', on ? G.pal().btnInkLit : G.pal().btnInk);
      M.buttons = M.buttons || [];
      M.buttons[i] = { x: bx, y: by, w: bw, h: 30 };
    }
    G.mono(c, L('mon.footer'), W / 2, by + 52, 11, 'center', 'rgba(180,175,162,0.5)');
    c.restore();
  }

  function clickAt(x, y) {
    if (!M.open || !M.buttons) return false;
    for (let i = 0; i < M.buttons.length; i++) {
      const b = M.buttons[i];
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { select(i); return true; }
    }
    return false;
  }

  DH.Monitor = { M, CAMS, open, close, select, draw, clickAt, isOpen: () => M.open };
})();
