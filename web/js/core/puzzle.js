// CORELOOM :: puzzle compilation.
//
// A puzzle definition supplies a single `streams(rng)` function that returns
// both the inputs and the expected outputs. Deriving expectations from the same
// function that produced the inputs means ground truth can never drift.

import { Rng } from '../util/rng.js';
import { DEFAULT_CODE_LINES } from './isa.js';
import { DEFAULT_MAX_CYCLES } from './machine.js';
import { PLACEABLE_TYPES } from './chips.js';

/**
 * Turn a raw definition into a runnable puzzle with stable dock ids.
 */
export function compilePuzzle(def) {
  const probe = def.streams(new Rng(`${def.id}:probe`));
  const inputNames = probe.inputs.map((s) => s.name);
  const outputNames = probe.outputs.map((s) => s.name);

  const docks = [
    ...inputNames.map((name, i) => ({ id: `in${i}`, kind: 'INPUT', name, side: 'W', slot: i })),
    ...outputNames.map((name, i) => ({ id: `out${i}`, kind: 'OUTPUT', name, side: 'E', slot: i })),
  ];

  const cache = new Map();

  const puzzle = {
    ...def,
    docks,
    inputNames,
    outputNames,
    testCount: def.testCount ?? 3,
    codeLines: def.codeLines ?? DEFAULT_CODE_LINES,
    maxCycles: def.maxCycles ?? DEFAULT_MAX_CYCLES,
    allowed: def.allowed ?? null,

    /** Deterministic per-index test case. */
    testCase(i) {
      if (cache.has(i)) return cache.get(i);
      const rng = new Rng(`${def.id}:case:${i}`);
      const raw = def.streams(rng, i);
      const tc = { index: i, inputs: {}, outputs: {} };
      for (const s of raw.inputs) tc.inputs[s.name] = s.values.slice();
      for (const s of raw.outputs) tc.outputs[s.name] = s.values.slice();
      cache.set(i, tc);
      return tc;
    },
  };

  return puzzle;
}

/**
 * Compile the library in order and work out which chips each assignment
 * introduces. Chips unlock on the puzzle that teaches them and stay unlocked,
 * so the palette grows one tool at a time instead of arriving all at once.
 */
export function compileAll(defs) {
  const puzzles = defs.map(compilePuzzle);
  const unlocked = new Set();
  for (const p of puzzles) {
    const available = p.allowed || PLACEABLE_TYPES;
    p.newChips = available.filter((t) => !unlocked.has(t));
    for (const t of available) unlocked.add(t);
  }
  return puzzles;
}
