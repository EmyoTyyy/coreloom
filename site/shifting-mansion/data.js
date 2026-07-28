/* =================================================================
   data.js — static game data & tunable balance constants
   -----------------------------------------------------------------
   ROOM_TYPES, ITEMS, CLUES, EVENTS, OBJECTIVES and CONFIG.
   Keeping the numbers in one place makes balancing easy.
   ================================================================= */

/* ---------------- Balance / config -------------------------------- */
const CONFIG = {
  TOTAL_NIGHTS: 5,
  START_HEALTH: 100,
  START_SANITY: 100,
  MAX: 100, // generic stat ceiling

  TIME_MAX: 100, // night ends when time reaches this
  // time cost per action
  TIME_COST: { move: 2, sprint: 1, search: 5, read: 3, rest: 8, hide: 4, wait: 5, use: 1, open: 1 },

  // phases keyed by time threshold (must be ascending)
  PHASES: [
    { name: "Early Night", t: 0 },
    { name: "Midnight", t: 25 },
    { name: "Witching Hour", t: 50 },
    { name: "Dawn Approaches", t: 75 },
  ],

  ROOMS_BY_NIGHT: [18, 20, 22, 24, 25], // index = night-1
  LOCKED_SMALL_BY_NIGHT: [1, 2, 2, 3, 3], // extra small-locked rooms / night
  SPECIALS_BY_NIGHT: [3, 4, 5, 6, 6],
  CLUES_PER_NIGHT: 4,
  CANDLE_DURATION: 6, // room transitions a candle lasts

  // clue gates
  FINAL_ROOM_OPEN_REQ: 3, // important clues needed to open the final door
  NORMAL_ENDING_REQ: 5, // important clues for normal ending
  TRUE_ENDING_REQ: 8, // important clues for true ending (+ items)
  FAMILY_CLUE_GOAL: 3, // night 3 objective

  MAX_CATCHES: 5, // entity catches before "taken by the house"
  SANITY_LOW: 30, // below this, hallucinations begin

  // entity base aggression by night (chance to act each turn)
  ENTITY_AGGRO_BY_NIGHT: [0.14, 0.24, 0.36, 0.5, 0.66],
  ENTITY_ATTACK_HP: [10, 14, 18, 22, 26], // damage by night
  ENTITY_ATTACK_SAN: [8, 10, 12, 14, 16],
  ENTITY_COOLDOWN: 4, // turns it retreats after an attack

  // darkness visibility radius in canvas px
  LIGHT_RADIUS: { bright: 540, dim: 350, dark: 215, pitch: 135 },

  // per-turn passive effects
  DARK_FEAR: 4,
  DARK_SANITY: 1.5,
  PITCH_FEAR: 7,
  PITCH_SANITY: 3,
  LIT_FEAR_RECOVER: 3,
  SAFE_FEAR_RECOVER: 18,
  SAFE_SANITY_RECOVER: 4,

  NIGHT_RECOVER_HEALTH: 8, // restored when surviving to the next night
  NIGHT_RECOVER_SANITY: 16,
};

/* ---------------- Room types -------------------------------------- */
/* light: bright | dim | dark | pitch
   cursed: drains sanity when entered
   category: used by the generator                                    */
