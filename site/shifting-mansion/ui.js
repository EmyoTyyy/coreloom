/* =================================================================
   ui.js — DOM panels, event log, overlays and screen switching
   -----------------------------------------------------------------
   Reads from the GameState `g` and writes to the page. Interaction
   buttons call into Main.* (defined in main.js, available at runtime).
   ================================================================= */

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  let logSeq = 0;

  /* creepy substitutions used only at low sanity */
  const FAKE_NAMES = ["The Room With Your Name", "Somewhere You've Been Before",
    "Not A Room", "The Waiting Place", "Here Again", "A Room That Remembers You"];
  const FAKE_WHISPERS = ["Did you hear that?", "Someone called your name.",
    "You are not alone in here.", "It was right behind you.", "Don't turn around."];

  /* ---- screen switching ----------------------------------------- */
  function showScreen(name) {
    for (const s of document.querySelectorAll(".screen")) s.classList.remove("active");
    const el = $("screen-" + name);
    if (el) el.classList.add("active");
  }

  /* ---- event log ------------------------------------------------ */
  function log(g, text, type = "system") {
    // low-sanity: occasionally inject a misleading whisper
    if (g.player.sanity < CONFIG.SANITY_LOW && Math.random() < 0.12) {
      pushLog(g, pick(FAKE_WHISPERS), "warn");
    }
    pushLog(g, text, type);
  }

  function pushLog(g, text, type) {
    g.log.push({ id: logSeq++, text, type });
    if (g.log.length > 60) g.log.shift();
    renderLog(g);
  }

  function renderLog(g) {
    const ul = $("event-log");
    if (!ul) return;
    ul.innerHTML = "";
    for (const entry of g.log.slice(-40)) {
      const li = document.createElement("li");
      li.className = "log-line log-" + entry.type;
      li.textContent = entry.text;
      ul.appendChild(li);
    }
    ul.scrollTop = ul.scrollHeight;
  }

  /* ---- full panel refresh --------------------------------------- */
  function refresh(g) {
    if (!g.mansion) return;
    const p = g.player;
    const room = g.mansion.rooms[p.currentRoomId];

    // top bar
    $("stat-night").textContent = g.night + " / " + CONFIG.TOTAL_NIGHTS;
    $("stat-phase").textContent = g.timePhase;
    $("bar-health").style.width = p.health + "%";
    $("bar-sanity").style.width = p.sanity + "%";
    $("bar-fear").style.width = p.fear + "%";
    $("stat-keys").textContent = `${p.keys.small}·${p.keys.rusted}·${p.keys.silver}`;
    $("stat-keys").title = `Small ${p.keys.small} · Rusted ${p.keys.rusted} · Silver ${p.keys.silver}`;

    // objective
    const obj = OBJECTIVES[g.night];
    if (obj) {
      const res = obj.check(g);
      $("stat-objective").textContent = obj.text + "  (" + res.label + ")";
      $("stat-objective").style.color = res.done ? "#6fae6f" : "";
    }

    // room name + description (distorted at low sanity)
    let name = room.name;
    let desc = room.description;
    if (p.sanity < CONFIG.SANITY_LOW) {
      if (Math.random() < 0.2) name = pick(FAKE_NAMES);
      if (Math.random() < 0.15) desc = desc + " The walls seem closer than before.";
    }
    $("room-name").textContent = name;
    $("room-desc").textContent = desc;
    $("room-name").style.color = room.type === "safe" ? "#7fa8e0"
      : room.cursed ? "#b79ad8" : room.type === "final" ? "#e0786a" : "";
    setRoomArt(room, p, name);

    renderInteractions(g, room);
    renderInventory(g);
    renderClues(g);
    updateProximityFx(g);
    if (g.debug) updateDebug(g);
  }

  /* ---- room art --------------------------------------------------
     One painting per room type in img/. The panel obeys the same
     darkness rule the game does: an unlit dark room is barely visible
     here either, so a candle actually shows you the room.
     Any room type without a file just falls back to no image.        */
  function setRoomArt(room, p, name) {
    const img = $("room-art");
    const src = "img/" + room.type + ".webp";
    if (!img.getAttribute("src") || !img.getAttribute("src").endsWith(src)) {
      img.onerror = () => { img.hidden = true; };
      img.onload = () => { img.hidden = false; };
      img.src = src;
    }
    img.alt = name;
    const unlit = (room.light === "dark" || room.light === "pitch") && p.candleTurns <= 0;
    img.classList.toggle("room-art--unlit", unlit);
    img.classList.toggle("room-art--mad", p.sanity < CONFIG.SANITY_LOW);
  }

  /** Pull every room painting into cache once a run starts, so moving
      between rooms never waits on the network. The whole set is ~180 KB. */
  function preloadRoomArt() {
    const load = () => {
      for (const type in ROOM_TYPES) new Image().src = "img/" + type + ".webp";
    };
    if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 4000 });
    else setTimeout(load, 1500);
  }

  /* ---- interaction buttons -------------------------------------- */
  function renderInteractions(g, room) {
    const box = $("interactions");
    box.innerHTML = "";
    const add = (label, cost, fn, hint) => {
      const b = document.createElement("button");
      b.className = "btn";
      b.innerHTML = label + (cost ? ` <small>${cost}t</small>` : "");
      if (hint) b.title = hint;
      b.onclick = fn;
      box.appendChild(b);
    };

    // show the "open the final room" action when standing next to it
    const nearFinal = Object.keys(room.doors).some((dir) => {
      const n = g.mansion.rooms[room.doors[dir]];
      return n && n.type === "final";
    });
    if (nearFinal || room.type === "final") {
      add("Open the Final Room ⟶", "", () => Main.enterFinal());
    }
    if (room.items.length) {
      add(`Pick up items (${room.items.length})`, "", () => Main.pickupAll());
    }
    if (room.clue) {
      add("Read the note", CONFIG.TIME_COST.read, () => Main.readClue());
    }
    if (!room.searched) {
      add("Search the room", CONFIG.TIME_COST.search, () => Main.search(),
        "May reveal items or clues — but it makes noise.");
    }
    if (room.type === "safe") {
      add("Rest", CONFIG.TIME_COST.rest, () => Main.rest(),
        "Calms fear and restores some sanity.");
    }
    add("Hide", CONFIG.TIME_COST.hide, () => Main.hide(),
      "Lowers the chance of being caught this turn.");
    add("Wait", CONFIG.TIME_COST.wait, () => Main.wait());
  }

  /* ---- inventory ------------------------------------------------- */
  function renderInventory(g) {
    const ul = $("inventory-list");
    ul.innerHTML = "";
    const p = g.player;
    let count = 0;

    // keys first
    const keyLine = (type, label, color) => {
      if (!p.keys[type]) return;
      count += p.keys[type];
      const li = document.createElement("li");
      li.className = "inv-item";
      li.innerHTML = `<span class="swatch" style="background:${color};color:${color}"></span>` +
        `<span class="inv-name">${label}</span><span class="inv-x">×${p.keys[type]}</span>`;
      ul.appendChild(li);
    };
    keyLine("small", "Small Key", ITEMS.small_key.color);
    keyLine("rusted", "Rusted Key", ITEMS.rusted_key.color);
    keyLine("silver", "Silver Key", ITEMS.silver_key.color);

    // other items
    for (const id in p.inventory) {
      const def = ITEMS[id];
      const n = p.inventory[id];
      count += n;
      const li = document.createElement("li");
      li.className = "inv-item" + (def.type === "story" ? " story" : "");
      li.innerHTML = `<span class="swatch" style="background:${def.color};color:${def.color}"></span>` +
        `<span class="inv-name">${def.name}</span><span class="inv-x">×${n}</span>`;
      li.title = def.desc;
      if (def.type === "consumable") {
        const b = document.createElement("button");
        b.className = "btn btn--mini";
        b.textContent = "Use";
        b.onclick = () => Main.useItem(id);
        li.appendChild(b);
      }
      ul.appendChild(li);
    }

    if (!ul.children.length) {
      ul.innerHTML = '<li class="empty-note">Your hands are empty.</li>';
    }
    $("inv-count").textContent = `(${count})`;
  }

  /* ---- clues ----------------------------------------------------- */
  function renderClues(g) {
    const ul = $("clue-list");
    ul.innerHTML = "";
    const ids = g.player.clues;
    for (const id of ids) {
      const c = clueById(id);
      if (!c) continue;
      const li = document.createElement("li");
      li.className = "clue-item" + (c.important ? " important" : "");
      li.innerHTML = `<div class="clue-title">${c.title}</div><div class="clue-sum">${c.summary}</div>`;
      li.onclick = () => showNote(c.title, c.text);
      ul.appendChild(li);
    }
    if (!ids.length) ul.innerHTML = '<li class="empty-note">No clues yet.</li>';
    $("clue-count").textContent = `(${ids.length})`;
  }

  /* ---- note / clue reader --------------------------------------- */
  function showNote(title, text) {
    $("note-title").textContent = title;
    $("note-text").textContent = text;
    $("note-overlay").classList.remove("hidden");
  }
  function hideNote() {
    $("note-overlay").classList.add("hidden");
  }

  /* ---- proximity / damage visual effects ------------------------ */
  function updateProximityFx(g) {
    const wrap = $("canvas-wrap");
    const d = Entity.distanceToPlayer(g);
    const safe = g.mansion.rooms[g.player.currentRoomId].type === "safe";
    wrap.classList.toggle("pulse", !safe && d >= 0 && d <= 2);
    if (g.fx.damage) { flashDamage(); g.fx.damage = false; }
    if (g.fx.shake || g.player.sanity < 15) { shake(); g.fx.shake = false; }
    g.fx.pulse = false;
  }
  function flashDamage() {
    const el = $("damage-flash");
    el.classList.remove("flash");
    void el.offsetWidth; // restart animation
    el.classList.add("flash");
  }
  function shake() {
    const el = $("canvas-wrap");
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }
  function phaseHint(text) {
    const el = $("phase-hint");
    el.textContent = text;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  /* ---- mansion-shift transition --------------------------------- */
  function showTransition(lines, done) {
    const overlay = $("transition-overlay");
    const ul = $("transition-log");
    ul.innerHTML = "";
    overlay.classList.remove("hidden");
    lines.forEach((line, i) => {
      const li = document.createElement("li");
      li.textContent = line;
      li.style.animationDelay = i * 0.7 + 0.3 + "s";
      ul.appendChild(li);
    });
    const total = lines.length * 700 + 1600;
    setTimeout(() => {
      overlay.classList.add("hidden");
      if (done) done();
    }, total);
  }

  /* ---- debug ---------------------------------------------------- */
  function updateDebug(g) {
    const info = $("debug-info");
    if (!info) return;
    const e = g.entity;
    info.innerHTML = [
      `seed: ${g.seed}`,
      `night: ${g.night}  turn: ${g.turn}`,
      `time: ${g.time.toFixed(0)} / ${CONFIG.TIME_MAX} (${g.timePhase})`,
      `room: ${g.player.currentRoomId} (${g.mansion.rooms[g.player.currentRoomId].name})`,
      `light: ${g.mansion.rooms[g.player.currentRoomId].light} danger:${g.mansion.rooms[g.player.currentRoomId].danger}`,
      `entity: ${e.currentRoomId} [${e.state}] aggro:${e.aggression.toFixed(2)} cd:${e.cooldown}`,
      `dist to player: ${Entity.distanceToPlayer(g)}`,
      `caught: ${g.caughtCount}/${CONFIG.MAX_CATCHES}`,
      `important clues: ${importantClueCount(g.player)}`,
    ].map((t) => `<div>${t}</div>`).join("");
  }
  function toggleDebug(g) {
    g.debug = !g.debug;
    $("debug-panel").classList.toggle("hidden", !g.debug);
    if (g.debug) updateDebug(g);
  }

  /* ---- helpers -------------------------------------------------- */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  return {
    showScreen, log, renderLog, refresh, showNote, hideNote,
    showTransition, flashDamage, shake, phaseHint,
    updateDebug, toggleDebug, preloadRoomArt,
  };
})();
