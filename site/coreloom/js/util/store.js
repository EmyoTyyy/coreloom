// CORELOOM :: persistence. Designs and best scores live in localStorage.

const KEY = 'coreloom.save.v1';

function read() {
  const blank = { designs: {}, scores: {}, seen: {}, flags: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank;
    const data = JSON.parse(raw);
    return {
      designs: data.designs || {}, scores: data.scores || {},
      seen: data.seen || {}, flags: data.flags || {},
    };
  } catch {
    return blank;
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode — the session still works, it just will not persist */
  }
}

export const store = {
  all: read,

  loadDesign(puzzleId) {
    return read().designs[puzzleId] || null;
  },

  saveDesign(puzzleId, layout) {
    const data = read();
    data.designs[puzzleId] = layout;
    write(data);
  },

  bestScore(puzzleId) {
    return read().scores[puzzleId] || null;
  },

  /**
   * Records a verified result. Each metric keeps its own record independently,
   * the way the genre traditionally does it — you are allowed to hold the cycle
   * record and the chip record with two different designs.
   */
  recordScore(puzzleId, score) {
    const data = read();
    const prev = data.scores[puzzleId];
    const next = prev
      ? {
        cycles: Math.min(prev.cycles, score.cycles),
        chips: Math.min(prev.chips, score.chips),
        instructions: Math.min(prev.instructions, score.instructions),
        wires: Math.min(prev.wires ?? score.wires, score.wires),
      }
      : { ...score };
    const improved = !prev
      || next.cycles < prev.cycles
      || next.chips < prev.chips
      || next.instructions < prev.instructions;
    data.scores[puzzleId] = next;
    write(data);
    return { record: next, improved };
  },

  solved(puzzleId) {
    return !!read().scores[puzzleId];
  },

  markSeen(puzzleId) {
    const data = read();
    data.seen[puzzleId] = true;
    write(data);
  },

  getFlag(name) {
    return !!read().flags[name];
  },

  setFlag(name, value) {
    const data = read();
    data.flags[name] = value;
    write(data);
  },

  /** True for a browser that has never opened the game before. */
  isFirstVisit() {
    const data = read();
    return !Object.keys(data.scores).length && !Object.keys(data.designs).length && !data.flags.tutorialDone;
  },

  reset() {
    write({ designs: {}, scores: {}, seen: {}, flags: {} });
  },
};