const ROOM_TYPES = {
  entrance: {
    name: "Entrance Hall", light: "dim", danger: 0, cursed: false, category: "start",
    desc: [
      "A grand staircase rises into darkness. The front door has no handle on this side.",
      "Dust hangs in the cold air. Your footprints are the only ones in decades of grime.",
    ],
  },
  safe: {
    name: "Safe Room", light: "bright", danger: 0, cursed: false, category: "safe",
    desc: [
      "Salt has been poured in a circle here. For now, the house cannot reach you.",
      "A single lantern refuses to die. The walls feel solid, honest, still.",
    ],
  },
  corridor: {
    name: "Corridor", light: "dark", danger: 1, cursed: false, category: "common", weight: 5,
    desc: [
      "A long hallway lined with doors that don't always lead where they should.",
      "The wallpaper peels in long curls, like skin from a wound.",
    ],
  },
  library: {
    name: "Library", light: "dim", danger: 1, cursed: false, category: "common", weight: 2,
    desc: [
      "Dusty shelves lean under the weight of books no one has touched in decades.",
      "A ladder rolls by itself across a wall of rotten books.",
      "The smell of wet paper fills the air.",
    ],
  },
  dining: {
    name: "Dining Room", light: "dim", danger: 1, cursed: false, category: "common", weight: 2,
    desc: [
      "A long table set for a dinner that was never eaten. The food is gone, the plates remain.",
      "Chairs are arranged as if guests just stood and left mid-sentence.",
    ],
  },
  kitchen: {
    name: "Kitchen", light: "dim", danger: 1, cursed: false, category: "common", weight: 2,
    desc: [
      "Knives hang in a neat row. One is missing. The block remembers it.",
      "Something boiled dry on the stove long ago and left a black, glassy crust.",
    ],
  },
  bedroom: {
    name: "Bedroom", light: "dark", danger: 1, cursed: false, category: "common", weight: 3,
    desc: [
      "The bed is made too perfectly, as if waiting for someone to lie down forever.",
      "A child's shoes sit by the door, far too small for this large room.",
    ],
  },
  bathroom: {
    name: "Bathroom", light: "dark", danger: 1, cursed: false, category: "common", weight: 2,
    desc: [
      "The mirror is fogged though the air is freezing. Words have been wiped away.",
      "Rust-coloured water rings the tub. The tap drips in a slow, deliberate rhythm.",
    ],
  },
  storage: {
    name: "Storage Room", light: "dark", danger: 1, cursed: false, category: "common", weight: 2,
    desc: [
      "Crates and sheeted furniture loom like sleeping animals.",
      "Boxes stacked to the ceiling, each labelled in a hand that shook while writing.",
    ],
  },
  study: {
    name: "Study", light: "dim", danger: 1, cursed: false, category: "common", weight: 2,
    desc: [
      "A heavy desk faces the wall, not the window. Papers are scattered everywhere.",
      "An inkwell has dried mid-letter. The chair is still warm — or you imagine it is.",
    ],
  },
  gallery: {
    name: "Gallery", light: "dark", danger: 2, cursed: false, category: "common", weight: 2,
    desc: [
      "Portraits line both walls. Their eyes are all turned toward the same corner.",
      "Every painting shows the same family, aging wrong, in the wrong order.",
    ],
  },
  music_room: {
    name: "Music Room", light: "dim", danger: 1, cursed: false, category: "common", weight: 1,
    desc: [
      "A grand piano sits open. A single key depresses on its own as you enter.",
      "Sheet music covers the floor, every page the same six notes, over and over.",
    ],
  },
  master_bedroom: {
    name: "Master Bedroom", light: "dark", danger: 2, cursed: false, category: "special", weight: 1,
    desc: [
      "A four-poster bed draped in moth-eaten velvet. The headboard is carved with faces.",
      "Two indents remain in the mattress, side by side, as if the sleepers never rose.",
    ],
  },
  chapel: {
    name: "Chapel", light: "dim", danger: 2, cursed: true, category: "special", weight: 1,
    desc: [
      "A private chapel, the altar scratched with symbols no priest would bless.",
      "Candles burn low here, though no one has lit them. The air tastes of iron.",
    ],
  },
  observatory: {
    name: "Observatory", light: "dark", danger: 2, cursed: false, category: "special", weight: 1,
    desc: [
      "A brass telescope points not at the sky but down, into the house itself.",
      "Star charts cover the dome, marking dates that have not yet come.",
    ],
  },
  nursery: {
    name: "Nursery", light: "dark", danger: 2, cursed: true, category: "special", weight: 1,
    desc: [
      "A cradle rocks gently. There is no draft, and nothing inside.",
      "Toys are arranged in a circle on the floor, all facing inward, waiting.",
    ],
  },
  locked_office: {
    name: "Locked Office", light: "dark", danger: 2, cursed: false, category: "special", weight: 1,
    lockType: "silver",
    desc: [
      "The architect's office, sealed with a silver lock. Blueprints cover every surface.",
      "A drafting table holds a plan of the house that keeps redrawing itself.",
    ],
  },
  secret: {
    name: "Secret Room", light: "pitch", danger: 3, cursed: true, category: "special", weight: 1,
    lockType: "small",
    desc: [
      "A hidden room behind the panelling. It was never meant to be found.",
      "The walls are covered in tally marks. Thousands of them. Then they stop.",
    ],
  },
  mirror: {
    name: "Mirror Room", light: "dark", danger: 3, cursed: true, category: "special", weight: 1,
    desc: [
      "Mirrors on every wall. Your reflection is a half-second too slow.",
      "A thousand of you stare back. One of them is smiling. You are not.",
    ],
  },
  basement_stairs: {
    name: "Basement Stairs", light: "dark", danger: 2, cursed: false, category: "special", weight: 1,
    desc: [
      "Stone steps descend into a cold that has weight. Something exhales below.",
      "The handrail is worn smooth by hands that went down and never came up.",
    ],
  },
  basement: {
    name: "Basement", light: "pitch", danger: 3, cursed: true, category: "basement",
    lockType: "rusted",
    desc: [
      "The foundation of the house — and of whatever was done to make it.",
      "Earthen walls close in. At the centre, a ring of stones still warm to the touch.",
    ],
  },
  final: {
    name: "The Final Room", light: "dark", danger: 3, cursed: true, category: "final",
    lockType: "clue",
    desc: [
      "A door that wasn't here before. Behind it, the truth has been waiting for you.",
      "The room at the centre of every blueprint. The room the house was built around.",
    ],
  },
};

