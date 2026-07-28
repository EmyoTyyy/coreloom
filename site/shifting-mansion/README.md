# The Shifting Mansion

A top-down 2D horror exploration prototype. Every night the cursed mansion
rearranges itself — explore room by room, gather keys and clues, avoid the
stalking entity, manage your sanity, and uncover the truth across five nights.

Built with **only HTML, CSS and vanilla JavaScript** — no libraries, no engine,
no build step, no npm.

---

## How to run

Just open **`index.html`** in any modern browser (Chrome, Firefox, Edge…).

That's it — it runs entirely offline from the local file. No server needed.

> Saves use `localStorage`. If your browser blocks storage for local files
> (some privacy modes / Safari `file://`), the game still plays fine — it just
> won't remember progress between sessions. Serving the folder over any static
> server also works if you prefer.

---

## Controls

| Key | Action |
|-----|--------|
| `W A S D` / Arrow keys | Move through doors to the adjacent room |
| `Shift` + move | Sprint — faster, but loud and frightening |
| `E` | Interact (pick up items / read notes / search) |
| `Space` | Wait (let time pass) |
| `H` / `R` | Hide / Rest (also available as on-screen buttons) |
| `I` | Flash the inventory panel |
| `M` | Show controls & map help |
| `Esc` | Pause menu |
| `` ~ `` | Toggle debug tools |

The right panel holds room info, interactions, inventory and clues; the bottom
panel is the event log. Coloured dots on the map are items (purple = clue),
red-tinted doors are locked, the salt-blue room is the Safe Room.

---

## Implemented features

- **Procedural mansion** generated on a 2D grid from a seeded RNG (18–25 rooms),
  guaranteed fully connected with **no softlocks** — required keys/clues are
  always reachable, and locks only ever sit on spanning-tree leaves.
- **Nightly rearrangement** (5 nights): new layout, doors, items and entity
  spawn each night, while clues, story progress and carried items persist.
- **21 room types** with multiple descriptions each, light levels and curses.
- **Turn-based loop**: every action advances time through four night phases
  (Early Night → Midnight → Witching Hour → Dawn).
- **Stalking entity** with 5 states (dormant/wandering/hunting/chasing/
  retreating) driven by graph distance, fear, darkness and noise. It cannot
  enter the Safe Room and is scary through tension, not graphics.
- **Sanity / Fear / Health** systems with darkness drain, safe-room recovery,
  and low-sanity hallucinations (fake names, false whispers, screen shake).
- **Light & darkness** rendered as a candle-flicker fog overlay with a
  visibility radius that depends on room light + candles.
- **15 item types** (keys, candles, matches, medicine, laudanum, map fragment,
  music box, crowbar, mirror shard, basement emblem…) with real effects.
- **12 clues / notes** forming a discoverable story, gating four endings
  (Bad / Normal / True) plus two loss endings (Death / Madness).
- **Random event system**, **per-night objectives**, **save/load + autosave**,
  start menu, how-to-play, pause, game-over and ending screens.
- **Debug mode** (`~`): room IDs, entity location, seed, time/danger readout,
  and shortcuts to add keys/clues, deal damage, drop sanity, advance the night
  or force a hunt.
- Polished dark-horror UI: vignette, candle flicker, entity pulse, damage
  flash, mansion-shift transition, fade-in log lines.

## Code structure

```
index.html      layout + script load order
style.css       full dark-horror UI styling
rng.js          seeded RNG (mulberry32)
data.js         config, room types, items, clues, events, objectives
generation.js   procedural mansion + graph helpers (BFS, free-region)
player.js       player state & inventory helpers
entity.js       entity AI
render.js        canvas rendering (map, fog, player, entity)
ui.js           DOM panels, log, overlays, screens
save.js         localStorage save/load (degrades gracefully)
main.js         GameState, input, turn pipeline, nights, endings, debug
```

## Possible future improvements

- Real audio (heartbeat, ambient creaks, music-box theme) via WebAudio.
- Smooth intra-room movement and simple collision instead of room-to-room steps.
- More room/clue variety, branching objectives and optional secrets using the
  Strange Coin currency.
- Smarter entity (memory of last seen position, ambushes near loud actions).
- A drawn minimap toggle and discovered-room fog-of-war persistence.
- Difficulty settings and an endless mode beyond night 5.
