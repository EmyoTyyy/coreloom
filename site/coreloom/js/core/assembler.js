// CORELOOM :: assembler. Source text -> executable op list + diagnostics.
//
// Grammar (one statement per line):
//   line     := [label ':'] [instruction] [comment]
//   comment  := ('#' | '//') any*
//   operand  := number | register | port | label-ref
//
// Operands may be separated by whitespace and/or commas. Case-insensitive.

import {
  INSTRUCTIONS, MNEMONICS, SIDE_ALIAS, REGISTERS, SRC, DST, LBL,
  VAL_MIN, VAL_MAX, DEFAULT_CODE_LINES,
} from './isa.js';

const LABEL_RE = /^[a-z_][a-z0-9_]*$/i;

/**
 * @typedef {{kind:'imm', value:number}
 *         | {kind:'reg', name:string}
 *         | {kind:'port', side:string}
 *         | {kind:'label', name:string, target:number}} Operand
 */

function classifyOperand(raw) {
  const t = raw.toUpperCase();

  if (/^-?\d+$/.test(t)) {
    const value = parseInt(t, 10);
    if (value < VAL_MIN || value > VAL_MAX) {
      return { error: `literal ${value} is outside ${VAL_MIN}..${VAL_MAX}` };
    }
    return { kind: 'imm', value };
  }
  if (REGISTERS.includes(t)) return { kind: 'reg', name: t };
  if (t === 'BAK') {
    return { error: 'BAK is not directly addressable — use SAV and SWP' };
  }
  if (SIDE_ALIAS[t]) return { kind: 'port', side: SIDE_ALIAS[t] };
  if (LABEL_RE.test(raw)) return { kind: 'label', name: t, target: -1 };
  return { error: `cannot parse operand "${raw}"` };
}

function operandFits(operand, cls) {
  if (cls === SRC) return operand.kind === 'imm' || operand.kind === 'reg' || operand.kind === 'port';
  if (cls === DST) return operand.kind === 'reg' || operand.kind === 'port';
  if (cls === LBL) return operand.kind === 'label';
  return false;
}

const CLASS_NAME = { [SRC]: 'a value (number, ACC, NIL or a port)', [DST]: 'a destination (ACC, NIL or a port)', [LBL]: 'a label' };

/**
 * Assemble source into ops.
 * @param {string} source
 * @param {{maxLines?:number}} [opts]
 * @returns {{ops:Array, errors:Array<{line:number,message:string}>, labels:Object, lineCount:number}}
 */
export function assemble(source, opts = {}) {
  const maxLines = opts.maxLines ?? DEFAULT_CODE_LINES;
  const rawLines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const errors = [];
  const ops = [];
  const labels = Object.create(null);

  if (rawLines.length > maxLines) {
    // Only flag the overflowing lines that actually carry content.
    for (let i = maxLines; i < rawLines.length; i++) {
      if (rawLines[i].trim()) {
        errors.push({ line: i, message: `program exceeds ${maxLines} lines` });
        break;
      }
    }
  }

  // Pass 1 — tokenize each line into a pending statement, collecting labels.
  const pending = [];
  for (let i = 0; i < rawLines.length; i++) {
    let text = rawLines[i];
    const cut = text.search(/#|\/\//);
    if (cut >= 0) text = text.slice(0, cut);
    text = text.trim();
    if (!text) continue;

    const colon = text.indexOf(':');
    if (colon >= 0) {
      const name = text.slice(0, colon).trim();
      if (!LABEL_RE.test(name)) {
        errors.push({ line: i, message: `"${name}" is not a valid label name` });
      } else if (labels[name.toUpperCase()] !== undefined) {
        errors.push({ line: i, message: `label "${name}" is already defined` });
      } else {
        labels[name.toUpperCase()] = ops.length + pending.length;
      }
      text = text.slice(colon + 1).trim();
      if (!text) continue;
    }

    const parts = text.split(/[\s,]+/).filter(Boolean);
    pending.push({ line: i, parts });
  }

  // Pass 2 — resolve mnemonics and operands.
  for (const stmt of pending) {
    const mnemonic = stmt.parts[0].toUpperCase();
    const spec = INSTRUCTIONS[mnemonic];
    if (!spec) {
      const near = MNEMONICS.find((m) => m[0] === mnemonic[0] && m.length === mnemonic.length);
      errors.push({
        line: stmt.line,
        message: `unknown instruction "${stmt.parts[0]}"${near ? ` — did you mean ${near}?` : ''}`,
      });
      ops.push({ op: 'NOP', args: [], line: stmt.line, broken: true });
      continue;
    }

    const given = stmt.parts.slice(1);
    if (given.length !== spec.args.length) {
      errors.push({
        line: stmt.line,
        message: `${mnemonic} takes ${spec.args.length} operand${spec.args.length === 1 ? '' : 's'}, got ${given.length}`,
      });
      ops.push({ op: 'NOP', args: [], line: stmt.line, broken: true });
      continue;
    }

    const args = [];
    let ok = true;
    for (let k = 0; k < given.length; k++) {
      const parsed = classifyOperand(given[k]);
      if (parsed.error) {
        errors.push({ line: stmt.line, message: parsed.error });
        ok = false;
        break;
      }
      if (!operandFits(parsed, spec.args[k])) {
        errors.push({
          line: stmt.line,
          message: `${mnemonic} operand ${k + 1} must be ${CLASS_NAME[spec.args[k]]}`,
        });
        ok = false;
        break;
      }
      args.push(parsed);
    }
    if (!ok) {
      ops.push({ op: 'NOP', args: [], line: stmt.line, broken: true });
      continue;
    }
    ops.push({ op: mnemonic, args, line: stmt.line });
  }

  // Pass 3 — bind label references.
  for (const op of ops) {
    for (const arg of op.args) {
      if (arg.kind !== 'label') continue;
      const target = labels[arg.name];
      if (target === undefined) {
        errors.push({ line: op.line, message: `undefined label "${arg.name}"` });
        op.broken = true;
      } else {
        arg.target = Math.min(target, ops.length - 1);
      }
    }
  }

  return { ops, errors, labels, lineCount: rawLines.length };
}

/** Ports actually referenced by a program, split by direction. Used to warn about dangling wires. */
export function portUsage(ops) {
  const reads = new Set();
  const writes = new Set();
  for (const op of ops) {
    const spec = INSTRUCTIONS[op.op];
    if (!spec) continue;
    op.args.forEach((arg, i) => {
      if (arg.kind !== 'port') return;
      if (spec.args[i] === DST) writes.add(arg.side);
      else reads.add(arg.side);
    });
  }
  return { reads, writes };
}
