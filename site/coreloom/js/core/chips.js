// CORELOOM :: chip library.
//
// Every chip is a synchronous state machine driven by a strict two-phase cycle:
//
//   phase 1  plan()    -> declares zero or more port INTENTS for this cycle
//                         ({port, kind:'read'} or {port, kind:'write', value}).
//                         Purely-internal work (arithmetic, jumps) also happens
//                         here and sets `this.worked`.
//   phase 2  settle(f) -> f(portName) reports whether that intent was satisfied,
//                         and for reads carries the value. The chip commits.
//
// Because every port carries at most one wire, intent matching needs no
// arbitration: a transfer happens iff one end offers a write and the other
// requests a read in the same cycle. That makes the whole machine deterministic
// and makes "no chip made progress this cycle" a sound proof of deadlock.

import { assemble } from './assembler.js';
import { clamp, DEFAULT_CODE_LINES } from './isa.js';

const IN = 'in';
const OUT = 'out';

/** Build a port descriptor. `t` is the fractional position along the side (0..1). */
const port = (name, side, dir, t) => ({ name, side, dir, t });

// ---------------------------------------------------------------------------
// CORE
// ---------------------------------------------------------------------------

const MODE = { EXEC: 0, READ: 1, WRITE: 2 };

export class Core {
  constructor(config = {}, code = '') {
    this.maxLines = config.maxLines ?? DEFAULT_CODE_LINES;
    const built = assemble(code, { maxLines: this.maxLines });
    this.ops = built.errors.length ? [] : built.ops;
    this.assembly = built;
    this.reset();
  }

  reset() {
    this.pc = 0;
    this.acc = 0;
    this.bak = 0;
    this.mode = MODE.EXEC;
    this.rdPort = null;
    this.wrPort = null;
    this.wrValue = 0;
    this.stageIns = null;
    this.fault = null;
    this.worked = false;
    this.activeLine = this.ops.length ? this.ops[0].line : -1;
    this.idle = 0;
    this.busy = 0;
  }

  get blocked() {
    return this.mode !== MODE.EXEC;
  }

  /** Human-readable execution state, for the inspector. */
  get status() {
    if (this.fault) return 'FAULT';
    if (!this.ops.length) return 'EMPTY';
    if (this.mode === MODE.READ) return `READ ${this.rdPort[0]}`;
    if (this.mode === MODE.WRITE) return `WRITE ${this.wrPort[0]}`;
    return 'RUN';
  }

  readValue(arg) {
    if (arg.kind === 'imm') return arg.value;
    if (arg.kind === 'reg') return arg.name === 'ACC' ? this.acc : 0;
    return 0;
  }

  advance() {
    this.pc = this.ops.length ? (this.pc + 1) % this.ops.length : 0;
  }

  /** Route a produced value to a destination operand. Returns intents. */
  deliver(value, dst) {
    if (dst.kind === 'port') {
      this.mode = MODE.WRITE;
      this.wrPort = `${dst.side}_OUT`;
      this.wrValue = clamp(value);
      return [{ port: this.wrPort, kind: 'write', value: this.wrValue }];
    }
    if (dst.name === 'ACC') this.acc = clamp(value);
    this.worked = true;
    this.advance();
    return [];
  }

  /** Apply an arithmetic / jump instruction whose source value is now known. */
  applyValue(ins, v) {
    switch (ins.op) {
      case 'ADD': this.acc = clamp(this.acc + v); break;
      case 'SUB': this.acc = clamp(this.acc - v); break;
      case 'MUL': this.acc = clamp(this.acc * v); break;
      case 'DIV':
        if (v === 0) { this.fault = `divide by zero (line ${ins.line + 1})`; return false; }
        this.acc = clamp(Math.trunc(this.acc / v));
        break;
      case 'MOD':
        if (v === 0) { this.fault = `modulo by zero (line ${ins.line + 1})`; return false; }
        this.acc = clamp(this.acc % v);
        break;
      case 'JRO': {
        const t = this.pc + v;
        this.pc = Math.max(0, Math.min(this.ops.length - 1, t));
        return true; // JRO sets pc itself; caller must not advance
      }
      default: break;
    }
    this.advance();
    return true;
  }

