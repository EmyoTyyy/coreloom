/* =================================================================
   save.js — localStorage save / load
   -----------------------------------------------------------------
   The whole GameState is plain data (no functions, no Sets), so a
   night can be resumed exactly. Static data (clues, events,
   objectives) is referenced by id and never stored.
   ================================================================= */

const Save = (() => {
  const KEY = "shifting_mansion_save_v1";

  /** Take a JSON-safe snapshot of the live game state. */
  function serialize(g) {
    return {
      v: 1,
      seed: g.seed,
      night: g.night,
      time: g.time,
      timePhase: g.timePhase,
      turn: g.turn,
      caughtCount: g.caughtCount,
      storyFlags: g.storyFlags,
      flags: g.flags,
      player: g.player,
      entity: g.entity,
      mansion: g.mansion,
      log: g.log.slice(-30),
    };
  }

  function save(g) {
    try {
      localStorage.setItem(KEY, JSON.stringify(serialize(g)));
      return true;
    } catch (err) {
      console.warn("Save failed:", err);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("Load failed:", err);
      return null;
    }
  }

  function exists() {
    try {
      return !!localStorage.getItem(KEY);
    } catch (err) {
      return false; // storage unavailable (private mode, sandboxed file://, etc.)
    }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (err) {
      /* ignore — nothing we can do without storage */
    }
  }

  return { save, load, exists, clear, serialize };
})();
