/* =================================================================
   main.js — GameState, initialisation, input and the turn loop
   -----------------------------------------------------------------
   Everything is turn-based: each player action advances time, runs
   the entity, applies environmental pressure and checks for endings.
   A light requestAnimationFrame loop only redraws the canvas so the
   candle flicker / entity pulse feel alive.
   ================================================================= */

/* The single, mutable GameState. Kept as one object so render/ui/save
   can all reference the same `GAME`. */
const GAME = {
  screen: "menu",
  seed: 1,
  night: 1,
  time: 0,
  timePhase: "Early Night",
  turn: 0,
  caughtCount: 0,
  mansion: null,
  player: null,
  entity: null,
  log: [],
  storyFlags: {},
  flags: {},
  gameOver: false,
  busy: false, // blocks input during transitions
  debug: false,
  rng: null,
  fx: { damage: false, shake: false, pulse: false },
};

/* short story beat shown at the start of each night */
const NIGHT_INTRO = {
  1: "You wake on the cold floor of the Entrance Hall. The front door has no handle on this side. Somewhere above, the house breathes.",
  2: "Night falls again and the mansion has folded itself into something new. You feel that a family lived here, once.",
  3: "The third night. The walls remember a ritual performed below. The very air leans against you.",
  4: "Night four. Whatever stalks these halls was once one of them — kept, not killed.",
  5: "The final night. A door that was never there has appeared. Whatever the truth is, end it tonight.",
};

/* event log styling by event id */
function eventType(ev) {
  if (ev.id === "compartment") return "item";
  if (ev.id === "cold_comfort") return "safe";
  if (ev.id === "blood_wall" || ev.id === "scratch" || ev.id === "floorboard") return "danger";
  if (ev.id === "whisper" || ev.id === "piano" || ev.id === "map_changes") return "story";
  return "warn";
}

/* =================================================================
   Initialisation
   ================================================================= */
function init() {
  Render.init(document.getElementById("game-canvas"));
  bindMenu();
  bindGameInput();
  refreshContinueButton();
  UI.showScreen("menu");
  startRenderLoop();
}

function refreshContinueButton() {
  document.getElementById("btn-continue").disabled = !Save.exists();
}

/* ---- menu / overlay buttons ------------------------------------- */
function bindMenu() {
  const on = (id, fn) => document.getElementById(id).addEventListener("click", fn);

  on("btn-new-game", newGame);
  on("btn-continue", continueGame);
  on("btn-how-to", () => UI.showScreen("help"));
  on("btn-reset-save", () => {
    Save.clear();
    refreshContinueButton();
  });

  for (const el of document.querySelectorAll(".js-back-menu")) {
    el.addEventListener("click", () => UI.showScreen(GAME.player ? "game" : "menu"));
  }
  // leaving for EmyoT.Fun mid-run shouldn't cost you the run — the link
  // navigates as normal, we just get a save in first.
  for (const el of document.querySelectorAll(".js-home-save")) {
    el.addEventListener("click", () => { if (GAME.player) Save.save(GAME); });
  }
  for (const el of document.querySelectorAll(".js-close-note")) {
    el.addEventListener("click", () => UI.hideNote());
  }

  // pause menu
  on("btn-resume", togglePause);
  on("btn-save", () => { Save.save(GAME); refreshContinueButton(); UI.log(GAME, "Game saved.", "system"); });
  on("btn-pause-help", () => UI.showNote("Controls & Map", CONTROLS_TEXT));
  on("btn-quit-menu", () => { togglePause(); UI.showScreen("menu"); refreshContinueButton(); });

  // end screens
  on("btn-restart-death", newGame);
  on("btn-restart-end", newGame);

  // debug buttons
  for (const b of document.querySelectorAll("[data-debug]")) {
    b.addEventListener("click", () => debugAction(b.getAttribute("data-debug")));
  }
}