/* ---------------- Items ------------------------------------------- */
/* type: key | consumable | story
   color: canvas/inventory swatch                                     */
const ITEMS = {
  small_key:   { name: "Small Key",      type: "key",        keyType: "small",  color: "#c2a85e", desc: "Opens a basic locked door. Consumed on use." },
  rusted_key:  { name: "Rusted Key",     type: "key",        keyType: "rusted", color: "#8a6b4a", desc: "Old iron. Fits the basement and other ancient locks." },
  silver_key:  { name: "Silver Key",     type: "key",        keyType: "silver", color: "#c8d0d8", desc: "Cold and heavy. Opens important, sealed rooms." },
  candle:      { name: "Candle",         type: "consumable", color: "#e8c45a", desc: "Light it (needs matches) to widen your sight and calm your nerves." },
  matches:     { name: "Matches",        type: "consumable", color: "#d98b4a", desc: "A few dry matches. Used to light candles." },
  medicine:    { name: "Medicine",       type: "consumable", color: "#5aa86a", desc: "Restores 30 health." },
  laudanum:    { name: "Laudanum",       type: "consumable", color: "#7a5aa8", desc: "Restores sanity, but the fear returns later, worse." },
  map_fragment:{ name: "Old Map Fragment", type: "consumable", color: "#6a8ab0", desc: "Reveals nearby rooms on the map." },
  coin:        { name: "Strange Coin",   type: "consumable", color: "#c9a227", desc: "A coin from no nation. It hums faintly. Used for secrets." },
  music_box:   { name: "Music Box",      type: "consumable", color: "#a05a8a", desc: "Wind it to lure the entity away — once." },
  crowbar:     { name: "Crowbar",        type: "consumable", color: "#9a9a9a", desc: "Pry open a door blocked by debris." },
  mirror_shard:{ name: "Mirror Shard",   type: "story",      color: "#9ad0e0", desc: "A shard that reflects a room you have never been in. Key to the curse." },
  basement_emblem:{ name: "Basement Emblem", type: "story",  color: "#b03a3a", desc: "A heavy iron emblem prised from the ritual stones." },
};

/* ---------------- Clues / story ----------------------------------- */
/* night: which night it belongs to (placement priority)
   important: counts toward ending thresholds
   family: counts toward night-3 objective                            */