  plan() {
    this.worked = false;
    if (this.fault || !this.ops.length) { this.idle++; return []; }

    if (this.mode === MODE.READ) return [{ port: this.rdPort, kind: 'read' }];
    if (this.mode === MODE.WRITE) return [{ port: this.wrPort, kind: 'write', value: this.wrValue }];

    const ins = this.ops[this.pc];
    this.activeLine = ins.line;
    this.stageIns = ins;

    // Instructions with a source operand that is a port must block on a read first.
    const src = ins.args[0];
    const needsRead = src && src.kind === 'port' && ins.op !== 'JMP';
    if (needsRead) {
      this.mode = MODE.READ;
      this.rdPort = `${src.side}_IN`;
      return [{ port: this.rdPort, kind: 'read' }];
    }

    switch (ins.op) {
      case 'NOP':
        this.worked = true; this.advance(); return [];
      case 'MOV':
        return this.deliver(this.readValue(ins.args[0]), ins.args[1]);
      case 'NEG':
        this.acc = clamp(-this.acc); this.worked = true; this.advance(); return [];
      case 'SAV':
        this.bak = this.acc; this.worked = true; this.advance(); return [];
      case 'SWP': {
        const t = this.acc; this.acc = this.bak; this.bak = t;
        this.worked = true; this.advance(); return [];
      }
      case 'JMP':
        this.pc = ins.args[0].target; this.worked = true; return [];
      case 'JEZ': case 'JNZ': case 'JGZ': case 'JLZ': {
        const take =
          (ins.op === 'JEZ' && this.acc === 0) ||
          (ins.op === 'JNZ' && this.acc !== 0) ||
          (ins.op === 'JGZ' && this.acc > 0) ||
          (ins.op === 'JLZ' && this.acc < 0);
        this.pc = take ? ins.args[0].target : (this.pc + 1) % this.ops.length;
        this.worked = true;
        return [];
      }
      default:
        this.worked = true;
        this.applyValue(ins, this.readValue(ins.args[0]));
        return [];
    }
  }

  settle(get) {
    if (this.mode === MODE.READ) {
      const r = get(this.rdPort);
      if (!r || !r.ok) { this.idle++; return; }
      this.worked = true;
      this.busy++;
      const ins = this.stageIns;
      this.mode = MODE.EXEC;
      if (ins.op === 'MOV') {
        const intents = this.deliver(r.value, ins.args[1]);
        // deliver() may re-enter WRITE mode; nothing else to do here.
        void intents;
        return;
      }
      this.applyValue(ins, r.value);
      return;
    }
    if (this.mode === MODE.WRITE) {
      const r = get(this.wrPort);
      if (!r || !r.ok) { this.idle++; return; }
      this.worked = true;
      this.busy++;
      this.mode = MODE.EXEC;
      this.advance();
      return;
    }
    if (this.worked) this.busy++;
  }
}

// ---------------------------------------------------------------------------
// Memory chips
// ---------------------------------------------------------------------------

class MemoryChip {
  constructor(config = {}) {
    this.capacity = config.capacity ?? 12;
    this.reset();
  }
  reset() { this.items = []; this.worked = false; }
  get status() { return `${this.items.length}/${this.capacity}`; }

  plan() {
    this.worked = false;
    const intents = [];
    if (this.items.length) intents.push({ port: 'OUT', kind: 'write', value: this.peek() });
    if (this.items.length < this.capacity) intents.push({ port: 'IN', kind: 'read' });
    return intents;
  }

  settle(get) {
    const out = get('OUT');
    if (out && out.ok) { this.take(); this.worked = true; }
    const inn = get('IN');
    if (inn && inn.ok) { this.items.push(inn.value); this.worked = true; }
  }
}

export class Stack extends MemoryChip {
  peek() { return this.items[this.items.length - 1]; }
  take() { return this.items.pop(); }
}

export class Queue extends MemoryChip {
  peek() { return this.items[0]; }
  take() { return this.items.shift(); }
}