const CONTROLS_TEXT =
  "Move: W A S D or Arrow keys (move through doors)\n" +
  "Sprint: hold Shift while moving (fast, but loud and frightening)\n" +
  "Interact: E  (pick up / read / search)\n" +
  "Wait: Space   Pause: Esc   Debug: ~\n\n" +
  "Coloured dots are items; purple dots are clues.\n" +
  "Red-tinted doors are locked. The salt-blue room is safe.\n" +
  "Keep moving and keep a candle lit — the dark draws the entity.";

/* =================================================================
   New game / continue
   ================================================================= */
function newGame() {
  GAME.seed = (Math.random() * 0x7fffffff) | 0;
  GAME.night = 1;
  GAME.caughtCount = 0;
  GAME.gameOver = false;
  GAME.storyFlags = { maxNight: 1 };
  GAME.log = [];
  GAME.player = Player.create();
  GAME.entity = null;
  UI.showScreen("game");
  startNight();
}

function continueGame() {
  const snap = Save.load();
  if (!snap) { newGame(); return; }
  GAME.seed = snap.seed;
  GAME.night = snap.night;
  GAME.time = snap.time;
  GAME.timePhase = snap.timePhase;
  GAME.turn = snap.turn;
  GAME.caughtCount = snap.caughtCount;
  GAME.storyFlags = snap.storyFlags || {};
  GAME.flags = snap.flags || freshFlags();
  GAME.player = snap.player;
  GAME.entity = snap.entity;
  GAME.mansion = snap.mansion;
  GAME.log = snap.log || [];
  GAME.gameOver = false;
  GAME.rng = makeRNG(GAME.seed + GAME.night * 7919 + GAME.turn + 1);
  GAME.fx = { damage: false, shake: false, pulse: false };
  UI.showScreen("game");
  UI.renderLog(GAME);
  UI.refresh(GAME);
}

function freshFlags() {
  return { cluesThisNight: 0, foundRusted: false, enteredBasement: false, reachedFinal: false };
}

/* =================================================================
   Night lifecycle
   ================================================================= */
function startNight() {
  GAME.rng = makeRNG(GAME.seed + GAME.night * 7919 + 13);
  GAME.time = 0;
  GAME.turn = 0;
  GAME.timePhase = CONFIG.PHASES[0].name;
  GAME.flags = freshFlags();
  GAME.gameOver = false;
  GAME.fx = { damage: false, shake: false, pulse: false };

  // per-night resets on the player (story progress is kept)
  GAME.player.keys = { small: 0, rusted: 0, silver: 0 };
  GAME.player.candleTurns = 0;
  GAME.player.fear = 0;
  GAME.player.hiding = false;
  GAME.player.visitedRooms = [];

  GAME.storyFlags.maxNight = Math.max(GAME.storyFlags.maxNight || 1, GAME.night);

  Generation.generate(GAME);
  onEnterRoom(GAME.mansion.rooms[GAME.player.currentRoomId], { initial: true });

  GAME.busy = false;
  UI.log(GAME, NIGHT_INTRO[GAME.night] || "The mansion waits.", "story");
  UI.log(GAME, "Objective: " + OBJECTIVES[GAME.night].text, "system");
  UI.phaseHint("Night " + GAME.night);

  Save.save(GAME);
  refreshContinueButton();
  UI.refresh(GAME);
}

function endNight() {
  GAME.busy = true;
  UI.hideNote();
  Save.save(GAME);

  const lines = GAME.rng.shuffle([
    "Walls slide past one another in the dark.",
    "A door you remember is simply gone.",
    "Distant footsteps circle, then fade.",
    "The corridors fold like the pleats of a sleeve.",
    "Something rearranges the rooms while you cannot watch.",
    "The house exhales, and settles into a new shape.",
  ]).slice(0, 4);

  UI.showTransition(["The mansion shifts around you…", ...lines], () => {
    if (GAME.night >= CONFIG.TOTAL_NIGHTS) {
      // shouldn't normally happen (night 5 doesn't time-out), safety net
      GAME.busy = false;
      return;
    }
    GAME.night++;
    recoverBetweenNights();
    startNight();
  });
}

