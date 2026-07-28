// CORELOOM :: test harness. Run with `npm test`.
//
// Three layers:
//   1. assembler unit tests
//   2. chip / scheduler semantics
//   3. every reference solution against every hidden test case
//
// Layer 3 is the important one: it is what proves the puzzle library is
// solvable within the chip set, the board size and the per-core line limits.

import { assemble } from '../web/js/core/assembler.js';
import { Machine, verify, measure, validateLayout, HALT } from '../web/js/core/machine.js';
import { compileAll } from '../web/js/core/puzzle.js';
import { PUZZLE_DEFS } from '../web/js/data/puzzles.js';
import { Rng } from '../web/js/util/rng.js';
import { SOLUTIONS, layout } from './solutions.js';

let passed = 0;
let failed = 0;
const failures = [];

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function ok(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ${C.green('pass')}  ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ${C.red('FAIL')}  ${name}${detail ? C.dim(` — ${detail}`) : ''}`);
  }
}

function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  ok(name, a === b, a === b ? '' : `got ${a}, want ${b}`);
}

function section(title) {
  console.log(`\n${C.bold(title)}`);
}

// ===========================================================================
section('assembler');
// ===========================================================================

{
  const r = assemble('MOV W ACC\nADD 5\nMOV ACC E');
  eq('assembles a simple program', r.ops.map((o) => o.op), ['MOV', 'ADD', 'MOV']);
  eq('no errors on valid source', r.errors, []);
}
{
  const r = assemble('top: MOV W ACC # comment\n  JMP top // trailing');
  eq('label shares a line with an instruction', r.labels, { TOP: 0 });
  eq('comments are stripped', r.ops.length, 2);
  eq('label resolves to an op index', r.ops[1].args[0].target, 0);
}
{
  const r = assemble('MOV W');
  ok('wrong operand count is an error', r.errors.length === 1);
  ok('error names the instruction', /MOV takes 2 operands/.test(r.errors[0]?.message || ''));
}
{
  const r = assemble('JMP nowhere');
  ok('undefined label is an error', /undefined label/.test(r.errors[0]?.message || ''));
}
{
  const r = assemble('ADD BAK');
  ok('BAK is rejected as an operand', /not directly addressable/.test(r.errors[0]?.message || ''));
}
{
  const r = assemble('MOV 5 7');
  ok('literal is rejected as a destination', r.errors.length === 1);
}
{
  const r = assemble('MOV 1200 ACC');
  ok('out-of-range literal is an error', /outside/.test(r.errors[0]?.message || ''));
}
{
  const r = assemble('MOV UP DOWN\nMOV LEFT RIGHT');
  eq('directional aliases map to sides',
    r.ops.map((o) => o.args.map((a) => a.side)), [['N', 'S'], ['W', 'E']]);
}
{
  const r = assemble('NOP\n'.repeat(20), { maxLines: 15 });
  ok('line limit is enforced', r.errors.some((e) => /exceeds 15 lines/.test(e.message)));
}
{
  const r = assemble('a: NOP\na: NOP');
  ok('duplicate label is an error', /already defined/.test(r.errors[0]?.message || ''));
}

// ===========================================================================
section('machine semantics');
// ===========================================================================

// A hand-built micro-puzzle so scheduler behaviour can be asserted directly.
function microPuzzle(input, expected, over = {}) {
  return {
    id: 'micro', name: 'micro', grid: { cols: 4, rows: 3 }, codeLines: 20,
    maxCycles: 5000, testCount: 1,
    docks: [
      { id: 'in0', kind: 'INPUT', name: 'IN.A', side: 'W', slot: 0 },
      { id: 'out0', kind: 'OUTPUT', name: 'OUT.A', side: 'E', slot: 0 },
    ],
    testCase: () => ({ inputs: { 'IN.A': input }, outputs: { 'OUT.A': expected } }),
    ...over,
  };
}

{
  const p = microPuzzle([1, 2, 3], [1, 2, 3]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W E'] }, ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('relay reaches success', m.state, HALT.SUCCESS);
  eq('MOV port->port costs two cycles per value', m.cycle, 6);
}
{
  // MOV port->register completes in a single cycle when the data is ready.
  const p = microPuzzle([7], [7]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W ACC\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('read-to-register then write costs two cycles', m.cycle, 2);
}
{
  // Nothing wired: the core blocks forever, which must be detected as deadlock
  // rather than spun on until the cycle cap.
  const p = microPuzzle([1], [1]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W E'] }, []);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('unwired core deadlocks', m.state, HALT.DEADLOCK);
  ok('deadlock is detected immediately', m.cycle <= 2, `took ${m.cycle} cycles`);
}
{
  const p = microPuzzle([1, 2], [99, 99]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W E'] }, ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('wrong value halts with a mismatch', m.state, HALT.MISMATCH);
  ok('mismatch names the position', /position 1/.test(m.message), m.message);
}
{
  const p = microPuzzle([0], [0]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W ACC\nDIV 0\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('divide by zero faults', m.state, HALT.FAULT);
  ok('fault reports the line', /line 2/.test(m.message), m.message);
}
{
  // STACK reverses, QUEUE preserves. Same wiring, one chip swapped.
  const push = `MOV 4 ACC
lp: MOV W S
    SUB 1
    JNZ lp
    MOV 4 ACC
po: MOV N E
    SUB 1
    JNZ po`;
  for (const [type, expected] of [['STACK', [4, 3, 2, 1]], ['QUEUE', [1, 2, 3, 4]]]) {
    const p = microPuzzle([1, 2, 3, 4], expected);
    const l = layout({ c1: ['CORE', 0, 0, push], m1: [type, 1, 0] },
      ['in0.OUT -> c1.W_IN', 'c1.S_OUT -> m1.IN', 'm1.OUT -> c1.N_IN', 'c1.E_OUT -> out0.IN']);
    const m = new Machine(l, p, p.testCase(0));
    m.run();
    eq(`${type} ordering`, m.state, HALT.SUCCESS);
  }
}
{
  // SPLIT must hold a value until every wired output has taken it.
  const p = {
    ...microPuzzle([5, 6], [5, 6]),
    docks: [
      { id: 'in0', kind: 'INPUT', name: 'IN.A', side: 'W', slot: 0 },
      { id: 'out0', kind: 'OUTPUT', name: 'OUT.A', side: 'E', slot: 0 },
      { id: 'out1', kind: 'OUTPUT', name: 'OUT.B', side: 'E', slot: 1 },
    ],
    testCase: () => ({ inputs: { 'IN.A': [5, 6] }, outputs: { 'OUT.A': [5, 6], 'OUT.B': [5, 6] } }),
  };
  const l = layout({ s1: ['SPLIT', 0, 0] },
    ['in0.OUT -> s1.IN', 's1.E_OUT -> out0.IN', 's1.S_OUT -> out1.IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('SPLIT feeds both outputs', m.state, HALT.SUCCESS);
}
{
  // FILTER routing, including the negative-multiple case for '%'.
  const vals = [-9, 4, 3, 7, 0];
  const p = {
    ...microPuzzle(vals, []),
    docks: [
      { id: 'in0', kind: 'INPUT', name: 'IN.A', side: 'W', slot: 0 },
      { id: 'out0', kind: 'OUTPUT', name: 'OUT.A', side: 'E', slot: 0 },
    ],
    testCase: () => ({ inputs: { 'IN.A': vals }, outputs: { 'OUT.A': [-9, 3, 0] } }),
  };
  const l = layout({ f1: ['FILTER', 0, 0, '', { op: '%', operand: 3 }], k1: ['SINK', 0, 1] },
    ['in0.OUT -> f1.IN', 'f1.E_OUT -> out0.IN', 'f1.S_OUT -> k1.N_IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('FILTER % handles negatives', m.state, HALT.SUCCESS);
}
{
  // Determinism: identical runs must produce identical cycle counts.
  const p = microPuzzle([3, 1, 4, 1, 5], [3, 1, 4, 1, 5]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W E'] }, ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN']);
  const a = new Machine(l, p, p.testCase(0)); a.run();
  const b = new Machine(l, p, p.testCase(0)); b.run();
  eq('simulation is deterministic', a.cycle, b.cycle);
}
{
  // ACC saturates rather than overflowing.
  const p = microPuzzle([500], [999]);
  const l = layout({ c1: ['CORE', 0, 0, 'MOV W ACC\nMUL 5\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN']);
  const m = new Machine(l, p, p.testCase(0));
  m.run();
  eq('values clamp at 999', m.state, HALT.SUCCESS);
}
{
  const l = layout({ c1: ['CORE', 0, 0, 'NOP'], c2: ['CORE', 0, 0, 'NOP'] }, []);
  const p = microPuzzle([1], [1]);
  ok('overlapping chips are rejected',
    validateLayout(l, { ...p, grid: { cols: 4, rows: 3 } }).some((s) => /same cell/.test(s)));
}
{
  const l = layout({ c1: ['CORE', 0, 0, 'NOP'] }, ['c1.W_IN -> c1.E_OUT']);
  const p = microPuzzle([1], [1]);
  ok('backwards wire is rejected',
    validateLayout(l, { ...p, grid: { cols: 4, rows: 3 } }).some((s) => /output to an input/.test(s)));
}
{
  const l = layout({ c1: ['CORE', 0, 0, 'NOP'], c2: ['CORE', 1, 0, 'NOP'] },
    ['c1.E_OUT -> c2.W_IN', 'c1.E_OUT -> c2.N_IN']);
  const p = microPuzzle([1], [1]);
  ok('one wire per port is enforced',
    validateLayout(l, { ...p, grid: { cols: 4, rows: 3 } }).some((s) => /more than one wire/.test(s)));
}

// ===========================================================================
section('determinism of generated test cases');
// ===========================================================================

{
  const a = new Rng('seed'); const b = new Rng('seed');
  eq('same seed, same stream', [a.int(0, 1e6), a.int(0, 1e6)], [b.int(0, 1e6), b.int(0, 1e6)]);
  const puzzles = compileAll(PUZZLE_DEFS);
  const p = puzzles[0];
  eq('test cases are stable across calls',
    JSON.stringify(p.testCase(1)), JSON.stringify(p.testCase(1)));
  ok('different indices give different data',
    JSON.stringify(p.testCase(0)) !== JSON.stringify(p.testCase(1)));
}

// ===========================================================================
section('reference solutions');
// ===========================================================================

const puzzles = compileAll(PUZZLE_DEFS);
const report = [];

for (const p of puzzles) {
  const sol = SOLUTIONS[p.id];
  if (!sol) {
    ok(`${p.id} has a reference solution`, false, 'missing');
    continue;
  }
  const res = verify(sol, p, { stopEarly: false });
  if (!res.pass) {
    const bad = res.tests.find((t) => !t.pass);
    ok(`${p.id.padEnd(11)} ${p.name}`, false,
      res.problems.length ? res.problems.join('; ') : `case ${bad?.index}: ${bad?.state} — ${bad?.message}`);
    continue;
  }
  ok(`${p.id.padEnd(11)} ${p.name}`, true);
  report.push({
    id: p.id,
    name: p.name,
    cycles: res.cycles,
    parCycles: p.par?.cycles ?? 0,
    chips: res.metrics.chips,
    parChips: p.par?.chips ?? 0,
    instructions: res.metrics.instructions,
  });
}

// ===========================================================================
section('par sanity');
// ===========================================================================

for (const r of report) {
  // Par is calibrated against the reference solution: close enough that it is a
  // real target, tight enough that hitting it takes deliberate optimisation.
  // Too loose and the score is decoration; too tight and it is discouraging.
  const ratio = r.parCycles / r.cycles;
  ok(`${r.id.padEnd(11)} par is calibrated`,
    ratio >= 0.55 && ratio <= 1.05 && r.chips <= r.parChips,
    `ref ${r.cycles}c/${r.chips} chips vs par ${r.parCycles}c/${r.parChips} chips (ratio ${ratio.toFixed(2)})`);
}

// ===========================================================================
console.log(`\n${C.bold('reference solution scores')}`);
console.log(C.dim('  puzzle       cycles   par     chips  instr'));
for (const r of report) {
  const flag = r.cycles <= r.parCycles ? C.green('*') : ' ';
  console.log(
    `  ${r.id.padEnd(12)} ${String(r.cycles).padStart(6)} ${String(r.parCycles).padStart(6)} ${flag}  ` +
    `${String(r.chips).padStart(5)}  ${String(r.instructions).padStart(5)}`,
  );
}

console.log(`\n${passed + failed} checks — ${C.green(`${passed} passed`)}${failed ? `, ${C.red(`${failed} failed`)}` : ''}`);
if (failed) {
  console.log(`\n${C.red('failures:')}`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(C.green('\nall good.\n'));