// ---------------------------------------------------------------------------
// SPLIT — duplicates each value to every *connected* output before accepting
// the next one. Outputs that are wired but not ready simply hold it up.
// ---------------------------------------------------------------------------

export class Split {
  constructor(config = {}, code, connected = new Set()) {
    this.outs = ['N_OUT', 'E_OUT', 'S_OUT'].filter((p) => connected.has(p));
    this.reset();
  }
  reset() { this.held = null; this.remaining = new Set(); this.worked = false; }
  get status() { return this.held === null ? 'IDLE' : `HOLD ${this.held}`; }

  plan() {
    this.worked = false;
    if (this.held === null) return [{ port: 'IN', kind: 'read' }];
    return [...this.remaining].map((p) => ({ port: p, kind: 'write', value: this.held }));
  }

  settle(get) {
    if (this.held === null) {
      const r = get('IN');
      if (!r || !r.ok) return;
      this.worked = true;
      if (!this.outs.length) return; // nothing wired: value is discarded
      this.held = r.value;
      this.remaining = new Set(this.outs);
      return;
    }
    for (const p of [...this.remaining]) {
      const r = get(p);
      if (r && r.ok) { this.remaining.delete(p); this.worked = true; }
    }
    if (!this.remaining.size) this.held = null;
  }
}

// ---------------------------------------------------------------------------
// FILTER — routes each value to PASS or FAIL according to a comparison.
// ---------------------------------------------------------------------------

export const FILTER_OPS = {
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '%': (a, b) => b !== 0 && a % b === 0,
};

export class Filter {
  constructor(config = {}, code, connected = new Set()) {
    this.op = FILTER_OPS[config.op] ? config.op : '>';
    this.operand = Number.isFinite(config.operand) ? config.operand : 0;
    this.connected = connected;
    this.reset();
  }
  reset() { this.held = null; this.target = null; this.worked = false; }
  get status() { return `x ${this.op} ${this.operand}`; }

  plan() {
    this.worked = false;
    if (this.held === null) return [{ port: 'IN', kind: 'read' }];
    return [{ port: this.target, kind: 'write', value: this.held }];
  }

  settle(get) {
    if (this.held === null) {
      const r = get('IN');
      if (!r || !r.ok) return;
      this.worked = true;
      const pass = FILTER_OPS[this.op](r.value, this.operand);
      const dest = pass ? 'E_OUT' : 'S_OUT';
      if (!this.connected.has(dest)) return; // unwired branch discards
      this.held = r.value;
      this.target = dest;
      return;
    }
    const r = get(this.target);
    if (r && r.ok) { this.held = null; this.target = null; this.worked = true; }
  }
}

// ---------------------------------------------------------------------------
// SINK — swallows everything offered to it.
// ---------------------------------------------------------------------------

export class Sink {
  constructor() { this.reset(); }
  reset() { this.count = 0; this.worked = false; }
  get status() { return `${this.count}`; }
  plan() {
    this.worked = false;
    return [{ port: 'N_IN', kind: 'read' }, { port: 'W_IN', kind: 'read' }];
  }
  settle(get) {
    for (const p of ['N_IN', 'W_IN']) {
      const r = get(p);
      if (r && r.ok) { this.count++; this.worked = true; }
    }
  }
}

// ---------------------------------------------------------------------------
// I/O docks — created from the puzzle, not placeable by the player.
// ---------------------------------------------------------------------------

export class InputDock {
  constructor(config = {}) { this.stream = config.stream || []; this.reset(); }
  reset() { this.index = 0; this.worked = false; }
  get status() { return `${this.index}/${this.stream.length}`; }
  get done() { return this.index >= this.stream.length; }
  plan() {
    this.worked = false;
    if (this.done) return [];
    return [{ port: 'OUT', kind: 'write', value: this.stream[this.index] }];
  }
  settle(get) {
    const r = get('OUT');
    if (r && r.ok) { this.index++; this.worked = true; }
  }
}