function recoverBetweenNights() {
  const p = GAME.player;
  p.health = clamp(p.health + CONFIG.NIGHT_RECOVER_HEALTH, 0, 100);
  p.sanity = clamp(p.sanity + CONFIG.NIGHT_RECOVER_SANITY, 0, 100);
}

/* =================================================================
   Entering a room
   ================================================================= */
function onEnterRoom(room, opts = {}) {
  const p = GAME.player;
  room.visited = true;
  if (!p.visitedRooms.includes(room.id)) p.visitedRooms.push(room.id);
  Generation.markKnown(GAME.mansion, room.id);

  if (opts.initial) return; // spawn: no effects/events

  if (room.type === "safe") {
    p.fear = clamp(p.fear - CONFIG.SAFE_FEAR_RECOVER, 0, 100);
    p.sanity = clamp(p.sanity + CONFIG.SAFE_SANITY_RECOVER, 0, 100);
    UI.log(GAME, "A Safe Room. The weight of the house lifts from your shoulders.", "safe");
    Save.save(GAME); // autosave on reaching safety
  } else if (room.cursed) {
    p.sanity = clamp(p.sanity - 5, 0, 100);
    p.fear = clamp(p.fear + 8, 0, 100);
    UI.log(GAME, "This place is wrong. Your skin crawls.", "danger");
  }

  if (room.type === "basement" && !GAME.flags.enteredBasement) {
    GAME.flags.enteredBasement = true;
    UI.log(GAME, "You descend into the Basement. The ritual stones still hum with warmth.", "story");
  }

  if (room.clue) UI.log(GAME, "A note or page rests here. (press E to read)", "clue");
  if (room.items.length) UI.log(GAME, "Something glints in the gloom. (press E to take)", "item");

  if ((room.light === "dark" || room.light === "pitch") && p.candleTurns <= 0) {
    Entity.lure(GAME, 0.05); // the dark draws it
  }

  maybeEvent(GAME, "enter");
}

/* =================================================================
   The turn pipeline — every action ends here
   ================================================================= */
function takeTurn(cost) {
  if (GAME.gameOver) return;
  GAME.turn++;
  GAME.time = clamp(GAME.time + cost, 0, CONFIG.TIME_MAX);

  applyPassive();

  Entity.update(GAME);

  // delayed fear (e.g. laudanum aftermath)
  if (GAME.player.pendingFear > 0) {
    const f = Math.min(GAME.player.pendingFear, 5);
    GAME.player.fear = clamp(GAME.player.fear + f, 0, 100);
    GAME.player.pendingFear -= f;
  }

  updatePhase();
  GAME.player.hiding = false; // hiding only protects the turn it was used

  if (checkEnd()) return;

  if (GAME.night < CONFIG.TOTAL_NIGHTS && GAME.time >= CONFIG.TIME_MAX) {
    endNight();
    return;
  }

  UI.refresh(GAME);
}

/** Environmental pressure based on the room the player now stands in. */
function applyPassive() {
  const p = GAME.player;
  const room = GAME.mansion.rooms[p.currentRoomId];
  const lit = p.candleTurns > 0;

  if (room.type === "safe") {
    p.fear = clamp(p.fear - CONFIG.LIT_FEAR_RECOVER, 0, 100);
  } else if (room.light === "pitch" && !lit) {
    p.fear = clamp(p.fear + CONFIG.PITCH_FEAR, 0, 100);
    p.sanity = clamp(p.sanity - CONFIG.PITCH_SANITY, 0, 100);
  } else if (room.light === "dark" && !lit) {
    p.fear = clamp(p.fear + CONFIG.DARK_FEAR, 0, 100);
    p.sanity = clamp(p.sanity - CONFIG.DARK_SANITY, 0, 100);
  } else {
    p.fear = clamp(p.fear - CONFIG.LIT_FEAR_RECOVER, 0, 100);
  }
}

