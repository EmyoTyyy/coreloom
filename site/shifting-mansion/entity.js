/* =================================================================
   entity.js — the stalking entity
   -----------------------------------------------------------------
   Turn-based AI. No real pathfinding cost: it uses BFS graph
   distance to know where the player is. Fear, darkness, noise and
   the night number make it more aggressive. It cannot enter the
   Safe Room. Scares come from tension, not graphics.
   ================================================================= */

const Entity = (() => {
  function create(roomId) {
    return {
      currentRoomId: roomId,
      state: "dormant", // dormant | wandering | hunting | chasing | retreating
      aggression: 0,
      lastSeenTurn: -99,
      cooldown: 0, // turns spent retreating after an attack
      lure: 0, // temporary aggression bump from noise
    };
  }

  /** Neighbour room ids reachable through doors (entity ignores locks). */
  function neighbours(rooms, id, excludeSafe = true) {
    const out = [];
    const room = rooms[id];
    for (const dir of Object.keys(room.doors)) {
      const nid = room.doors[dir];
      if (!nid) continue;
      if (excludeSafe && rooms[nid].type === "safe") continue;
      out.push(nid);
    }
    return out;
  }

  function stepRandom(e, rooms, rng) {
    const opts = neighbours(rooms, e.currentRoomId);
    if (opts.length) e.currentRoomId = rng.pick(opts);
  }

  function stepToward(e, playerId, rooms) {
    const next = Generation.nextStepToward(rooms, e.currentRoomId, playerId);
    // don't walk into the safe room even if that's the direct path
    if (next && rooms[next].type !== "safe") e.currentRoomId = next;
    else stepRandomFallback(e, rooms, playerId);
  }

  function stepRandomFallback(e, rooms, playerId) {
    // move to the neighbour that gets closest to the player
    const dist = Generation.distances(rooms, playerId);
    let best = e.currentRoomId;
    let bestD = dist[e.currentRoomId] !== undefined ? dist[e.currentRoomId] : 99;
    for (const nid of neighbours(rooms, e.currentRoomId)) {
      const d = dist[nid] !== undefined ? dist[nid] : 99;
      if (d < bestD) { bestD = d; best = nid; }
    }
    e.currentRoomId = best;
  }

  function moveAway(e, playerId, rooms) {
    const dist = Generation.distances(rooms, playerId);
    let best = e.currentRoomId;
    let bestD = dist[e.currentRoomId] !== undefined ? dist[e.currentRoomId] : 0;
    for (const nid of neighbours(rooms, e.currentRoomId)) {
      const d = dist[nid] !== undefined ? dist[nid] : 0;
      if (d > bestD) { bestD = d; best = nid; }
    }
    e.currentRoomId = best;
  }

  function phaseIndex(g) {
    return CONFIG.PHASES.findIndex((p) => p.name === g.timePhase);
  }

  /** Add temporary aggression (noise lure). */
  function lure(g, amount) {
    g.entity.lure = clamp(g.entity.lure + amount, 0, 0.5);
  }

  /** Force the entity into a hunt (e.g. picking up a major clue). */
  function provoke(g, amount = 0.18) {
    g.entity.state = "hunting";
    lure(g, amount);
  }

  /** Run one turn of entity behaviour. Mutates g (player, fx, log). */
  function update(g) {
    const e = g.entity;
    const p = g.player;
    const rooms = g.mansion.rooms;
    const night = g.night;
    const ni = Math.min(night - 1, CONFIG.ENTITY_AGGRO_BY_NIGHT.length - 1);

    // ---- aggression model ----
    const base = CONFIG.ENTITY_AGGRO_BY_NIGHT[ni];
    const phaseBonus = Math.max(0, phaseIndex(g)) * 0.06;
    const fearBonus = p.fear > 70 ? 0.12 : p.fear > 40 ? 0.05 : 0;
    const aggro = clamp(base + phaseBonus + fearBonus + e.lure, 0, 0.97);
    e.aggression = aggro;
    e.lure = Math.max(0, e.lure - 0.05); // decay

    const playerSafe = rooms[p.currentRoomId].type === "safe";

    // ---- retreating after an attack ----
    if (e.cooldown > 0) {
      e.cooldown--;
      e.state = "retreating";
      moveAway(e, p.currentRoomId, rooms);
      return;
    }

    // distance BEFORE moving — drives warnings
    const distNow = Generation.distances(rooms, e.currentRoomId);
    let d = distNow[p.currentRoomId];
    if (d === undefined) d = 99;

    // ---- proximity warnings & "seeing" it ----
    if (!playerSafe) {
      if (d <= 2) {
        g.fx.pulse = true;
        p.fear = clamp(p.fear + (d <= 1 ? 10 : 5), 0, 100);
        if (g.rng.chance(0.6)) UI.log(g, warningLine(g, d), "warn");
      }
      if (d <= 1) {
        e.lastSeenTurn = g.turn;
        p.sanity = clamp(p.sanity - 2, 0, 100);
      }
    }

    // ---- state transition ----
    if (!playerSafe && d <= 2 && aggro > 0.3) {
      e.state = "chasing";
    } else if (aggro > 0.25 && g.rng.chance(aggro)) {
      e.state = "hunting";
    } else if (e.state !== "hunting" && e.state !== "chasing") {
      e.state = aggro > 0.18 ? "wandering" : "dormant";
    } else if (d > 4) {
      // lost the trail
      e.state = aggro > 0.18 ? "wandering" : "dormant";
    }

    // ---- movement ----
    const moveChance = {
      dormant: 0.2, wandering: 0.55, hunting: 0.85, chasing: 1.0, retreating: 0.6,
    }[e.state];

    if (playerSafe) {
      // can't reach the player; just wander
      if (g.rng.chance(0.5)) stepRandom(e, rooms, g.rng);
    } else if (g.rng.chance(moveChance)) {
      if (e.state === "hunting" || e.state === "chasing") stepToward(e, p.currentRoomId, rooms);
      else stepRandom(e, rooms, g.rng);
    }

    // ---- attack if it shares the player's room ----
    if (!playerSafe && e.currentRoomId === p.currentRoomId) {
      attack(g);
    }
  }

  function attack(g) {
    const e = g.entity, p = g.player;
    const ni = Math.min(g.night - 1, CONFIG.ENTITY_ATTACK_HP.length - 1);

    // hiding gives a chance to be missed
    if (p.hiding && g.rng.chance(0.6)) {
      p.hiding = false;
      e.lure = clamp(e.lure + 0.08, 0, 0.5);
      UI.log(g, "It drifts past, inches away. You don't breathe.", "warn");
      e.state = "wandering";
      return;
    }
    p.hiding = false;

    const hp = CONFIG.ENTITY_ATTACK_HP[ni];
    const san = CONFIG.ENTITY_ATTACK_SAN[ni];
    p.health = clamp(p.health - hp, 0, 100);
    p.sanity = clamp(p.sanity - san, 0, 100);
    p.fear = clamp(p.fear + 30, 0, 100);
    g.caughtCount++;

    e.state = "retreating";
    e.cooldown = CONFIG.ENTITY_COOLDOWN;
    moveAway(e, p.currentRoomId, g.mansion.rooms);

    g.fx.damage = true;
    g.fx.shake = true;
    UI.log(g, "Cold hands close around you out of the dark! It strikes, then recoils.", "danger");
  }

  /** Flavour text for proximity warnings. */
  function warningLine(g, d) {
    const near = [
      "You hear wood creak behind the wall.",
      "Floorboards groan in the next room.",
      "Something heavy drags across a floor nearby.",
      "A wet, ragged breathing leaks through the wall.",
    ];
    const close = [
      "The air goes ice cold. It is very close.",
      "Your candle gutters. Something is right beside you.",
      "A shape moves at the edge of the doorway.",
    ];
    return g.rng.pick(d <= 1 ? close : near);
  }

  function distanceToPlayer(g) {
    const dist = Generation.distances(g.mansion.rooms, g.entity.currentRoomId);
    const d = dist[g.player.currentRoomId];
    return d === undefined ? -1 : d;
  }

  return { create, update, lure, provoke, distanceToPlayer };
})();
