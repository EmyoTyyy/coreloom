/* =================================================================
   render.js — canvas rendering of the mansion
   -----------------------------------------------------------------
   Top-down grid of rooms, camera centred on the player, doors,
   item markers, the entity (only when near/visible) and an
   atmospheric darkness/fog overlay with a candle-flicker.
   ================================================================= */

const Render = (() => {
  let canvas, ctx;
  const CELL = 64; // room size in px
  const GAP = 26; // space between rooms (the "wall/door" zone)
  const STEP = CELL + GAP;

  // room fill colours by state
  const COLORS = {
    normal: "#1c1c22",
    current: "#33333f",
    safe: "#1b2c44",
    locked: "#3a2620",
    cursed: "#2a1d33",
    final: "#3a161a",
    unknown: "#101015",
  };

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
  }

  /** Main draw. `clock` (ms) drives the candle flicker animation. */
  function draw(g, clock) {
    if (!ctx || !g.mansion) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const rooms = g.mansion.rooms;
    const player = rooms[g.player.currentRoomId];

    // background
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, W, H);

    // screen-space position of a room (camera centred on the player)
    const sx = (r) => cx + (r.x - player.x) * STEP;
    const sy = (r) => cy + (r.y - player.y) * STEP;

    // ---- doors first (drawn under rooms) ----
    ctx.lineWidth = 8;
    for (const id in rooms) {
      const r = rooms[id];
      if (!r.known && !r.visited) continue;
      for (const dir of ["east", "south"]) { // draw each edge once
        const nid = r.doors[dir];
        if (!nid) continue;
        const n = rooms[nid];
        if (!n.known && !n.visited) continue;
        const x1 = sx(r), y1 = sy(r), x2 = sx(n), y2 = sy(n);
        const locked = n.locked || r.locked;
        ctx.strokeStyle = locked ? "#5a2a22" : "#33333d";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (locked) {
          // small lock dot midway
          ctx.fillStyle = "#7a3a2e";
          ctx.beginPath();
          ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ---- rooms ----
    for (const id in rooms) {
      const r = rooms[id];
      const onScreen = Math.abs(r.x - player.x) <= 6 && Math.abs(r.y - player.y) <= 5;
      if (!onScreen) continue;
      const isCurrent = id === g.player.currentRoomId;
      const known = r.known || r.visited;
      if (!known) continue;
      drawRoom(g, r, sx(r), sy(r), isCurrent);
    }

    // ---- item markers in current/visited rooms ----
    for (const id in rooms) {
      const r = rooms[id];
      if (!r.visited && id !== g.player.currentRoomId) continue;
      if (Math.abs(r.x - player.x) > 6 || Math.abs(r.y - player.y) > 5) continue;
      drawMarkers(r, sx(r), sy(r));
    }

    // ---- entity (only when near & not in safe room) ----
    drawEntity(g, sx, sy, clock);

    // ---- player ----
    drawPlayer(g, cx, cy, clock);

    // ---- darkness / fog overlay ----
    drawDarkness(g, cx, cy, clock);

    // ---- vignette ----
    const vig = ctx.createRadialGradient(cx, cy, H * 0.3, cx, cy, H * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    if (g.debug) drawDebug(g, sx, sy);
  }

  function drawRoom(g, r, x, y, isCurrent) {
    const half = CELL / 2;
    let fill = COLORS.normal;
    if (r.type === "final") fill = COLORS.final;
    else if (r.type === "safe") fill = COLORS.safe;
    else if (r.locked) fill = COLORS.locked;
    else if (r.cursed) fill = COLORS.cursed;
    if (isCurrent) fill = lighten(fill, 26);

    // body
    ctx.fillStyle = fill;
    roundRect(x - half, y - half, CELL, CELL, 6);
    ctx.fill();

    // border
    ctx.lineWidth = isCurrent ? 2.5 : 1;
    ctx.strokeStyle = isCurrent ? "#8a8a9a" : "#2c2c36";
    roundRect(x - half, y - half, CELL, CELL, 6);
    ctx.stroke();

    // room label (only for visited rooms, kept short)
    if (r.visited) {
      ctx.fillStyle = isCurrent ? "#cfc8ba" : "#6a6a76";
      ctx.font = "9px " + "Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = shortName(r.name);
      ctx.fillText(label, x, y + half - 9);
    }

    // lock icon
    if (r.locked) {
      ctx.fillStyle = "#b06a4a";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚿", x, y - 6); // small lock-ish glyph
    }
  }

  function drawMarkers(r, x, y) {
    const markers = [];
    if (r.clue) markers.push("#9a7ec0");
    for (const it of r.items) markers.push((ITEMS[it] && ITEMS[it].color) || "#cccccc");
    if (!markers.length) return;
    const startX = x - ((markers.length - 1) * 6) / 2;
    for (let i = 0; i < markers.length; i++) {
      ctx.fillStyle = markers[i];
      ctx.shadowColor = markers[i];
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(startX + i * 6, y - CELL / 2 + 9, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawPlayer(g, cx, cy, clock) {
    // soft warm glow
    const flick = 1 + Math.sin(clock / 140) * 0.05;
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26 * flick);
    glow.addColorStop(0, "rgba(232,196,90,0.9)");
    glow.addColorStop(1, "rgba(232,196,90,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * flick, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = "#e8dcc0";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a7a4a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // candle flame indicator
    if (g.player.candleTurns > 0) {
      ctx.fillStyle = "#ffd25a";
      ctx.beginPath();
      ctx.arc(cx + 9, cy - 9, 2.6 + Math.sin(clock / 90) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEntity(g, sx, sy, clock) {
    const e = g.entity;
    if (!e) return;
    const rooms = g.mansion.rooms;
    const playerSafe = rooms[g.player.currentRoomId].type === "safe";
    const dist = Generation.distances(rooms, e.currentRoomId)[g.player.currentRoomId];
    const d = dist === undefined ? 99 : dist;

    // real glimpse: only when within 1 room and not safe
    let showId = null;
    if (!playerSafe && d <= 1) showId = e.currentRoomId;

    // hallucinated glimpse at low sanity (a fake, harmless shape)
    if (!showId && g.player.sanity < CONFIG.SANITY_LOW && g.rng && Math.random() < 0.012) {
      const neigh = Object.values(rooms[g.player.currentRoomId].doors).filter(Boolean);
      if (neigh.length) showId = neigh[Math.floor(Math.random() * neigh.length)];
    }
    if (!showId) return;

    const r = rooms[showId];
    const x = sx(r), y = sy(r);
    const pulse = 0.6 + Math.sin(clock / 120) * 0.4;

    // dark red aura
    const aura = ctx.createRadialGradient(x, y, 2, x, y, 28);
    aura.addColorStop(0, `rgba(176,40,40,${0.5 * pulse})`);
    aura.addColorStop(1, "rgba(176,40,40,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // silhouette
    ctx.fillStyle = "#0a0506";
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = "#e85048";
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 1.6, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 3, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDarkness(g, cx, cy, clock) {
    const room = g.mansion.rooms[g.player.currentRoomId];
    let radius = CONFIG.LIGHT_RADIUS[room.light] || 300;
    if (g.player.candleTurns > 0) radius += 120;
    if (room.type === "safe") radius = CONFIG.LIGHT_RADIUS.bright;
    // low sanity tightens & destabilises vision
    if (g.player.sanity < CONFIG.SANITY_LOW) radius *= 0.85;
    // candle/torch flicker
    radius *= 1 + Math.sin(clock / 110) * 0.03 + (Math.random() - 0.5) * 0.02;

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.55)");
    grad.addColorStop(1, "rgba(0,0,0,0.97)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawDebug(g, sx, sy) {
    const rooms = g.mansion.rooms;
    ctx.fillStyle = "#7dd87d";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    for (const id in rooms) {
      const r = rooms[id];
      if (Math.abs(r.x - rooms[g.player.currentRoomId].x) > 6) continue;
      if (Math.abs(r.y - rooms[g.player.currentRoomId].y) > 5) continue;
      ctx.fillText(id, sx(r), sy(r) - CELL / 2 + 4);
    }
    // entity marker
    const e = rooms[g.entity.currentRoomId];
    if (e) {
      ctx.fillStyle = "#ff5050";
      ctx.fillText("E:" + g.entity.state, sx(e), sy(e) + 4);
    }
  }

  /* ---- small canvas helpers ------------------------------------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
    return `rgb(${r},${g},${b})`;
  }

  function shortName(name) {
    if (name.length <= 11) return name;
    return name.split(" ")[0];
  }

  return { init, draw };
})();