function updatePhase() {
  let phase = CONFIG.PHASES[0].name;
  for (const p of CONFIG.PHASES) if (GAME.time >= p.t) phase = p.name;
  if (phase !== GAME.timePhase) {
    GAME.timePhase = phase;
    UI.phaseHint(phase);
    UI.log(GAME, "The hour deepens — " + phase + ".", "story");
    maybeEvent(GAME, "phase");
  }
}

function checkEnd() {
  const p = GAME.player;
  if (p.health <= 0) { gameOver("death"); return true; }
  if (p.sanity <= 0) { gameOver("madness"); return true; }
  if (GAME.caughtCount >= CONFIG.MAX_CATCHES) { gameOver("caught"); return true; }
  return false;
}

/* =================================================================
   Random events
   ================================================================= */
function maybeEvent(g, context) {
  const phaseIdx = Math.max(0, CONFIG.PHASES.findIndex((p) => p.name === g.timePhase));
  let chance;
  if (context === "phase") chance = 0.6;
  else if (context === "search") chance = 0.35;
  else chance = 0.16 + g.night * 0.025 + phaseIdx * 0.03;
  if (!g.rng.chance(chance)) return;

  const eligible = EVENTS.filter((ev) => ev.condition(g));
  if (!eligible.length) return;
  const ev = g.rng.weighted(eligible);
  const msg = ev.effect(g);
  if (msg) UI.log(g, msg, eventType(ev));
  if (ev.reward === "item") {
    const id = g.rng.pick(["candle", "matches", "medicine", "laudanum", "coin", "map_fragment"]);
    Player.pickup(g.player, id);
    UI.log(g, "Inside: a " + ITEMS[id].name + ".", "item");
  }
}

/* =================================================================
   Player actions
   ================================================================= */
function actionsAllowed() {
  return GAME.screen === "game" && !GAME.busy && !GAME.gameOver &&
    document.getElementById("note-overlay").classList.contains("hidden") &&
    document.getElementById("pause-overlay").classList.contains("hidden");
}

function tryMove(dir, sprint) {
  if (!actionsAllowed()) return;
  const rooms = GAME.mansion.rooms;
  const room = rooms[GAME.player.currentRoomId];
  const nid = room.doors[dir];
  if (!nid) { UI.log(GAME, "A wall blocks your way.", "system"); UI.refresh(GAME); return; }

  const target = rooms[nid];
  if (target.type === "final") { enterFinal(); return; }

  if (target.locked) {
    const lt = target.lockType;
    if (lt === "clue") { UI.log(GAME, "It's sealed by something other than a lock.", "warn"); return; }
    if (Player.hasKey(GAME.player, lt)) {
      Player.useKey(GAME.player, lt);
      target.locked = false;
      UI.log(GAME, `The ${lt} key turns in the lock. The door opens.`, "item");
    } else {
      UI.log(GAME, `That door is locked. You need a ${lt} key.`, "warn");
      GAME.player.fear = clamp(GAME.player.fear + 3, 0, 100);
      UI.refresh(GAME);
      return;
    }
  }

  GAME.player.currentRoomId = nid;
  if (GAME.player.candleTurns > 0) GAME.player.candleTurns--;
  if (sprint) {
    GAME.player.fear = clamp(GAME.player.fear + 8, 0, 100);
    Entity.lure(GAME, 0.12);
  }
  onEnterRoom(target, {});
  takeTurn(sprint ? CONFIG.TIME_COST.sprint : CONFIG.TIME_COST.move);
}

/** Context-sensitive E: take items, else read a note, else search. */
function interact() {
  if (!actionsAllowed()) return;
  const room = GAME.mansion.rooms[GAME.player.currentRoomId];
  if (room.items.length) pickupAll();
  else if (room.clue) readClue();
  else search();
}

