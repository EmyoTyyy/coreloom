// CORELOOM :: assignment library.
//
// Every puzzle owns one `streams(rng)` function that emits inputs *and* the
// expected outputs together, so the expectation is always the true answer for
// the generated data. Test case 0 is the one shown in the I/O panel; the rest
// are hidden and only run during verification.

import { seq } from '../util/rng.js';

const S = (name, values) => ({ name, values });

export const PUZZLE_DEFS = [
  // ======================================================================
  // TIER 1 — ORIENTATION
  // ======================================================================
  {
    id: 'relay',
    name: 'SIGNAL RELAY',
    group: 'ORIENTATION',
    brief:
      'Every value that arrives on IN.A must leave on OUT.A, in order, unchanged. ' +
      'Place a CORE, wire the input dock into one of its sides and one of its sides out to the output dock, then write the loop.',
    grid: { cols: 3, rows: 2 },
    allowed: ['CORE'],
    par: { cycles: 40, chips: 1 },
    hints: [
      'Drag from a port nub to another port nub to lay a wire. Outputs are the hollow nubs, inputs are the filled ones.',
      'MOV W E copies straight from the west input to the east output. Wrap it in a loop with JMP.',
    ],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-99, 99));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.slice())] };
    },
  },
  {
    id: 'invert',
    name: 'PHASE INVERTER',
    group: 'ORIENTATION',
    brief: 'Emit the negation of every incoming value.',
    grid: { cols: 3, rows: 2 },
    allowed: ['CORE'],
    par: { cycles: 56, chips: 1 },
    hints: ['Read into ACC first, then act on it: MOV W ACC / NEG / MOV ACC E.'],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-99, 99));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map((v) => -v))] };
    },
  },
  {
    id: 'amplify',
    name: 'AMPLIFIER',
    group: 'ORIENTATION',
    brief: 'Multiply every value by three before sending it on.',
    grid: { cols: 3, rows: 2 },
    allowed: ['CORE'],
    par: { cycles: 56, chips: 1 },
    hints: ['MUL 3 does it in one instruction. So does ADD ACC twice — one costs a line, the other costs a cycle.'],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-150, 150));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map((v) => v * 3))] };
    },
  },
  {
    id: 'adder',
    name: 'SUMMING JUNCTION',
    group: 'ORIENTATION',
    brief:
      'Two streams arrive in step. For each pair, emit the sum of the value from IN.A and the value from IN.B.',
    grid: { cols: 3, rows: 3 },
    allowed: ['CORE'],
    par: { cycles: 54, chips: 1 },
    hints: [
      'A single CORE can read from two different sides — wire IN.A to its west and IN.B to its north.',
      'MOV W ACC / ADD N / MOV ACC E.',
    ],
    streams: (rng) => {
      const a = seq(18, () => rng.int(-99, 99));
      const b = seq(18, () => rng.int(-99, 99));
      return {
        inputs: [S('IN.A', a), S('IN.B', b)],
        outputs: [S('OUT.S', a.map((v, i) => v + b[i]))],
      };
    },
  },

  // ======================================================================
  // TIER 2 — CONTROL
  // ======================================================================
  {
    id: 'sign',
    name: 'SIGN READER',
    group: 'CONTROL',
    brief:
      'For each value emit -1 if it is negative, 0 if it is zero, and 1 if it is positive. Magnitude is discarded.',
    grid: { cols: 3, rows: 2 },
    allowed: ['CORE'],
    par: { cycles: 84, chips: 1 },
    hints: ['JGZ / JLZ / JEZ branch on the current contents of ACC.'],
    streams: (rng) => {
      const a = seq(20, () => (rng.chance(0.2) ? 0 : rng.int(-99, 99)));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map(Math.sign))] };
    },
  },
  {
    id: 'rectify',
    name: 'RECTIFIER',
    group: 'CONTROL',
    brief: 'Emit the absolute value of every incoming signal.',
    grid: { cols: 3, rows: 2 },
    allowed: ['CORE'],
    par: { cycles: 80, chips: 1 },
    hints: ['Test the sign with JGZ, and only run NEG on the branch that needs it.'],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-200, 200));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map(Math.abs))] };
    },
  },
  {
    id: 'ceiling',
    name: 'LIMITER',
    group: 'CONTROL',
    brief:
      'Clamp every value into the range -50 to 50 inclusive. Values already inside the range pass through untouched.',
    grid: { cols: 3, rows: 2 },
    allowed: ['CORE'],
    par: { cycles: 112, chips: 1 },
    hints: ['Compare by subtracting: SUB 50 leaves a positive ACC exactly when the value exceeded the ceiling.'],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-140, 140));
      return {
        inputs: [S('IN.A', a)],
        outputs: [S('OUT.A', a.map((v) => Math.max(-50, Math.min(50, v))))],
      };
    },
  },
  {
    id: 'larger',
    name: 'DOMINANCE',
    group: 'CONTROL',
    brief: 'Two streams arrive in step. Emit whichever value of each pair is larger. Ties emit that value once.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE'],
    par: { cycles: 124, chips: 3 },
    hints: [
      'Comparing two values consumes both of them. Send a copy of each somewhere safe before you compare.',
      'A QUEUE remembers the pair in arrival order while a second CORE works out which one won.',
    ],
    streams: (rng) => {
      const a = seq(16, () => rng.int(-99, 99));
      const b = seq(16, () => rng.int(-99, 99));
      return {
        inputs: [S('IN.A', a), S('IN.B', b)],
        outputs: [S('OUT.M', a.map((v, i) => Math.max(v, b[i])))],
      };
    },
  },

  // ======================================================================
  // TIER 3 — ROUTING
  // ======================================================================
  {
    id: 'duplicate',
    name: 'TAP LINE',
    group: 'ROUTING',
    brief:
      'Both output docks must receive an identical copy of the whole input stream. ' +
      'A SPLIT chip holds each value until every wired output has taken it.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE', 'SPLIT'],
    par: { cycles: 36, chips: 1 },
    hints: ['A single SPLIT with two wired outputs solves this with no CORE at all.'],
    streams: (rng) => {
      const a = seq(18, () => rng.int(-99, 99));
      return {
        inputs: [S('IN.A', a)],
        outputs: [S('OUT.A', a.slice()), S('OUT.B', a.slice())],
      };
    },
  },
  {
    id: 'weave',
    name: 'WEAVE',
    group: 'ROUTING',
    brief:
      'Two streams arrive in step. Interleave them into one: the first value of IN.A, then the first of IN.B, ' +
      'then the second of IN.A, and so on.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE', 'SPLIT'],
    par: { cycles: 48, chips: 1 },
    hints: ['Reading alternately from two sides in a loop is all this needs.'],
    streams: (rng) => {
      const a = seq(12, () => rng.int(-99, 99));
      const b = seq(12, () => rng.int(-99, 99));
      const out = [];
      for (let i = 0; i < a.length; i++) { out.push(a[i]); out.push(b[i]); }
      return { inputs: [S('IN.A', a), S('IN.B', b)], outputs: [S('OUT.W', out)] };
    },
  },
  {
    id: 'sortyard',
    name: 'SORTING YARD',
    group: 'ROUTING',
    brief:
      'Route each value by sign: strictly positive values to OUT.HI, everything else to OUT.LO. ' +
      'Order within each output stream must match the order of arrival.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE', 'SPLIT', 'FILTER'],
    par: { cycles: 40, chips: 1 },
    hints: [
      'A FILTER chip compares each value against a constant and sends matches east, the rest south. Click it to configure the test.',
      'A CORE can do the same job with JGZ, but it costs cycles.',
    ],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-99, 99));
      return {
        inputs: [S('IN.A', a)],
        outputs: [S('OUT.HI', a.filter((v) => v > 0)), S('OUT.LO', a.filter((v) => v <= 0))],
      };
    },
  },
  {
    id: 'sieve3',
    name: 'TRIPLE SIEVE',
    group: 'ROUTING',
    brief:
      'Only values that are exact multiples of three may reach OUT.A. Everything else must be discarded — ' +
      'and discarding still has to happen, or the line backs up.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE', 'SPLIT', 'FILTER', 'SINK'],
    par: { cycles: 48, chips: 2 },
    hints: [
      'The FILTER "%" test matches when the value divides evenly by the constant.',
      'A SINK absorbs the rejected branch so it never blocks.',
    ],
    streams: (rng) => {
      const a = seq(24, () => (rng.chance(0.4) ? rng.int(-16, 16) * 3 : rng.int(-99, 99)));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.filter((v) => v % 3 === 0))] };
    },
  },

  // ======================================================================
  // TIER 4 — MEMORY
  // ======================================================================
  {
    id: 'delayline',
    name: 'DELAY LINE',
    group: 'MEMORY',
    brief:
      'Delay the stream by three positions. The first three outputs are 0, then the input values follow, ' +
      'and the last three inputs are never emitted. The output is exactly as long as the input.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE', 'SPLIT', 'FILTER', 'SINK'],
    par: { cycles: 48, chips: 2 },
    hints: [
      'A QUEUE preloaded with three zeros behaves as a three-stage shift register.',
      'Use a CORE to push the zeros in before it starts forwarding the real stream.',
    ],
    streams: (rng) => {
      const a = seq(18, () => rng.int(-99, 99));
      const out = [0, 0, 0, ...a.slice(0, a.length - 3)];
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', out)] };
    },
  },
  {
    id: 'reversal',
    name: 'REVERSAL',
    group: 'MEMORY',
    brief:
      'The input arrives in two blocks of ten. Emit each block backwards: values 10..1, then values 20..11.',
    grid: { cols: 4, rows: 3 },
    allowed: ['CORE', 'QUEUE', 'SPLIT', 'FILTER', 'SINK', 'STACK'],
    par: { cycles: 142, chips: 2 },
    hints: [
      'A STACK returns values newest-first — that is a reversal for free.',
      'Count ten pushes, then ten pops. A CORE can count with ACC while BAK holds nothing useful.',
    ],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-99, 99));
      const out = [...a.slice(0, 10).reverse(), ...a.slice(10, 20).reverse()];
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', out)] };
    },
  },
  {
    id: 'accumulate',
    name: 'ACCUMULATOR',
    group: 'MEMORY',
    brief: 'Emit the running total: each output is the sum of every input value received so far, inclusive.',
    grid: { cols: 4, rows: 3 },
    par: { cycles: 36, chips: 1 },
    hints: ['ACC survives across loop iterations. The trick is emitting a copy without destroying it.'],
    streams: (rng) => {
      const a = seq(18, () => rng.int(-40, 40));
      let t = 0;
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map((v) => (t += v)))] };
    },
  },
  {
    id: 'highwater',
    name: 'HIGH WATER',
    group: 'MEMORY',
    brief: 'Emit the running maximum: each output is the largest input value seen so far, inclusive.',
    grid: { cols: 4, rows: 3 },
    par: { cycles: 106, chips: 2 },
    hints: ['Keep the champion in BAK. Compare by subtraction, then decide which of the two survives.'],
    streams: (rng) => {
      const a = seq(18, () => rng.int(-99, 99));
      let m = -1000;
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map((v) => (m = Math.max(m, v)))) ] };
    },
  },

  // ======================================================================
  // TIER 5 — ALGORITHMS
  // ======================================================================
  {
    id: 'pairsort',
    name: 'PAIRWISE ORDER',
    group: 'ALGORITHMS',
    brief:
      'The stream arrives as consecutive pairs. For each pair emit the smaller value first, then the larger. ' +
      'Both values always leave, only the order changes.',
    grid: { cols: 4, rows: 3 },
    par: { cycles: 100, chips: 3 },
    hints: ['Compare, then choose which of two saved values to emit first. A STACK can hold the loser.'],
    streams: (rng) => {
      const a = seq(20, () => rng.int(-99, 99));
      const out = [];
      for (let i = 0; i < a.length; i += 2) {
        out.push(Math.min(a[i], a[i + 1]), Math.max(a[i], a[i + 1]));
      }
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', out)] };
    },
  },
  {
    id: 'median',
    name: 'MEDIAN FILTER',
    group: 'ALGORITHMS',
    brief:
      'The stream arrives as consecutive triples. For each triple emit only the middle value — ' +
      'the one that is neither the largest nor the smallest.',
    grid: { cols: 5, rows: 3 },
    codeLines: 20,
    par: { cycles: 172, chips: 5 },
    hints: [
      'median(a,b,c) = a + b + c - max - min. Sums are cheap; comparisons are not.',
      'Three values will not fit in ACC and BAK alone. Park one somewhere.',
    ],
    streams: (rng) => {
      const a = seq(21, () => rng.int(-60, 60));
      const out = [];
      for (let i = 0; i < a.length; i += 3) {
        const t = [a[i], a[i + 1], a[i + 2]].sort((x, y) => x - y);
        out.push(t[1]);
      }
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', out)] };
    },
  },
  {
    id: 'rle',
    name: 'RUN LENGTH',
    group: 'ALGORITHMS',
    brief:
      'The input contains runs of repeated values. Compress it: for every run emit the value, then how many times ' +
      'it repeated. The input always ends with a run that is complete.',
    grid: { cols: 5, rows: 3 },
    codeLines: 20,
    par: { cycles: 200, chips: 4 },
    hints: [
      'You cannot see the end of a run until the value after it arrives — so you always hold one value too many.',
      'The stream is exactly 24 values long. Count them, then inject a sentinel value the data can never contain.',
    ],
    streams: (rng) => {
      const vals = [];
      const out = [];
      while (vals.length < 24) {
        const v = rng.int(1, 9);
        let n = Math.min(rng.int(1, 4), 24 - vals.length);
        // avoid accidentally merging with the previous run
        if (vals.length && vals[vals.length - 1] === v) continue;
        for (let i = 0; i < n; i++) vals.push(v);
        out.push(v, n);
      }
      return { inputs: [S('IN.A', vals)], outputs: [S('OUT.A', out)] };
    },
  },
  {
    id: 'rootext',
    name: 'ROOT EXTRACTOR',
    group: 'ALGORITHMS',
    brief:
      'For each value n, emit the largest integer r such that r squared is not greater than n. ' +
      'There is no square-root instruction. There is, however, a very old trick involving odd numbers.',
    grid: { cols: 5, rows: 3 },
    codeLines: 20,
    par: { cycles: 1700, chips: 2 },
    maxCycles: 60000,
    hints: [
      'The sum of the first r odd numbers is exactly r squared. Subtract 1, then 3, then 5, and count.',
      'A QUEUE wired from a CORE back into itself is an extra register you can read with a port operand.',
    ],
    streams: (rng) => {
      const a = seq(14, () => rng.int(0, 400));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.map((v) => Math.floor(Math.sqrt(v))))] };
    },
  },
  {
    id: 'tournament',
    name: 'TOURNAMENT',
    group: 'ALGORITHMS',
    brief:
      'The input arrives as three blocks of eight. Emit the largest value of each block, and nothing else. ' +
      'You will need somewhere to keep a counter that is not ACC and not BAK.',
    grid: { cols: 5, rows: 3 },
    codeLines: 20,
    par: { cycles: 240, chips: 3 },
    hints: [
      'Comparing costs you the value you compared. Duplicate each value before it reaches the comparator.',
      'A STACK holding a single number is a perfectly good loop counter.',
    ],
    streams: (rng) => {
      const a = [];
      const out = [];
      for (let b = 0; b < 3; b++) {
        const block = seq(8, () => rng.int(-99, 99));
        a.push(...block);
        out.push(Math.max(...block));
      }
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', out)] };
    },
  },
  {
    id: 'bubblepass',
    name: 'BUBBLE PASS',
    group: 'ALGORITHMS',
    brief:
      'The input arrives as three blocks of eight. Apply exactly one left-to-right bubble pass to each block and ' +
      'emit the result: compare positions 1 and 2 and swap them if they are out of order, then positions 2 and 3, ' +
      'and so on to the end of the block. The largest value of every block ends up last. ' +
      'This is the final assignment.',
    grid: { cols: 5, rows: 3 },
    par: { cycles: 320, chips: 4 },
    hints: [
      'Carry the larger value of each comparison forward and emit the smaller one immediately.',
      'You already built a comparator that emits the smaller value then the larger one. Build it again and drive it.',
    ],
    streams: (rng) => {
      const a = [];
      const out = [];
      for (let b = 0; b < 3; b++) {
        const block = seq(8, () => rng.int(-99, 99));
        a.push(...block);
        const w = block.slice();
        for (let i = 0; i + 1 < w.length; i++) {
          if (w[i] > w[i + 1]) { const t = w[i]; w[i] = w[i + 1]; w[i + 1] = t; }
        }
        out.push(...w);
      }
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', out)] };
    },
  },

  // ======================================================================
  // FREE PLAY
  // ======================================================================
  {
    id: 'scratch',
    name: 'SCRATCH BENCH',
    group: 'FREE PLAY',
    brief:
      'No assignment. The largest board, every chip type, and a stream of sixteen values that OUT.A will accept ' +
      'unchanged if you ever want a green light. Build whatever you like.',
    grid: { cols: 5, rows: 3 },
    par: { cycles: 32, chips: 1 },
    hints: ['Nothing to solve here. Try wiring a CORE into a loop with a STACK and watch what happens.'],
    streams: (rng) => {
      const a = seq(16, () => rng.int(-99, 99));
      return { inputs: [S('IN.A', a)], outputs: [S('OUT.A', a.slice())] };
    },
  },
];

export const GROUPS = ['ORIENTATION', 'CONTROL', 'ROUTING', 'MEMORY', 'ALGORITHMS', 'FREE PLAY'];
