(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const G = DH.G;
  const L = DH.L;

  // The desk runs the length of the room at a nearer parallax than the console,
  // so a point on it does not sit under the panorama x of the board behind it:
  // desk x = board x * PARALLAX - (PW/2)(PARALLAX-1). `forBoard` is that
  // arithmetic, so every anchor below can be written as the board it sits under.
  const PARALLAX = 1.15;
  const TOP = 940;      // where the desk surface starts
  const EDGE = 1180;    // the near lip, past which is the unlit space underneath

  const forBoard = (bx) => bx * PARALLAX - (DH.Room.PW / 2) * (PARALLAX - 1);

  // Where everything is, and why. A control room desk is not laid out; it
  // accumulates. Each of these has a reason that is visible in the scene.
  const AT = {
    // The camera terminal was added long after the panel was built and there is
    // exactly one socket on this wall, so it lives at the far left end whether
    // that is convenient or not, with its cable trailing back to the conduit.
    conduit: forBoard(200),
    cctv: forBoard(330),
    // Rarely wanted, so it has drifted left out of the working area — but still
    // in its clip, because the one night you need it you need it immediately.
    torch: forBoard(640),
    // Left of centre: you pick the handset up with the hand you are not writing
    // with.
    phone: forBoard(1015),
    // Middle of your working area and a little right of it, where a right-handed
    // person puts a mug down without looking.
    mug: forBoard(1235),
    // Which is why the pens are next to it.
    pens: forBoard(1350),
    recorder: forBoard(1520),
    // Marked up with those pens, read, and shoved out of the way.
    sheet: forBoard(1810),
    // The manual is filed in the stack of paperwork nobody has dealt with,
    // because you are not supposed to need it.
    pile: forBoard(2440)
  };

  // Where each generated still sits, relative to the thing it stands in for. A still
  // replaces the *housing* only: every functional inset — screens, paper windows,
  // lamps, traces — keeps being drawn on top at the coordinates it always used, so
  // the two can never fall out of alignment. Sizes hold each image's aspect ratio;
  // this table is the one place to nudge placement.
  const ART = {
    cctv: ['deskCctv', 0, -8, 112, 67],
    phone: ['deskPhone', 4, -8, 100, 81],
    recorder: ['deskRecorder', 0, 2, 136, 63],
    pile: ['deskPile', 0, 4, 124, 70],
    pens: ['deskPens', -6, -52, 66, 88]
  };

  // false when the image has not loaded — off `file://` or before it arrives — so
  // every object keeps its procedural body as a fallback.
  function still(c, k, x, y) {
    const a = ART[k], img = a && DH.Room.R.art[a[0]];
    if (!img) return false;
    c.drawImage(img, x + a[1], y + a[2], a[3], a[4]);
    return true;
  }

  let ITEMS = null;
  let dispatch = () => {};
  let say = () => {};

  // Consumed over a shift, and reset by newShift() rather than by reset(), which
  // only rebuilds the objects when the language changes.
  const ST = { mug: 1, torchOut: false };

  // ---- one hand, two grips -------------------------------------------------
  // Everything on the desk is picked up by the same hand coming in from below the
  // frame, because that is where you are. `close` runs 0 (open) to 1 (holding),
  // and the grip decides what closing looks like: fingers wrapping a barrel is
  // not the same shape as two fingers taking a sheet off a stack.
  function hand(c, hx, hy, grip, close, alpha) {
    const P = G.pal();
    c.save();
    c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.translate(hx, hy);
    c.rotate(-0.34);

    // forearm, out of frame at the bottom
    c.fillStyle = P.hand;
    c.beginPath();
    c.moveTo(-26, 6);
    c.quadraticCurveTo(-40, 90, -46, 300);
    c.lineTo(56, 300);
    c.quadraticCurveTo(44, 96, 30, 10);
    c.closePath();
    c.fill();

    // palm
    c.beginPath();
    c.moveTo(-28, 4);
    c.quadraticCurveTo(-34, -22, -12, -30);
    c.quadraticCurveTo(6, -36, 22, -26);
    c.quadraticCurveTo(36, -16, 32, 12);
    c.closePath();
    c.fill();

    // fingers. wrap curls them round a cylinder; pinch brings only the first two
    // together and leaves the rest folded down.
    const pinch = grip === 'pinch';
    const n = pinch ? 2 : 4;
    for (let i = 0; i < n; i++) {
      const base = -20 + i * 14;
      const len = pinch ? 30 : 34 - i * 2.5;
      const a = (pinch ? -1.25 + i * 0.5 : -1.5 + i * 0.16) + close * (pinch ? 0.55 : 1.15);
      c.save();
      c.translate(base, -26);
      c.rotate(a);
      G.rr(c, -5.5, -len, 11, len + 8, 5.5);
      c.fill();
      c.restore();
    }
    // thumb, opposing
    c.save();
    c.translate(-26, -14);
    c.rotate(1.5 - close * 0.7);
    G.rr(c, -6, -4, 12, 30, 6);
    c.fill();
    c.restore();

    // the room lights are above and behind, so the top edge catches a little
    c.strokeStyle = P.handRim;
    c.lineWidth = 1.4;
    c.globalAlpha = (alpha === undefined ? 1 : alpha) * 0.5;
    c.beginPath();
    c.moveTo(-28, 2);
    c.quadraticCurveTo(-34, -24, -11, -31);
    c.quadraticCurveTo(7, -37, 23, -27);
    c.stroke();
    c.restore();
  }

  // ---- the things themselves ----------------------------------------------
  // The conduit and the socket the terminal is plugged into. Surface-mounted
  // steel, screwed to the back of the desk, obviously added after the fact.
  function conduit(c, p, t) {
    const P = G.pal();
    const x = AT.conduit, y = TOP - 18;
    c.fillStyle = P.camSteelLo;
    G.rr(c, x, y, 62, 46, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.08)';
    G.rr(c, x, y, 62, 3, 2); c.fill();
    G.screws(c, x, y, 62, 46, 2.4);
    // socket face, two live slots and earth
    c.fillStyle = P.nixieBg;
    G.rr(c, x + 12, y + 10, 38, 26, 2); c.fill();
    c.fillStyle = P.underDesk;
    G.rr(c, x + 19, y + 15, 4, 9, 1); c.fill();
    G.rr(c, x + 39, y + 15, 4, 9, 1); c.fill();
    G.rr(c, x + 28, y + 27, 6, 4, 1); c.fill();
    // and the cable, sagging across the desk to the back of the terminal
    c.strokeStyle = P.underDesk;
    c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x + 31, y + 34);
    c.bezierCurveTo(x + 60, y + 96, AT.cctv - 30, y + 104, AT.cctv + 46, TOP + 26);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.07)';
    c.lineWidth = 1.6;
    c.stroke();
  }

  function torch(c, o, p, t) {
    const P = G.pal();
    const x = o.x, y = o.y + 34;
    // the clip it lives in, which is how you can see it is gone
    c.fillStyle = P.camSteelLo;
    for (const dx of [16, 66]) { G.rr(c, x + dx, y - 13, 10, 26, 3); c.fill(); }
    if (ST.torchOut) {
      c.fillStyle = 'rgba(0,0,0,0.30)';
      G.rr(c, x + 14, y - 3, 66, 8, 4); c.fill();
      G.mono(c, L('desk.torchGone'), x + o.w / 2, o.y + 66, 9.5, 'center', P.inkDim);
      return;
    }
    barrel(c, x, y, DH.Room.R.flashlight);
    G.mono(c, L('desk.torch'), x + o.w / 2, o.y + 66, 10, 'center', P.inkDim);
  }

  // drawn on its own so the hand can carry it
  function barrel(c, x, y, lit) {
    const P = G.pal();
    c.save();
    c.translate(x + 48, y);
    c.rotate(-0.06);
    // The still is drawn in the same local frame, so the hand carries it too.
    const img = DH.Room.R.art.deskTorch;
    if (img) {
      c.drawImage(img, -50, -18, 96, 36);
    } else {
      const g = c.createLinearGradient(0, -12, 0, 12);
      g.addColorStop(0, P.torchHi); g.addColorStop(0.45, P.torchBody); g.addColorStop(1, P.deskLo);
      c.fillStyle = g;
      G.rr(c, -46, -12, 74, 24, 6); c.fill();
      c.fillStyle = P.metalMid;
      G.rr(c, 24, -15, 22, 30, 4); c.fill();
      c.fillStyle = P.metalLo;
      G.rr(c, -50, -9, 8, 18, 3); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-42 + i * 5, -11); c.lineTo(-42 + i * 5, 11); c.stroke(); }
    }
    // Lens and thumb slide stay drawn: the still bakes the slide in one position, and
    // the whole point of the slide is that it moves when the torch is lit.
    c.fillStyle = lit ? P.white : P.face;
    if (lit) { c.save(); c.shadowColor = P.white; c.shadowBlur = 24; }
    c.beginPath(); c.ellipse(45, 0, 4, 13, 0, 0, Math.PI * 2); c.fill();
    if (lit) c.restore();
    c.fillStyle = P.knobMark;
    G.rr(c, lit ? -4 : -20, -15, 13, 8, 2); c.fill();
    c.restore();
  }

  function phone(c, o, p, t) {
    const P = G.pal();
    const x = o.x, y = o.y + 6;
    if (!still(c, 'phone', o.x, o.y)) {
      c.fillStyle = P.metalLo;
      G.rr(c, x, y, 108, 52, 6); c.fill();
      c.fillStyle = P.camSteelLo;
      G.rr(c, x + 8, y + 8, 92, 30, 4); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.45)';
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
        G.rr(c, x + 14 + k * 20, y + 12 + r * 8, 14, 5, 1); c.fill();
      }
      c.fillStyle = P.metalMid;
      G.rr(c, x - 4, y - 12, 116, 15, 7); c.fill();
      c.fillStyle = P.metalHi;
      G.rr(c, x - 4, y - 12, 22, 15, 7); c.fill();
      G.rr(c, x + 94, y - 12, 22, 15, 7); c.fill();
    }
    // coiled cord, disappearing behind the desk. Drawn either way — it was cropped
    // out of the still precisely so this stays the one that exists.
    c.strokeStyle = P.metalLo; c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i <= 22; i++) {
      const px = x + 108 + i * 3.2;
      const py = y + 4 + Math.sin(i * 1.5) * 7 + i * 0.7;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.stroke();
    const ring = p && p.phone.ringing;
    c.fillStyle = ring ? P.amber : P.nixieBg;
    if (ring) {
      c.save();
      c.globalAlpha = 0.55 + 0.45 * Math.sin(t * 11);
      c.shadowColor = P.amber; c.shadowBlur = 26;
    }
    G.rr(c, x + 4, y + 42, 100, 8, 4); c.fill();
    if (ring) c.restore();
    G.mono(c, L('desk.phone'), x + o.w / 2, o.y + 64, 10, 'center', P.inkDim);
  }

  function recorder(c, o, p, t) {
    const P = G.pal();
    const x = o.x, y = o.y + 4;
    if (!still(c, 'recorder', o.x, o.y)) {
      c.fillStyle = P.camSteel;
      G.rr(c, x, y, 132, 56, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.08)';
      G.rr(c, x, y, 132, 3, 2); c.fill();
    }
    // The paper window is redrawn over the still so the live trace always has the
    // right ground under it, whatever the image happens to put there.
    G.inset(c, x + 8, y + 8, 88, 40, 2, P.paper);
    const hist = DH.Chart.series('pwr', 84);
    c.save();
    c.beginPath(); c.rect(x + 10, y + 10, 84, 36); c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.10)'; c.lineWidth = 0.6;
    for (let i = 1; i < 4; i++) {
      c.beginPath(); c.moveTo(x + 10, y + 10 + i * 9); c.lineTo(x + 94, y + 10 + i * 9); c.stroke();
    }
    if (hist && hist.length > 1) {
      c.strokeStyle = P.trace[0]; c.lineWidth = 1.2;
      c.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const px = x + 10 + i;
        const py = y + 46 - Math.min(Math.max(hist[i], 0), 1) * 36;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.stroke();
    }
    c.restore();
    c.fillStyle = P.red;
    G.rr(c, x + 92, y + 6, 4, 12, 1); c.fill();
    c.fillStyle = P.metalLo;
    c.beginPath(); c.arc(x + 114, y + 20, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.paper;
    c.beginPath(); c.arc(x + 114, y + 20, 7, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.green;
    c.beginPath(); c.arc(x + 114, y + 44, 3, 0, Math.PI * 2); c.fill();
    G.mono(c, L('desk.recorder'), x + o.w / 2, o.y + 66, 10, 'center', P.inkDim);
  }

  function terminal(c, o, p, t) {
    const P = G.pal();
    const x = o.x, y = o.y - 8;
    const up = DH.Monitor.isOpen();
    if (!still(c, 'cctv', o.x, o.y)) {
      c.fillStyle = P.camSteelLo;
      G.rr(c, x + 34, y + 62, 44, 8, 2); c.fill();
      G.rr(c, x + 48, y + 50, 16, 14, 2); c.fill();
      c.fillStyle = P.camSteel;
      G.rr(c, x, y, 112, 54, 5); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.07)';
      G.rr(c, x, y, 112, 3, 2); c.fill();
    }
    // Screen well redrawn over the still, so the scanlines below sit on a known dark
    // ground and land where the code expects rather than where the image drew one.
    G.inset(c, x + 7, y + 6, 76, 42, 4, P.screen);
    if (up) {
      c.save();
      c.fillStyle = P.screenInk;
      for (let i = 0; i < 9; i++) {
        c.globalAlpha = 0.05 + 0.05 * Math.sin(t * 3 + i);
        c.fillRect(x + 9, y + 8 + i * 4.6, 72, 2);
      }
      c.globalAlpha = 0.5;
      c.shadowColor = P.screenInk; c.shadowBlur = 14;
      c.fillRect(x + 9, y + 8 + ((t * 26) % 40), 72, 2);
      c.restore();
    }
    for (let i = 0; i < 6; i++) {
      c.fillStyle = up && DH.Monitor.M.cam === i ? P.amber : P.tileOff;
      G.rr(c, x + 90, y + 8 + i * 7, 14, 5, 1); c.fill();
    }
    G.mono(c, L('desk.cctv'), x + o.w / 2, o.y + 78, 10, 'center', P.inkDim);
  }

  // The mug. Handle attached to the body rather than floating beside it: the arc
  // is centred inside the silhouette so both ends finish under the wall, and the
  // body is painted over them afterwards.
  function mug(c, o, p, t) {
    const P = G.pal();
    const cx = o.x + o.w / 2, cy = o.y + 36;
    const lvl = ST.mug;
    const shake = DH.Room.R.shake || 0;

    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath(); c.ellipse(cx + 3, cy + 22, 24, 7, 0, 0, Math.PI * 2); c.fill();

    c.strokeStyle = P.mugLo; c.lineWidth = 7; c.lineCap = 'butt';
    c.beginPath(); c.arc(cx + 15, cy - 1, 15, -1.15, 1.15); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2;
    c.beginPath(); c.arc(cx + 15, cy - 1, 18, -1.0, 1.0); c.stroke();

    const g = c.createLinearGradient(cx - 22, 0, cx + 22, 0);
    g.addColorStop(0, P.mugLo); g.addColorStop(0.32, P.mug); g.addColorStop(1, P.mugLo);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx - 21, cy - 18);
    c.lineTo(cx - 18, cy + 20);
    c.quadraticCurveTo(cx, cy + 27, cx + 18, cy + 20);
    c.lineTo(cx + 21, cy - 18);
    c.closePath(); c.fill();

    // interior, then whatever is left in it, sitting lower as it goes
    c.fillStyle = P.mugLo;
    c.beginPath(); c.ellipse(cx, cy - 18, 21, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath(); c.ellipse(cx, cy - 17, 17, 5.6, 0, 0, Math.PI * 2); c.fill();
    if (lvl > 0.001) {
      const wob = shake > 0.001 ? Math.sin(t * 34) * shake * 3 : 0;
      const sy = cy - 16 + (1 - lvl) * 22;
      const sr = 17 - (1 - lvl) * 4;
      c.fillStyle = P.brew;
      c.beginPath(); c.ellipse(cx, sy + wob, sr, sr * 0.33, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.brewHi;
      c.beginPath(); c.ellipse(cx - 5, sy - 1 + wob, sr * 0.34, 2, 0, 0, Math.PI * 2); c.fill();
      // ring left on the inside wall by the coffee that used to be there
      if (lvl < 0.9) {
        c.strokeStyle = 'rgba(74,44,21,0.5)'; c.lineWidth = 1.4;
        c.beginPath(); c.ellipse(cx, cy - 15, 16.6, 5.4, 0, 0.15, Math.PI - 0.15); c.stroke();
      }
    }

    // Steam climbs past the desk's own top edge and up over the panels — the desk
    // is drawn after the console, so it is allowed to. Fading it out is what makes
    // it dissipate instead of stopping at a line.
    const heat = p ? Math.max(0, 1 - (p.t || 0) / 2400) * lvl : lvl;
    if (heat > 0.02) {
      c.save();
      c.strokeStyle = P.mug; c.lineWidth = 2.6; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 11; k++) {
          const y0 = cy - 24 - k * 11, y1 = y0 - 11;
          const drift = 1 + k * 0.55;
          const x0 = cx - 7 + i * 7 + Math.sin(t * 1.3 + k * 0.7 + i * 2.1) * 4 * drift;
          const x1 = cx - 7 + i * 7 + Math.sin(t * 1.3 + (k + 1) * 0.7 + i * 2.1) * 4 * (drift + 0.55);
          c.globalAlpha = 0.16 * heat * (1 - k / 11);
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        }
      }
      c.restore();
    }
    G.mono(c, lvl > 0.001 ? L('desk.mug') : L('desk.mugEmpty'),
      cx, o.y + 66, 9.5, 'center', P.inkDim);
  }

  // A pot of pens, a couple of them capless because they were in a hurry.
  function pens(c, p, t) {
    const P = G.pal();
    const x = AT.pens, y = TOP + 4;
    // Nothing here moves, so the still stands in for the whole thing.
    if (still(c, 'pens', x, y)) return;
    const kit = [
      [-14, -46, 0.16, P.penBlue], [-6, -52, -0.06, P.penBlue],
      [2, -44, 0.1, P.penRed], [10, -50, -0.16, P.markerY],
      [17, -40, 0.26, P.markerG], [-19, -38, -0.3, P.pencil]
    ];
    for (const [dx, len, rot, col] of kit) {
      c.save();
      c.translate(x + 27 + dx, y + 10);
      c.rotate(rot);
      c.fillStyle = col;
      G.rr(c, -3, len, 6, -len, 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)';
      G.rr(c, -3, len, 2, -len * 0.9, 1); c.fill();
      c.fillStyle = P.underDesk;
      G.rr(c, -3, len, 6, 9, 3); c.fill();
      c.restore();
    }
    c.fillStyle = P.metalLo;
    c.beginPath();
    c.moveTo(x + 6, y - 4); c.lineTo(x + 10, y + 30);
    c.quadraticCurveTo(x + 27, y + 36, x + 44, y + 30);
    c.lineTo(x + 48, y - 4);
    c.closePath(); c.fill();
    c.fillStyle = P.metalMid;
    c.beginPath(); c.ellipse(x + 27, y - 4, 21, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.ellipse(x + 27, y - 4, 17, 4.4, 0, 0, Math.PI * 2); c.fill();
    // mesh
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.9;
    for (let i = 1; i < 7; i++) {
      c.beginPath(); c.moveTo(x + 6 + i * 6, y - 2); c.lineTo(x + 10 + i * 5.6, y + 32); c.stroke();
    }
  }

  // The sheet those pens were used on: a printed curve somebody ran a highlighter
  // over, circled twice and wrote a number next to.
  function sheet(c, p, t) {
    const P = G.pal();
    const x = AT.sheet, y = TOP + 2;
    c.save();
    c.translate(x, y);
    c.rotate(-0.075);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(3, 5, 112, 44);
    c.fillStyle = P.paper;
    c.fillRect(0, 0, 112, 44);
    c.strokeStyle = P.docEdge; c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, 111, 43);
    // printed body
    c.fillStyle = 'rgba(43,38,32,0.55)';
    for (let i = 0; i < 4; i++) c.fillRect(7, 6 + i * 5, 44 - (i % 2) * 12, 1.6);
    // the trace, and the highlighter someone dragged along it
    c.globalAlpha = 0.5;
    c.fillStyle = P.markerY;
    c.fillRect(56, 12, 48, 11);
    c.globalAlpha = 1;
    c.strokeStyle = P.docInk; c.lineWidth = 1.2;
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const px = 56 + i * 2, py = 30 - Math.sin(i * 0.42) * 9 - i * 0.28;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.stroke();
    // circled twice in blue, and a number written beside it
    c.strokeStyle = P.penBlue; c.lineWidth = 1.4;
    for (const r of [0, 1.6]) {
      c.beginPath(); c.ellipse(84 + r * 0.4, 17, 13 + r, 8 + r, 0.1, 0, Math.PI * 2); c.stroke();
    }
    c.beginPath(); c.moveTo(70, 36); c.lineTo(84, 27); c.stroke();
    G.mono(c, '-2.4', 58, 38, 9, 'left', P.penBlue);
    c.fillStyle = 'rgba(74,44,21,0.16)';
    c.beginPath(); c.arc(22, 30, 13, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // The stack the manual is in. Nothing about it says "open me", which is the
  // point: you are not supposed to need it.
  function pile(c, o, p, t) {
    const P = G.pal();
    const x = o.x, y = o.y + 20;
    if (!still(c, 'pile', o.x, o.y)) {
      const leaves = [
        [0, 30, 120, 0.04, P.paper], [5, 24, 114, -0.05, P.paper],
        [2, 18, 118, 0.02, P.docTab], [7, 12, 110, -0.03, P.paper]
      ];
      for (const [dx, dy, w, rot, col] of leaves) {
        c.save();
        c.translate(x + dx, y + dy);
        c.rotate(rot);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(2, 3, w, 12);
        c.fillStyle = col;
        c.fillRect(0, 0, w, 12);
        c.strokeStyle = P.docEdge; c.lineWidth = 0.8;
        c.strokeRect(0.5, 0.5, w - 1, 11);
        c.restore();
      }
      // the manual itself, spine out, a fabric tab hanging from it
      c.save();
      c.translate(x + 4, y + 2);
      c.rotate(0.03);
      c.fillStyle = P.binder;
      G.rr(c, 0, -16, 112, 18, 2); c.fill();
      c.fillStyle = P.binderHi;
      G.rr(c, 0, -16, 112, 5, 2); c.fill();
      c.fillStyle = P.metalHi;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(22 + i * 34, -15, 5, 2.4, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = P.markerY;
      G.rr(c, 88, -4, 12, 9, 1); c.fill();
      c.restore();
    }
    // The spine label is redrawn either way: it carries localised text, so it can
    // never be part of a baked image.
    c.save();
    c.translate(x + 4, y + 2);
    c.rotate(0.03);
    c.fillStyle = P.paper;
    G.rr(c, 6, -13, 100, 10, 1); c.fill();
    G.mono(c, L('desk.binderSpine'), 56, -8, 8, 'center', P.docInk);
    c.restore();
    G.mono(c, L('desk.binder'), x + o.w / 2, o.y + 70, 10, 'center', P.inkDim);
  }

  // ---- clutter, so no pan lands on a bare desk ----------------------------
  function clutter(c, p) {
    const P = G.pal();
    const y = TOP;
    const busySpots = items().map((it) => [it.x - 90, it.x + it.w + 90])
      .concat([[AT.pens - 60, AT.pens + 114], [AT.sheet - 60, AT.sheet + 172],
        [AT.conduit - 40, AT.conduit + 102]]);
    for (let i = 0; i < 14; i++) {
      const x = -40 + i * 296;
      if (busySpots.some((s) => x > s[0] && x < s[1])) continue;
      const kind = i % 4;
      if (kind === 0) {
        c.fillStyle = P.desk; c.fillRect(x, y - 6, 96, 22);
        c.fillStyle = P.deskHi; c.fillRect(x, y - 6, 96, 4);
        G.mono(c, ['E-0', 'E-1', 'FR-H', 'ECA'][i % 4], x + 48, y + 6, 10, 'center', 'rgba(0,0,0,0.55)');
      } else if (kind === 1) {
        c.fillStyle = P.face;
        c.beginPath(); c.ellipse(x, y + 20, 22, 9, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = P.ink;
        c.beginPath(); c.ellipse(x, y + 19, 17, 6, 0, 0, Math.PI * 2); c.fill();
      } else if (kind === 2) {
        c.fillStyle = P.paper;
        c.save(); c.translate(x, y + 14); c.rotate(0.06 * (i % 3 ? 1 : -1));
        c.fillRect(-46, -16, 92, 32);
        c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
        for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-38, -16 + k * 8); c.lineTo(38, -16 + k * 8); c.stroke(); }
        c.restore();
      } else {
        c.fillStyle = P.metalLo;
        c.beginPath(); c.ellipse(x, y + 18, 26, 11, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.beginPath(); c.ellipse(x, y + 17, 19, 7, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }

  // ---- picking things up ---------------------------------------------------
  const ANIM = { kind: null, t: 0, dur: 0, it: null, then: null };
  const busy = () => !!ANIM.kind;

  function play(kind, it, dur, then) {
    ANIM.kind = kind; ANIM.t = 0; ANIM.dur = dur; ANIM.it = it; ANIM.then = then || null;
  }

  function tick(dt) {
    if (!ANIM.kind) return;
    ANIM.t += dt;
    if (ANIM.t < ANIM.dur) return;
    const f = ANIM.then;
    ANIM.kind = null; ANIM.it = null; ANIM.then = null;
    if (f) f();
  }

  // Reaching for something you are not looking at would be a hand rising into an
  // empty frame, so off screen it is only the sound.
  function inFrame(it) {
    const R = DH.Room.R;
    const left = (R.pan + R.visW / 2) * PARALLAX - (DH.Room.PW / 2) * (PARALLAX - 1) - R.visW / 2;
    return it.x > left + 40 && it.x + it.w < left + R.visW - 40;
  }

  // pan that puts a desk object in the middle of the frame
  function panFor(it) {
    const R = DH.Room.R;
    const centre = (it.x + it.w / 2 + (DH.Room.PW / 2) * (PARALLAX - 1)) / PARALLAX;
    return centre - R.visW / 2;
  }

  function drawAnim(c, p, t) {
    if (!ANIM.kind) return;
    const it = ANIM.it;
    const k = Math.min(ANIM.t / ANIM.dur, 1);
    const ease = (v) => v * v * (3 - 2 * v);
    const cx = it.x + it.w / 2, cy = it.y + 34;

    if (ANIM.kind === 'paper') {
      // in, pinch, and away with a sheet
      const rise = k < 0.45 ? ease(k / 0.45) : 1;
      const close = k < 0.45 ? 0 : Math.min((k - 0.45) / 0.18, 1);
      const away = k < 0.63 ? 0 : ease((k - 0.63) / 0.37);
      const hy = cy + (1 - rise) * 210 + away * 150;
      const hx = cx + 18 + away * 60;
      if (close > 0.5) {
        c.save();
        c.translate(hx - 30, hy - 16 + away * 6);
        c.rotate(-0.22 - away * 0.5);
        c.fillStyle = G.pal().paper;
        c.fillRect(-52, -7, 104, 13);
        c.strokeStyle = G.pal().docEdge; c.lineWidth = 0.9;
        c.strokeRect(-51.5, -6.5, 103, 12);
        c.restore();
      }
      hand(c, hx, hy, 'pinch', close, 1 - away * 0.35);
      return;
    }

    // grab: in, wrap, lift away with the torch. place: the same, reversed.
    const fwd = ANIM.kind === 'grab';
    const kk = fwd ? k : 1 - k;
    const rise = kk < 0.45 ? ease(kk / 0.45) : 1;
    const close = kk < 0.45 ? 0 : Math.min((kk - 0.45) / 0.2, 1);
    const away = kk < 0.65 ? 0 : ease((kk - 0.65) / 0.35);
    const hy = cy + (1 - rise) * 220 + away * 170;
    const hx = cx + 26 + away * 40;
    if (close > 0.35) barrel(c, hx - 74, hy - 12, fwd ? away > 0.4 : true);
    hand(c, hx, hy, 'wrap', close, 1 - away * 0.3);
  }

  // ---- assembly -----------------------------------------------------------
  function build() {
    const I = (k, w, h, key, paint, click) => ({
      k: k, deskItem: true, x: AT[k], y: TOP - 4, w: w, h: h,
      tip: L('dt.' + k), key: key, paint: paint, click: click
    });
    return [
      I('cctv', 116, 92, 'Tab', terminal),
      I('torch', 104, 78, 'f', torch),
      I('phone', 112, 74, 't', phone),
      // No shortcut, so it is the one thing on the desk you can only reach by
      // turning your head and clicking it.
      I('mug', 66, 72, null, mug, () => { if (!drink()) say(L('ui.mugEmpty')); }),
      I('recorder', 136, 78, 'c', recorder),
      I('pile', 124, 80, 'b', pile)
    ];
  }

  function items() {
    if (!ITEMS) ITEMS = build();
    return ITEMS;
  }

  function reset() { ITEMS = null; }
  function newShift() { ST.mug = 1; ST.torchOut = false; ANIM.kind = null; ANIM.then = null; }

  function draw(c, p, t) {
    const P = G.pal();
    const g = c.createLinearGradient(0, TOP - 24, 0, EDGE);
    g.addColorStop(0, P.deskHi);
    g.addColorStop(0.16, P.desk);
    g.addColorStop(1, P.deskLo);
    c.fillStyle = g;
    c.fillRect(-500, TOP - 24, DH.Room.PW + 1000, EDGE - TOP + 24);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(-500, TOP - 24, DH.Room.PW + 1000, 3);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(-500, TOP + 12, DH.Room.PW + 1000, 2);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.fillRect(-500, EDGE - 6, DH.Room.PW + 1000, 6);
    c.fillStyle = P.underDesk;
    c.fillRect(-500, EDGE, DH.Room.PW + 1000, 900);

    clutter(c, p);
    conduit(c, p, t);
    pens(c, p, t);
    sheet(c, p, t);

    const hov = DH.Room.R.hover;
    for (const it of items()) {
      if (hov && hov.deskItem && hov.k === it.k && !busy()) {
        c.save();
        c.shadowColor = P.amber; c.shadowBlur = 20;
        G.rr(c, it.x - 5, it.y - 5, it.w + 10, it.h + 10, 5);
        c.strokeStyle = P.amber; c.lineWidth = 1.3; c.globalAlpha = 0.75; c.stroke();
        c.restore();
      }
      it.paint(c, it, p, t);
    }
    drawAnim(c, p, t);
  }

  function hit(px, py) {
    if (busy()) return null;
    for (const it of items()) {
      if (px >= it.x && px <= it.x + it.w && py >= it.y && py <= it.y + it.h) return it;
    }
    return null;
  }

  // ---- what picking one up does -------------------------------------------
  // Desk clicks route through main.js's key handler, so an object and its
  // shortcut can never come to mean different things.
  function bind(fn, sayFn) { dispatch = fn; say = sayFn || (() => {}); }
  function activate(it) {
    if (!it) return;
    if (it.key) dispatch(it.key);
    else if (it.click) it.click();
  }

  function takeTorch(done) {
    const it = items().find((x) => x.k === 'torch');
    DH.Audio.grab();
    if (!inFrame(it)) { ST.torchOut = true; done(); return; }
    play('grab', it, 0.8, () => { ST.torchOut = true; done(); });
  }

  // The one action worth turning your head for: you have to go and put it back.
  function returnTorch(done) {
    const it = items().find((x) => x.k === 'torch');
    const go = () => play('place', it, 0.8, () => { ST.torchOut = false; DH.Audio.setDown(); done(); });
    if (inFrame(it)) go(); else DH.Room.panTo(panFor(it), go);
  }

  function takeDoc(done) {
    const it = items().find((x) => x.k === 'pile');
    DH.Audio.paper();
    if (!inFrame(it)) { done(); return; }
    play('paper', it, 0.62, done);
  }

  function drink() {
    if (ST.mug <= 0.001) return false;
    DH.Audio.sip(ST.mug);
    ST.mug = Math.max(0, ST.mug - 0.25);
    return true;
  }

  DH.Desk = {
    PARALLAX, TOP, EDGE, AT, forBoard, items, reset, newShift, draw, hit, tick,
    bind, activate, busy, inFrame, panFor,
    takeTorch, returnTorch, takeDoc, drink,
    mugLevel: () => ST.mug, torchOut: () => ST.torchOut
  };
})();