function pickupAll() {
  if (!actionsAllowed()) return;
  const room = GAME.mansion.rooms[GAME.player.currentRoomId];
  if (!room.items.length) return;
  for (const id of room.items) {
    const name = Player.pickup(GAME.player, id);
    UI.log(GAME, "You take: " + name + ".", "item");
    if (id === "rusted_key") GAME.flags.foundRusted = true;
    if (id === "mirror_shard" || id === "basement_emblem") {
      UI.log(GAME, "The house notices. Something turns toward you.", "danger");
      Entity.provoke(GAME, 0.16);
    }
  }
  room.items = [];
  UI.refresh(GAME);
}

function readClue() {
  if (!actionsAllowed()) return;
  const room = GAME.mansion.rooms[GAME.player.currentRoomId];
  if (!room.clue) return;
  const c = clueById(room.clue);
  if (c && !GAME.player.clues.includes(c.id)) {
    GAME.player.clues.push(c.id);
    GAME.flags.cluesThisNight++;
    GAME.player.sanity = clamp(GAME.player.sanity - 4, 0, 100);
    UI.log(GAME, "You found a clue: " + c.title + ".", "clue");
    UI.showNote(c.title, c.text);
    if (c.important) Entity.provoke(GAME, 0.1); // the truth attracts it
    Save.save(GAME); // autosave on clue
    refreshContinueButton();
  }
  room.clue = null;
  takeTurn(CONFIG.TIME_COST.read);
}

function search() {
  if (!actionsAllowed()) return;
  const room = GAME.mansion.rooms[GAME.player.currentRoomId];
  if (room.searched) { UI.log(GAME, "You've already searched here.", "system"); return; }
  room.searched = true;
  Entity.lure(GAME, 0.08); // rummaging makes noise

  const roll = GAME.rng.next();
  if (roll < 0.4) {
    const id = GAME.rng.pick(["candle", "matches", "medicine", "coin", "map_fragment", "laudanum", "small_key"]);
    Player.pickup(GAME.player, id);
    UI.log(GAME, "Hidden away, you find a " + ITEMS[id].name + ".", "item");
  } else if (roll < 0.58) {
    maybeEvent(GAME, "search");
  } else {
    UI.log(GAME, "You search, but find nothing of use.", "system");
  }
  takeTurn(CONFIG.TIME_COST.search);
}

function hide() {
  if (!actionsAllowed()) return;
  if (GAME.player.fear > 75 && GAME.rng.chance(0.5)) {
    UI.log(GAME, "You try to hide, but your heart pounds too loudly to stay still.", "warn");
  } else {
    GAME.player.hiding = true;
    UI.log(GAME, "You press into the shadows and go perfectly still.", "system");
  }
  takeTurn(CONFIG.TIME_COST.hide);
}

function rest() {
  if (!actionsAllowed()) return;
  const room = GAME.mansion.rooms[GAME.player.currentRoomId];
  if (room.type !== "safe") { UI.log(GAME, "You can only rest where the house cannot reach.", "warn"); return; }
  GAME.player.fear = clamp(GAME.player.fear - 30, 0, 100);
  GAME.player.sanity = clamp(GAME.player.sanity + 6, 0, 100);
  GAME.player.health = clamp(GAME.player.health + 3, 0, 100);
  UI.log(GAME, "You rest. For a while, you remember who you are.", "safe");
  Save.save(GAME);
  takeTurn(CONFIG.TIME_COST.rest);
}

function wait() {
  if (!actionsAllowed()) return;
  UI.log(GAME, "You wait. The house waits with you.", "system");
  takeTurn(CONFIG.TIME_COST.wait);
}

