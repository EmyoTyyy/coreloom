/* =================================================================
   player.js — player state and inventory helpers
   -----------------------------------------------------------------
   The player object is plain data (so it serialises cleanly for
   saving). All behaviour lives in the Player namespace functions.
   ================================================================= */

const Player = (() => {
  /** Create a fresh player at the start of a new game. */
  function create() {
    return {
      currentRoomId: null,
      health: CONFIG.START_HEALTH,
      sanity: CONFIG.START_SANITY,
      fear: 0,
      keys: { small: 0, rusted: 0, silver: 0 },
      inventory: {}, // itemId -> count (non-key items)
      clues: [], // clue ids (persist across nights)
      candleTurns: 0, // remaining lit-candle room transitions
      visitedRooms: [], // ids visited this night (for the map)
      pendingFear: 0, // delayed fear (e.g. from laudanum)
      hiding: false,
    };
  }

  /* ---- inventory ------------------------------------------------- */
  function addItem(p, id, n = 1) {
    p.inventory[id] = (p.inventory[id] || 0) + n;
  }
  function removeItem(p, id, n = 1) {
    if (!p.inventory[id]) return false;
    p.inventory[id] -= n;
    if (p.inventory[id] <= 0) delete p.inventory[id];
    return true;
  }
  function hasItem(p, id) {
    return (p.inventory[id] || 0) > 0;
  }
  function itemCount(p, id) {
    return p.inventory[id] || 0;
  }

  /* ---- keys ------------------------------------------------------ */
  function addKey(p, type) {
    p.keys[type] = (p.keys[type] || 0) + 1;
  }
  function hasKey(p, type) {
    return (p.keys[type] || 0) > 0;
  }
  /** Small keys are consumed; rusted/silver are persistent. */
  function useKey(p, type) {
    if (!hasKey(p, type)) return false;
    if (type === "small") p.keys.small -= 1;
    return true;
  }
  function totalKeys(p) {
    return p.keys.small + p.keys.rusted + p.keys.silver;
  }

  /**
   * Pick up an item id, routing keys to the key counters and story/
   * consumable items to the inventory. Returns a display name.
   */
  function pickup(p, itemId) {
    const def = ITEMS[itemId];
    if (!def) return itemId;
    if (def.type === "key") addKey(p, def.keyType);
    else addItem(p, itemId);
    return def.name;
  }

  return {
    create, addItem, removeItem, hasItem, itemCount,
    addKey, hasKey, useKey, totalKeys, pickup,
  };
})();