const CLUES = [
  { id: "architects_note", title: "The Architect's Note", night: 1, important: true, family: false, summary: "The house was designed to move.",
    text: "I have built it as he asked. The walls are hinged where no eye can see; the corridors fold at night like the pleats of a sleeve. He calls it 'a house that breathes.' God forgive me, I think it is alive." },
  { id: "servants_warning", title: "Servant's Warning", night: 1, important: true, family: false, summary: "Don't stand still in the dark.",
    text: "To whoever reads this: do not stop in the dark rooms. It cannot see you if you keep moving and keep the candles lit. It is drawn to fear like a moth to flame. I am leaving tonight. I pray the doors let me." },
  { id: "daughters_diary", title: "The Daughter's Diary", night: 2, important: true, family: true, summary: "A family lived here once.",
    text: "Father says we must never leave, that the house keeps us safe and whole. Mother stopped speaking last winter. My brother's room is gone again this morning. I drew a map so I could find my way back to myself." },
  { id: "house_deed", title: "The House Deed", night: 2, important: false, family: false, summary: "The land was bought cheap, for a reason.",
    text: "Deed of sale: the parcel known locally as the Hollow was sold for a single coin, the previous owners 'eager to be rid of it.' A clause, struck through in red ink: 'the buyer accepts what sleeps beneath.'" },
  { id: "burned_portrait", title: "Burned Family Portrait", night: 3, important: true, family: true, summary: "Five faces, one burned away.",
    text: "A family portrait, the frame intact, the canvas scorched. Five figures stood here. The fifth has been burned out entirely, down to the wall behind. Someone did this carefully, leaving the others untouched." },
  { id: "ritual_sketch", title: "Basement Ritual Sketch", night: 3, important: true, family: false, requiredForTrueEnding: true, summary: "A diagram of the ritual below.",
    text: "A diagram of a circle of stones, a mirror at its heart. Notes in the margin: 'to bind a soul to the foundation is to make the house remember it forever. The mirror holds the door. Break the mirror, free the bound.'" },
  { id: "last_dinner", title: "The Last Dinner Menu", night: 3, important: true, family: true, summary: "Their final meal together.",
    text: "A menu, handwritten, dated the night everything stopped. Six courses. At the bottom, in a child's hand: 'Father says tonight we become part of the house, forever. He says it is a gift. I do not want it.'" },
  { id: "doctors_report", title: "Doctor's Report", night: 4, important: false, family: false, summary: "No bodies were ever found.",
    text: "Report of inquiry: the family vanished entirely. No bodies, no signs of flight. Neighbours reported the house 'looked different each time they passed.' The case was closed. The investigating doctor later refused to discuss it, and burned his notes." },
  { id: "letter_unsent", title: "Letter Never Sent", night: 4, important: true, family: true, requiredForTrueEnding: true, summary: "A mother begging for help.",
    text: "My dearest sister — if this reaches you, come for the children, not for me. He has done something to the house and to us. I can feel myself thinning, becoming a hallway, a draft, a creak in the floor. Take them before they forget they were ever people." },
  { id: "mirror_inscription", title: "Mirror Fragment Inscription", night: 4, important: true, family: false, requiredForTrueEnding: true, summary: "How to end it.",
    text: "Etched along the back of the shard: 'The bound look out through the glass. To break the mirror at the heart is to open every door at once — and let what was kept finally leave. The house will not survive the truth.'" },
  { id: "pocket_watch", title: "Broken Pocket Watch", night: 2, important: false, family: false, summary: "Time stopped here.",
    text: "A gentleman's pocket watch, stopped at 3:33. The glass is cracked from the inside. Engraved on the back: 'To my son, may you always find your way home.' The hands tremble when the house shifts." },
  { id: "final_confession", title: "The Final Confession", night: 5, important: true, family: true, requiredForTrueEnding: true, summary: "The father's last words.",
    text: "I wanted us to be together always, untouched by time or death. I bound us into the walls, into the dark between rooms. I did not understand that to remember is not to live. We are not safe here. We are simply kept. If you are reading this, you can still leave. Break the mirror. Let us out. Let us finally end." },
];

/* ---------------- Random events ----------------------------------- */
/* condition(g) -> bool ; effect(g) -> string log message
   weight = rarity (higher = more common)                              */