/* ---- using items ----------------------------------------------- */
function useItem(id) {
  if (!actionsAllowed()) return;
  const p = GAME.player;
  if (!Player.hasItem(p, id)) return;

  switch (id) {
    case "candle":
      if (!Player.hasItem(p, "matches")) { UI.log(GAME, "You need matches to light the candle.", "warn"); return; }
      Player.removeItem(p, "matches");
      Player.removeItem(p, "candle");
      p.candleTurns += CONFIG.CANDLE_DURATION;
      p.fear = clamp(p.fear - 10, 0, 100);
      UI.log(GAME, "You light a candle. The dark draws back a little.", "item");
      break;
    case "matches":
      UI.log(GAME, "Matches are for lighting candles.", "system");
      return;
    case "medicine":
      Player.removeItem(p, "medicine");
      p.health = clamp(p.health + 30, 0, 100);
      UI.log(GAME, "The medicine steadies you. (+30 health)", "item");
      break;
    case "laudanum":
      Player.removeItem(p, "laudanum");
      p.sanity = clamp(p.sanity + 25, 0, 100);
      p.pendingFear += 18;
      UI.log(GAME, "The laudanum calms your mind — the dread will return, worse.", "item");
      break;
    case "map_fragment":
      Player.removeItem(p, "map_fragment");
      revealNearby(2);
      UI.log(GAME, "The old map fragment reveals the rooms nearby.", "item");
      break;
    case "coin":
      Player.removeItem(p, "coin");
      p.sanity = clamp(p.sanity + 5, 0, 100);
      UI.log(GAME, "The strange coin warms in your palm. You feel briefly grounded.", "item");
      break;
    case "music_box":
      Player.removeItem(p, "music_box");
      GAME.entity.state = "retreating";
      GAME.entity.cooldown = CONFIG.ENTITY_COOLDOWN + 1;
      GAME.entity.lure = 0;
      UI.log(GAME, "The music box plays. Somewhere, something turns and drifts away.", "item");
      break;
    case "crowbar": {
      const opened = forceAdjacentDoor();
      if (!opened) { UI.log(GAME, "There's nothing here to pry open.", "system"); return; }
      break;
    }
    default:
      UI.log(GAME, "You can't use that right now.", "system");
      return;
  }
  takeTurn(CONFIG.TIME_COST.use);
}

function revealNearby(depth) {
  const rooms = GAME.mansion.rooms;
  const dist = Generation.distances(rooms, GAME.player.currentRoomId);
  for (const id in rooms) {
    if (dist[id] !== undefined && dist[id] <= depth) rooms[id].known = true;
  }
}

/** Crowbar: pry open an adjacent small-locked door. */
function forceAdjacentDoor() {
  const rooms = GAME.mansion.rooms;
  const room = rooms[GAME.player.currentRoomId];
  for (const dir of Object.keys(room.doors)) {
    const n = rooms[room.doors[dir]];
    if (n && n.locked && n.lockType === "small") {
      n.locked = false;
      Player.removeItem(GAME.player, "crowbar");
      UI.log(GAME, "You wedge the crowbar in and force the door with a crack of old wood.", "item");
      Entity.lure(GAME, 0.1);
      return true;
    }
  }
  return false;
}

/* =================================================================
   Final room & endings
   ================================================================= */
function enterFinal() {
  const fid = GAME.mansion.finalId;
  if (!fid) { UI.log(GAME, "There is no final room tonight.", "system"); return; }
  const rooms = GAME.mansion.rooms;
  const p = GAME.player;

  if (p.currentRoomId === fid) { evaluateEnding(); return; }

  const adj = Object.values(rooms[p.currentRoomId].doors).includes(fid);
  if (!adj) { UI.log(GAME, "The final room is not nearby.", "system"); return; }

  const imp = importantClueCount(p);
  if (imp < CONFIG.FINAL_ROOM_OPEN_REQ) {
    UI.log(GAME, `The door resists you. You need more of the truth first. (${imp}/${CONFIG.FINAL_ROOM_OPEN_REQ} key clues)`, "warn");
    return;
  }

  rooms[fid].locked = false;
  p.currentRoomId = fid;
  if (p.candleTurns > 0) p.candleTurns--;
  onEnterRoom(rooms[fid], {});
  GAME.flags.reachedFinal = true;
  UI.refresh(GAME);
  evaluateEnding();
}

