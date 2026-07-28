/* =================================================================
   rng.js — Seeded pseudo-random number generator (mulberry32)
   -----------------------------------------------------------------
   Deterministic given a seed, so the mansion can be debugged/replayed,
   yet feels random night to night. Exposes a small helper API.
   ================================================================= */

/**
 * Create a seeded RNG.
 * @param {number} seed - any 32-bit integer seed.
 * @returns {object} rng with next(), int(), chance(), pick(), shuffle().
 */
function makeRNG(seed) {
  let a = (seed >>> 0) || 1;

  // mulberry32 core — fast, decent quality for a game.
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    seed: a,

    /** float in [0,1) */
    next,

    /** integer in [min,max] inclusive */
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    /** true with probability p (0..1) */
    chance(p) {
      return next() < p;
    },

    /** random element of an array */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },

    /** weighted pick — items: [{...,weight}] returns chosen item */
    weighted(items) {
      let total = 0;
      for (const it of items) total += it.weight || 1;
      let r = next() * total;
      for (const it of items) {
        r -= it.weight || 1;
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },

    /** non-mutating Fisher–Yates shuffle */
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}