const EVENTS = [
  {
    id: "door_slam", title: "Door Slams", weight: 5,
    condition: (g) => true,
    effect: (g) => { g.player.fear = clamp(g.player.fear + 10, 0, 100); return "A door slams shut somewhere behind you."; },
  },
  {
    id: "candle_out", title: "Candle Blows Out", weight: 3,
    condition: (g) => g.player.candleTurns > 0,
    effect: (g) => { g.player.candleTurns = 0; g.player.fear = clamp(g.player.fear + 8, 0, 100); return "A cold breath snuffs your candle. Darkness rushes in."; },
  },
  {
    id: "whisper", title: "Whisper", weight: 4,
    condition: (g) => true,
    effect: (g) => { g.player.sanity = clamp(g.player.sanity - 3, 0, 100); g.player.fear = clamp(g.player.fear + 6, 0, 100); return "A whisper from another room calls a name. It might be yours."; },
  },
  {
    id: "portrait_eyes", title: "Watched", weight: 3,
    condition: (g) => true,
    effect: (g) => { g.player.fear = clamp(g.player.fear + 9, 0, 100); return "You feel eyes follow you across the room."; },
  },
  {
    id: "floorboard", title: "Floorboard Breaks", weight: 3,
    condition: (g) => true,
    effect: (g) => { g.player.health = clamp(g.player.health - 4, 0, 100); return "A floorboard gives way and rakes your shin."; },
  },
  {
    id: "draft", title: "Cold Draft", weight: 4,
    condition: (g) => true,
    effect: (g) => { g.player.fear = clamp(g.player.fear + 5, 0, 100); return "An impossibly cold draft passes straight through you."; },
  },
  {
    id: "piano", title: "Distant Piano", weight: 3,
    condition: (g) => true,
    effect: (g) => { g.player.sanity = clamp(g.player.sanity - 2, 0, 100); return "A piano plays six notes, far away, then stops."; },
  },
  {
    id: "blood_wall", title: "Blood On The Wall", weight: 2,
    condition: (g) => g.night >= 2,
    effect: (g) => { g.player.sanity = clamp(g.player.sanity - 5, 0, 100); g.player.fear = clamp(g.player.fear + 8, 0, 100); return "Dark stains bloom across the wall, spelling half a word."; },
  },
  {
    id: "scratch", title: "Scratch Marks", weight: 2,
    condition: (g) => g.night >= 2,
    effect: (g) => { g.player.fear = clamp(g.player.fear + 12, 0, 100); return "Fresh scratch marks gouge the door frame. Something was just here."; },
  },
  {
    id: "compartment", title: "Hidden Compartment", weight: 2,
    condition: (g) => true,
    reward: "item",
    effect: (g) => "A panel pops open, revealing a hidden compartment.",
  },
  {
    id: "cold_comfort", title: "A Moment's Calm", weight: 2,
    condition: (g) => g.player.fear > 30,
    effect: (g) => { g.player.fear = clamp(g.player.fear - 12, 0, 100); return "For a moment, the house is quiet. You breathe."; },
  },
  {
    id: "map_changes", title: "The Map Changes", weight: 2,
    condition: (g) => g.night >= 3,
    effect: (g) => { g.player.sanity = clamp(g.player.sanity - 4, 0, 100); return "You glance back. The hallway you came from is no longer there."; },
  },
];

/* ---------------- Per-night objectives ---------------------------- */
/* check(g) -> { done:bool, label:string }                            */
const OBJECTIVES = {
  1: {
    text: "Find 2 clues and survive until dawn.",
    check: (g) => {
      const c = g.flags.cluesThisNight;
      const dawn = g.timePhase === "Dawn Approaches";
      return { done: c >= 2 && dawn, label: `Clues ${Math.min(c,2)}/2` + (dawn ? " · dawn" : "") };
    },
  },
  2: {
    text: "Find the Rusted Key and enter the Basement.",
    check: (g) => {
      const key = g.player.keys.rusted > 0 || g.flags.foundRusted;
      const base = g.flags.enteredBasement;
      return { done: key && base, label: `${key ? "key✓" : "key…"} ${base ? "basement✓" : "basement…"}` };
    },
  },
  3: {
    text: "Find 3 family-related clues.",
    check: (g) => {
      const fam = g.player.clues.filter((id) => clueById(id) && clueById(id).family).length;
      return { done: fam >= CONFIG.FAMILY_CLUE_GOAL, label: `Family clues ${Math.min(fam,3)}/3` };
    },
  },
  4: {
    text: "Find the Mirror Shard and the Basement Emblem.",
    check: (g) => {
      const m = Player.hasItem(g.player, "mirror_shard");
      const e = Player.hasItem(g.player, "basement_emblem");
      return { done: m && e, label: `${m ? "shard✓" : "shard…"} ${e ? "emblem✓" : "emblem…"}` };
    },
  },
  5: {
    text: "Find the Final Room and choose an ending.",
    check: (g) => ({ done: g.flags.reachedFinal, label: g.flags.reachedFinal ? "found✓" : "find the final room" }),
  },
};

/* ---------------- Helpers ----------------------------------------- */
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function clueById(id) {
  return CLUES.find((c) => c.id === id);
}

/** Important clues the player has collected (for ending thresholds). */
function importantClueCount(player) {
  return player.clues.filter((id) => { const c = clueById(id); return c && c.important; }).length;
}