function evaluateEnding() {
  const p = GAME.player;
  const imp = importantClueCount(p);
  const shard = Player.hasItem(p, "mirror_shard");
  const emblem = Player.hasItem(p, "basement_emblem");

  let title, text;
  if (imp >= CONFIG.TRUE_ENDING_REQ && shard && emblem) {
    title = "The House Remembers";
    text = "You set the Basement Emblem into the stones and raise the Mirror Shard to the glass at the room's heart. " +
      "The mirror shows them all — the father, the mother, the children — faces pressed to the inside of the world. " +
      "You break it. Every door in the house opens at once. The bound finally leave, and as they go they look back at you, grateful, fading. " +
      "The mansion, with nothing left to remember, lets you walk out the front door into a grey and ordinary dawn. " +
      "The curse is broken. The house remembers nothing now — not even you.";
  } else if (imp >= CONFIG.NORMAL_ENDING_REQ) {
    title = "The Door Opens";
    text = "You understand enough. The final door swings wide and beyond it, impossibly, is the night air and the gate. " +
      "You run, and the house lets you. But you did not free what was kept here. " +
      "Behind you the windows fill with pale, watching faces. The mansion still stands, and still remembers. You escaped. They did not.";
  } else {
    title = "You Left Something Behind";
    text = "You stumble through the opened door and out into the dark, alive, breathing, free. " +
      "But you never learned what this place was, or who. Some nights now, in any house, you hear walls settle and you stop, certain " +
      "that if you turned a corner you would be back in the Entrance Hall, and the door would have no handle. The mansion is still calling. Part of you answers.";
  }
  showEnding(title, text);
}

function showEnding(title, text) {
  GAME.gameOver = true;
  document.getElementById("ending-title").textContent = title;
  document.getElementById("ending-text").textContent = text;
  fillStats("ending-stats");
  Save.clear();
  refreshContinueButton();
  UI.showScreen("ending");
}

function gameOver(cause) {
  GAME.gameOver = true;
  const info = {
    death: { title: "Taken by the House", text: "Your body gave out in the dark. The mansion folds you into its walls, another draft, another creak in the floor." },
    madness: { title: "A Room With Your Name", text: "You no longer know whether you escaped or became part of the house. There is a new room now, and it is yours, and it is waiting." },
    caught: { title: "Taken by the House", text: "It found you one time too many. The last thing you feel is the house breathing you in." },
  }[cause] || { title: "Lost to the House", text: "The mansion keeps what it takes." };

  document.getElementById("gameover-title").textContent = info.title;
  document.getElementById("gameover-cause").textContent = info.text;
  fillStats("gameover-stats");
  Save.clear();
  refreshContinueButton();
  UI.showScreen("gameover");
}

function fillStats(elId) {
  const p = GAME.player;
  const ul = document.getElementById(elId);
  const stats = [
    ["Nights survived", (GAME.storyFlags.maxNight || GAME.night) + " / " + CONFIG.TOTAL_NIGHTS],
    ["Clues found", p.clues.length + " / " + CLUES.length],
    ["Important clues", importantClueCount(p)],
    ["Times caught", GAME.caughtCount],
    ["Mirror Shard", Player.hasItem(p, "mirror_shard") ? "yes" : "no"],
    ["Basement Emblem", Player.hasItem(p, "basement_emblem") ? "yes" : "no"],
  ];
  ul.innerHTML = stats.map(([k, v]) => `<li>${k}: <span>${v}</span></li>`).join("");
}

/* =================================================================
   Input handling
   ================================================================= */
let lastMove = 0;