export class OutputDock {
  constructor(config = {}) {
    this.expected = config.expected || [];
    this.slack = 4; // keep accepting a few extra values so overproduction is visible
    this.reset();
  }
  reset() { this.received = []; this.worked = false; this.firstError = -1; }
  get status() { return `${this.received.length}/${this.expected.length}`; }
  get complete() { return this.received.length >= this.expected.length && this.firstError < 0; }
  plan() {
    this.worked = false;
    if (this.received.length >= this.expected.length + this.slack) return [];
    return [{ port: 'IN', kind: 'read' }];
  }
  settle(get) {
    const r = get('IN');
    if (!r || !r.ok) return;
    const i = this.received.length;
    this.received.push(r.value);
    this.worked = true;
    if (this.firstError < 0 && (i >= this.expected.length || this.expected[i] !== r.value)) {
      this.firstError = i;
    }
  }
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const CHIP_TYPES = {
  CORE: {
    label: 'CORE',
    blurb: 'Programmable execution unit. 15 lines, ACC + BAK, four bidirectional sides.',
    programmable: true,
    cost: 3,
    ports: [
      port('N_IN', 'N', IN, 0.34), port('N_OUT', 'N', OUT, 0.66),
      port('E_IN', 'E', IN, 0.34), port('E_OUT', 'E', OUT, 0.66),
      port('S_IN', 'S', IN, 0.34), port('S_OUT', 'S', OUT, 0.66),
      port('W_IN', 'W', IN, 0.34), port('W_OUT', 'W', OUT, 0.66),
    ],
    make: (cfg, code, connected) => new Core(cfg, code, connected),
  },
  STACK: {
    label: 'STACK',
    blurb: 'Last-in first-out store, 12 deep. Writes push, reads pop the newest value.',
    cost: 2,
    ports: [port('IN', 'W', IN, 0.5), port('OUT', 'E', OUT, 0.5)],
    make: (cfg) => new Stack(cfg),
  },
  QUEUE: {
    label: 'QUEUE',
    blurb: 'First-in first-out store, 12 deep. Writes enqueue, reads dequeue the oldest value.',
    cost: 2,
    ports: [port('IN', 'W', IN, 0.5), port('OUT', 'E', OUT, 0.5)],
    make: (cfg) => new Queue(cfg),
  },
  SPLIT: {
    label: 'SPLIT',
    blurb: 'Duplicates each value onto every wired output before taking the next one.',
    cost: 1,
    ports: [
      port('IN', 'W', IN, 0.5),
      port('N_OUT', 'N', OUT, 0.5), port('E_OUT', 'E', OUT, 0.5), port('S_OUT', 'S', OUT, 0.5),
    ],
    make: (cfg, code, connected) => new Split(cfg, code, connected),
  },
  FILTER: {
    label: 'FILTER',
    blurb: 'Compares each value against a constant; matches leave east, the rest leave south.',
    cost: 2,
    configurable: true,
    ports: [
      port('IN', 'W', IN, 0.5),
      port('E_OUT', 'E', OUT, 0.5), port('S_OUT', 'S', OUT, 0.5),
    ],
    make: (cfg, code, connected) => new Filter(cfg, code, connected),
  },
  SINK: {
    label: 'SINK',
    blurb: 'Absorbs any value offered to it. Useful for discarding a branch.',
    cost: 1,
    ports: [port('N_IN', 'N', IN, 0.5), port('W_IN', 'W', IN, 0.5)],
    make: () => new Sink(),
  },
  INPUT: {
    label: 'INPUT',
    blurb: 'Puzzle input stream.',
    dock: true,
    cost: 0,
    ports: [port('OUT', 'E', OUT, 0.5)],
    make: (cfg) => new InputDock(cfg),
  },
  OUTPUT: {
    label: 'OUTPUT',
    blurb: 'Puzzle output sink. Values must arrive in exactly the expected order.',
    dock: true,
    cost: 0,
    ports: [port('IN', 'W', IN, 0.5)],
    make: (cfg) => new OutputDock(cfg),
  },
};

export const PLACEABLE_TYPES = Object.keys(CHIP_TYPES).filter((t) => !CHIP_TYPES[t].dock);

export function portsOf(type) {
  return CHIP_TYPES[type]?.ports ?? [];
}

export function portInfo(type, name) {
  return portsOf(type).find((p) => p.name === name) ?? null;
}
