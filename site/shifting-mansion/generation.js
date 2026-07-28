/* =================================================================
   generation.js — procedural mansion generation + graph utilities
   -----------------------------------------------------------------
   Builds a connected graph of rooms on a 2D grid each night.
   Guarantees:
     - Entrance Hall and a Safe Room always exist.
     - Every room is reachable from the Entrance.
     - Keys and required clues are placed in rooms reachable WITHOUT
       any key (the "free region"), so the player can never softlock.
     - The entity never spawns in the player's starting room.
   ================================================================= */

const Generation = (() => {
  const DIRS = [
    ["north", 0, -1],
    ["south", 0, 1],
    ["east", 1, 0],
    ["west", -1, 0],
  ];
  const OPP = { north: "south", south: "north", east: "west", west: "east" };

  /* ---- graph helpers (also used by the entity) ------------------- */

  /** BFS distances from startId across all doors (ignores locks). */
  function distances(rooms, startId) {
    const dist = { [startId]: 0 };
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift();
      const room = rooms[id];
      for (const dir of Object.keys(room.doors)) {
        const nid = room.doors[dir];
        if (nid && dist[nid] === undefined) {
          dist[nid] = dist[id] + 1;
          queue.push(nid);
        }
      }
    }
    return dist;
  }

  /**
   * BFS that respects locks: returns the set of room ids reachable from
   * start without ever entering a locked room (the "free region").
   * The start room itself is always included.
   */
  function freeRegion(rooms, startId) {
    const seen = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift();
      const room = rooms[id];
      for (const dir of Object.keys(room.doors)) {
        const nid = room.doors[dir];
        if (nid && !seen.has(nid) && !rooms[nid].locked) {
          seen.add(nid);
          queue.push(nid);
        }
      }
    }
    return seen;
  }

  /** First step (neighbour id) from `fromId` toward `toId`, or null. */
  function nextStepToward(rooms, fromId, toId) {
    if (fromId === toId) return null;
    const prev = { [fromId]: null };
    const queue = [fromId];
    while (queue.length) {
      const id = queue.shift();
      if (id === toId) break;
      for (const dir of Object.keys(rooms[id].doors)) {
        const nid = rooms[id].doors[dir];
        if (nid && prev[nid] === undefined) {
          prev[nid] = id;
          queue.push(nid);
        }
      }
    }
    if (prev[toId] === undefined) return null; // unreachable
    let cur = toId;
    while (prev[cur] !== fromId) {
      cur = prev[cur];
      if (cur == null) return null;
    }
    return cur;
  }

  /* ---- room construction ----------------------------------------- */
  function makeRoom(id, x, y) {
    return {
      id, x, y,
      type: null,
      name: "",
      description: "",
      parent: null, // spanning-tree parent id (for safe lock placement)
      doors: {}, // dir -> neighbour id
      light: "dim",
      danger: 0,
      cursed: false,
      visited: false,
      known: false, // revealed by map fragment / adjacency
      locked: false,
      lockType: null, // small | rusted | silver | clue
      items: [], // item ids
      clue: null, // clue id or null
      searched: false,
    };
  }

  /* ---- main entry ------------------------------------------------- */
  /**
   * Generate a fresh mansion for the current night and wire up the
   * player start + entity spawn on the GameState `g`.
   */
  function generate(g) {
    const rng = g.rng;
    const night = g.night;
    const target = CONFIG.ROOMS_BY_NIGHT[Math.min(night - 1, CONFIG.ROOMS_BY_NIGHT.length - 1)];

    const rooms = {};
    const grid = {}; // "x,y" -> id
    let nextId = 0;
    const key = (x, y) => x + "," + y;

    function addRoom(x, y) {
      const id = "r" + nextId++;
      const room = makeRoom(id, x, y);
      rooms[id] = room;
      grid[key(x, y)] = id;
      return room;
    }
    function connect(a, b, dir) {
      a.doors[dir] = b.id;
      b.doors[OPP[dir]] = a.id;
    }

    /* 1. Grow a spanning tree from the entrance (guarantees connectivity) */
    const start = addRoom(0, 0);
    const cells = [start];
    let attempts = 0;
    while (Object.keys(rooms).length < target && attempts < target * 80) {
      attempts++;
      const parent = rng.pick(cells);
      const d = rng.pick(DIRS);
      const nx = parent.x + d[1];
      const ny = parent.y + d[2];
      if (grid[key(nx, ny)]) continue;
      const room = addRoom(nx, ny);
      connect(parent, room, d[0]);
      room.parent = parent.id; // remember tree parent
      cells.push(room);
    }

    /* 2. Add extra doors between adjacent rooms -> loops & shortcuts */
    for (const id in rooms) {
      const r = rooms[id];
      for (const d of DIRS) {
        const nid = grid[key(r.x + d[1], r.y + d[2])];
        if (nid && !r.doors[d[0]] && rng.chance(0.22)) {
          connect(r, rooms[nid], d[0]);
        }
      }
    }

    const allIds = Object.keys(rooms);
    const dist = distances(rooms, start.id);
    // ids sorted by distance from entrance (closest first)
    const byDist = allIds.slice().sort((a, b) => dist[a] - dist[b]);
    const maxDist = dist[byDist[byDist.length - 1]];

    /* 3. Start type + spanning-tree leaf analysis.
          We only ever lock LEAF rooms: locking a leaf strands nothing
          behind it, and a leaf's parent (a non-leaf) is never locked, so
          the door is always reachable. This makes every layout solvable. */
    assignType(start, "entrance", rng);

    const childCount = {};
    for (const id of allIds) childCount[id] = 0;
    for (const id of allIds) {
      const p = rooms[id].parent;
      if (p != null) childCount[p]++;
    }
    const isLeaf = (id) => id !== start.id && childCount[id] === 0;

    const reserved = new Set([start.id]);
    const farLeaves = byDist.slice().reverse().filter((id) => isLeaf(id));
    const takeFarLeaf = () => {
      for (const id of farLeaves) if (!reserved.has(id)) { reserved.add(id); return id; }
      return null;
    };

    /* 4. Basement (rusted) from night 2; Final (clue-gated) on the last night.
          Both go on FAR leaves. */
    let basementId = null;
    if (night >= 2) {
      basementId = takeFarLeaf();
      if (basementId) {
        assignType(rooms[basementId], "basement", rng);
        rooms[basementId].locked = true;
        rooms[basementId].lockType = "rusted";
      }
    }
    let finalId = null;
    if (night >= CONFIG.TOTAL_NIGHTS) {
      finalId = takeFarLeaf();
      if (finalId) {
        assignType(rooms[finalId], "final", rng);
        rooms[finalId].locked = true;
        rooms[finalId].lockType = "clue";
      }
    }

    /* 5. Safe room: mid-distance and, by preference, a NON-leaf so it can
          never be picked for a lock and is always reachable. */
    const midNonLeaf = byDist.filter(
      (id) => !reserved.has(id) && !isLeaf(id) && dist[id] >= 2 && dist[id] <= Math.max(2, maxDist - 1)
    );
    const midAny = byDist.filter((id) => !reserved.has(id) && dist[id] >= 2);
    const safeId = midNonLeaf.length ? rng.pick(midNonLeaf)
      : midAny.length ? rng.pick(midAny)
      : firstUnreserved(byDist, reserved);
    if (safeId) {
      assignType(rooms[safeId], "safe", rng);
      reserved.add(safeId);
    }

    /* 6. Special rooms. Locked specials must sit on leaves; open ones can
          go anywhere that is still free. */
    const numSpecials = CONFIG.SPECIALS_BY_NIGHT[Math.min(night - 1, CONFIG.SPECIALS_BY_NIGHT.length - 1)];
    const lockedSpecials = rng.shuffle(["locked_office", "secret"]);
    const openSpecials = rng.shuffle([
      "master_bedroom", "chapel", "observatory", "nursery", "mirror", "basement_stairs", "music_room", "gallery",
    ]);
    let specialsPlaced = 0;

    const spareLeaves = rng.shuffle(allIds.filter((id) => isLeaf(id) && !reserved.has(id)));
    let li = 0;
    for (const type of lockedSpecials) {
      if (specialsPlaced >= numSpecials || li >= spareLeaves.length) break;
      const id = spareLeaves[li++];
      assignType(rooms[id], type, rng);
      rooms[id].locked = true;
      rooms[id].lockType = ROOM_TYPES[type].lockType;
      reserved.add(id);
      specialsPlaced++;
    }
    const openPool = rng.shuffle(allIds.filter((id) => !reserved.has(id)));
    let oi = 0;
    for (const type of openSpecials) {
      if (specialsPlaced >= numSpecials || oi >= openPool.length) break;
      const id = openPool[oi++];
      assignType(rooms[id], type, rng);
      reserved.add(id);
      specialsPlaced++;
    }

    /* 7. Remaining rooms -> common filler (weighted) */
    const commonPool = Object.keys(ROOM_TYPES)
      .filter((t) => ROOM_TYPES[t].category === "common")
      .map((t) => ({ type: t, weight: ROOM_TYPES[t].weight || 1 }));
    for (const id of allIds) {
      if (reserved.has(id)) continue;
      assignType(rooms[id], rng.weighted(commonPool).type, rng);
    }

    /* 8. Extra small locks on spare leaves */
    const extraLocks = CONFIG.LOCKED_SMALL_BY_NIGHT[Math.min(night - 1, CONFIG.LOCKED_SMALL_BY_NIGHT.length - 1)];
    const lockLeaves = rng.shuffle(allIds.filter((id) => isLeaf(id) && !reserved.has(id) && !rooms[id].locked));
    for (let i = 0; i < extraLocks && i < lockLeaves.length; i++) {
      rooms[lockLeaves[i]].locked = true;
      rooms[lockLeaves[i]].lockType = "small";
    }

    /* 9. Safety net (a no-op with leaf-only locking, kept as a guarantee) */
    repairReachability(rooms, start.id);

    /* 10. Place keys + clues + items in the free region */
    const free = freeRegion(rooms, start.id);
    placeContents(g, rooms, start.id, safeId, free, dist);

    /* 11. Player + entity placement */
    g.mansion = { rooms, startId: start.id, safeId, basementId, finalId, maxDist };
    g.player.currentRoomId = start.id;

    placeEntity(g, rooms, start.id, safeId, dist);

    // entrance is visited immediately
    markKnown(g.mansion, start.id);
    rooms[start.id].visited = true;
    return g.mansion;
  }

  /* ---- assignment helpers ---------------------------------------- */
  function assignType(room, type, rng) {
    const def = ROOM_TYPES[type];
    room.type = type;
    room.name = def.name;
    room.description = rng.pick(def.desc);
    room.light = def.light;
    room.cursed = def.cursed;
    room.danger = def.danger;
  }

  function firstUnreserved(ids, reserved) {
    for (const id of ids) if (!reserved.has(id)) return id;
    return null;
  }

  /**
   * Guarantee the layout is always solvable: every locked room must have at
   * least one neighbour in the free region (the area reachable from the
   * entrance without any key), so its door can actually be reached and
   * opened once the matching key is found. Chains of locks are collapsed by
   * unlocking bridge rooms; ordinary locks with no way in are simply opened.
   * Destination rooms (basement/final) are kept locked — a neighbour is
   * unlocked instead. Iterates to a fixed point.
   */
  function repairReachability(rooms, startId) {
    for (let pass = 0; pass < 12; pass++) {
      const free = freeRegion(rooms, startId);
      let changed = false;
      for (const id in rooms) {
        const r = rooms[id];
        if (!r.locked) continue;
        const neigh = Object.keys(r.doors).map((d) => r.doors[d]).filter(Boolean);
        if (neigh.some((n) => free.has(n))) continue; // already reachable

        // 1) unlock a locked, non-destination neighbour to bridge inward
        const bridge = neigh.find((n) => rooms[n].locked && !isDestination(rooms[n]));
        if (bridge) { unlock(rooms[bridge]); changed = true; continue; }

        // 2) ordinary lock with no way in -> just open it
        if (!isDestination(r)) { unlock(r); changed = true; continue; }

        // 3) destination boxed in by destinations -> open any neighbour
        if (neigh.length) { unlock(rooms[neigh[0]]); changed = true; }
      }
      if (!changed) break;
    }
  }

  function isDestination(r) {
    return r.type === "final" || r.type === "basement";
  }
  function unlock(r) {
    r.locked = false;
    r.lockType = null;
  }

  /* ---- contents (keys, clues, items) ----------------------------- */
  function placeContents(g, rooms, startId, safeId, free, dist) {
    const rng = g.rng;
    // candidate rooms for loot: in the free region, not start/safe
    const freeIds = [...free].filter((id) => id !== startId && id !== safeId);
    // sorted far-first so important clues land far from the entrance
    const freeFar = freeIds.slice().sort((a, b) => dist[b] - dist[a]);
    const pool = rng.shuffle(freeIds); // for scattered loot
    const used = new Set();

    function placeItemFar(itemId) {
      for (const id of freeFar) {
        if (used.has(id)) continue;
        rooms[id].items.push(itemId);
        used.add(id);
        return id;
      }
      // fallback: any free room
      for (const id of pool) { rooms[id].items.push(itemId); return id; }
      return null;
    }
    function placeItemAny(itemId) {
      for (const id of pool) {
        if (used.has(id)) continue;
        rooms[id].items.push(itemId);
        used.add(id);
        return id;
      }
      return null;
    }
    function placeClue(clueId) {
      for (const id of freeFar) {
        if (used.has(id)) continue;
        if (rooms[id].clue) continue;
        rooms[id].clue = clueId;
        used.add(id);
        return id;
      }
      return null;
    }

    /* --- keys for every lock present --- */
    const lockCounts = { small: 0, rusted: 0, silver: 0 };
    for (const id in rooms) {
      const lt = rooms[id].lockType;
      if (lt && lt !== "clue") lockCounts[lt]++;
    }
    for (let i = 0; i < lockCounts.small; i++) placeItemAny("small_key");
    if (lockCounts.rusted > 0) placeItemFar("rusted_key");
    if (lockCounts.silver > 0) placeItemFar("silver_key");
    // a spare small key so consumable locks are never a dead end
    if (lockCounts.small > 0) placeItemAny("small_key");

    /* --- clues: unfound, prioritised by this night --- */
    const found = new Set(g.player.clues);
    const available = CLUES.filter((c) => !found.has(c.id));
    available.sort((a, b) => Math.abs(a.night - g.night) - Math.abs(b.night - g.night));
    const clueCount = Math.min(CONFIG.CLUES_PER_NIGHT, available.length);
    for (let i = 0; i < clueCount; i++) placeClue(available[i].id);

    /* --- objective / story items --- */
    if (g.night >= 4) {
      if (!Player.hasItem(g.player, "mirror_shard")) placeItemFar("mirror_shard");
      if (!Player.hasItem(g.player, "basement_emblem")) placeItemFar("basement_emblem");
    }

    /* --- scattered survival items (count scales down with luck) --- */
    const consumables = ["candle", "matches", "matches", "medicine", "laudanum", "map_fragment", "music_box", "coin", "crowbar"];
    const scatter = rng.shuffle(consumables).slice(0, 6 + (g.night >= 3 ? 1 : 0));
    for (const it of scatter) placeItemAny(it);
    // always seed at least one candle + matches early so light is learnable
    placeItemAny("candle");
    placeItemAny("matches");
  }

  /* ---- entity spawn ---------------------------------------------- */
  function placeEntity(g, rooms, startId, safeId, dist) {
    const ids = Object.keys(rooms).filter((id) => id !== startId && id !== safeId);
    // farthest reachable rooms from the player
    ids.sort((a, b) => dist[b] - dist[a]);
    const farPick = ids.slice(0, Math.max(1, Math.floor(ids.length * 0.3)));
    const spawn = g.rng.pick(farPick.length ? farPick : ids);
    if (!g.entity) g.entity = Entity.create(spawn);
    else {
      g.entity.currentRoomId = spawn;
      g.entity.state = g.night >= 3 ? "wandering" : "dormant";
      g.entity.cooldown = 0;
    }
  }

  /* ---- visibility ------------------------------------------------ */
  /** Mark a room visited and reveal its immediate neighbours as outlines. */
  function markKnown(mansion, roomId) {
    const room = mansion.rooms[roomId];
    room.known = true;
    for (const dir of Object.keys(room.doors)) {
      const nid = room.doors[dir];
      if (nid) mansion.rooms[nid].known = true;
    }
  }

  return { generate, distances, freeRegion, nextStepToward, markKnown };
})();