function bindGameInput() {
  window.addEventListener("keydown", onKeyDown);
}

function onKeyDown(e) {
  // overlays: allow closing the note with E/Esc/Enter
  const noteOpen = !document.getElementById("note-overlay").classList.contains("hidden");
  if (noteOpen) {
    if (["Escape", "Enter", "e", "E", " "].includes(e.key)) { UI.hideNote(); e.preventDefault(); }
    return;
  }

  // debug toggle works anywhere in-game
  if (e.key === "~" || e.key === "`") {
    if (GAME.screen === "game" || GAME.player) UI.toggleDebug(GAME);
    return;
  }

  if (e.key === "Escape") {
    if (GAME.screen === "game" && !GAME.gameOver) { togglePause(); e.preventDefault(); }
    return;
  }

  if (GAME.screen !== "game" || GAME.gameOver) return;
  const pauseOpen = !document.getElementById("pause-overlay").classList.contains("hidden");
  if (pauseOpen) return;

  const key = e.key.toLowerCase();
  const sprint = e.shiftKey;

  const moves = {
    w: "north", arrowup: "north",
    s: "south", arrowdown: "south",
    a: "west", arrowleft: "west",
    d: "east", arrowright: "east",
  };

  if (moves[key]) {
    e.preventDefault();
    const now = performance.now();
    if (now - lastMove < 110) return; // throttle held keys
    lastMove = now;
    tryMove(moves[key], sprint);
    return;
  }

  switch (key) {
    case "e": e.preventDefault(); interact(); break;
    case " ": e.preventDefault(); wait(); break;
    case "i": e.preventDefault(); flashPanel("inventory-list"); break;
    case "m": e.preventDefault(); UI.showNote("Controls & Map", CONTROLS_TEXT); break;
    case "h": hide(); break;
    case "r": rest(); break;
  }
}

function flashPanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.transition = "box-shadow .2s";
  el.style.boxShadow = "0 0 0 2px #d8b65a inset";
  setTimeout(() => (el.style.boxShadow = ""), 250);
}

function togglePause() {
  const overlay = document.getElementById("pause-overlay");
  overlay.classList.toggle("hidden");
}

/* GAME.screen is derived from which screen is active — keep it in sync */
function syncScreen() {
  const active = document.querySelector(".screen.active");
  GAME.screen = active ? active.id.replace("screen-", "") : "menu";
}

/* =================================================================
   Debug actions (visible only with debug mode on)
   ================================================================= */
function debugAction(kind) {
  if (!GAME.player) return;
  switch (kind) {
    case "key": Player.addKey(GAME.player, "small"); Player.addKey(GAME.player, "rusted"); Player.addKey(GAME.player, "silver"); break;
    case "clue": {
      const found = new Set(GAME.player.clues);
      const c = CLUES.find((x) => !found.has(x.id));
      if (c) { GAME.player.clues.push(c.id); GAME.flags.cluesThisNight++; }
      break;
    }
    case "damage": GAME.player.health = clamp(GAME.player.health - 20, 0, 100); break;
    case "sanity": GAME.player.sanity = clamp(GAME.player.sanity - 20, 0, 100); break;
    case "night": if (GAME.night < CONFIG.TOTAL_NIGHTS) endNight(); break;
    case "hunt": Entity.provoke(GAME, 0.4); GAME.entity.state = "hunting"; break;
  }
  if (!checkEnd()) UI.refresh(GAME);
}

/* =================================================================
   Render loop (visuals only — game logic is turn-based)
   ================================================================= */
function startRenderLoop() {
  function frame(t) {
    syncScreen();
    if (GAME.screen === "game" && GAME.mansion) {
      Render.draw(GAME, t);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* Public surface used by the UI interaction buttons. */
const Main = {
  enterFinal, pickupAll, readClue, search, rest, hide, wait, useItem, interact,
};

/* boot */
window.addEventListener("DOMContentLoaded", init);
