// CORELOOM :: side panels, modals and readouts.

import { el, clear } from '../util/dom.js';
import { INSTRUCTIONS } from '../core/isa.js';
import { CHIP_TYPES, PLACEABLE_TYPES } from '../core/chips.js';
import { GROUPS } from '../data/puzzles.js';
import { store } from '../util/store.js';

export function renderAssignmentList(host, puzzles, currentId, onPick) {
  clear(host);
  const solvedCount = puzzles.filter((p) => store.solved(p.id)).length;

  host.append(el('div', { class: 'side-head' }, [
    el('span', { text: 'ASSIGNMENTS' }),
    el('span', { class: 'side-count', text: `${solvedCount}/${puzzles.length}` }),
  ]));

  for (const group of GROUPS) {
    const items = puzzles.filter((p) => p.group === group);
    if (!items.length) continue;
    host.append(el('div', { class: 'side-group', text: group }));
    for (const p of items) {
      const solved = store.solved(p.id);
      const best = store.bestScore(p.id);
      host.append(el('button', {
        class: `side-item${p.id === currentId ? ' active' : ''}${solved ? ' solved' : ''}`,
        onclick: () => onPick(p.id),
      }, [
        el('span', { class: 'si-mark', text: solved ? '✓' : '·' }),
        el('span', { class: 'si-name', text: p.name }),
        best ? el('span', { class: 'si-score', text: `${best.cycles}c` }) : null,
      ]));
    }
  }
}

export function renderPalette(host, puzzle, armed, onArm) {
  clear(host);
  const allowed = puzzle.allowed || PLACEABLE_TYPES;
  for (const type of PLACEABLE_TYPES) {
    if (!allowed.includes(type)) continue;
    const def = CHIP_TYPES[type];
    host.append(el('button', {
      class: `pal-btn${armed === type ? ' armed' : ''}`,
      title: `${def.blurb}\n\nClick to arm, then click an empty cell.`,
      onclick: () => onArm(armed === type ? null : type),
    }, [
      el('span', { class: `pal-dot pal-${type.toLowerCase()}` }),
      el('span', { text: def.label }),
    ]));
  }

  // The output/input nub distinction is the one thing players cannot guess, so
  // the key for it stays on screen permanently rather than living in a manual.
  host.append(el('div', { class: 'pal-legend' }, [
    el('span', { class: 'lg-out' }),
    el('span', { class: 'lg-text', text: 'output' }),
    el('span', { class: 'lg-arrow', text: '→' }),
    el('span', { class: 'lg-in' }),
    el('span', { class: 'lg-text', text: 'input' }),
    el('span', { class: 'lg-note', text: 'drag between nubs to wire · right-click to remove' }),
  ]));
}

export function renderBrief(host, puzzle, machine, hintsShown, onHint) {
  clear(host);
  const best = store.bestScore(puzzle.id);

  host.append(el('div', { class: 'brief-title' }, [
    el('h2', { text: puzzle.name }),
    el('span', { class: 'brief-tier', text: puzzle.group }),
  ]));
  host.append(el('p', { class: 'brief-text', text: puzzle.brief }));

  const scoreRow = el('div', { class: 'scores' });
  const stat = (label, value, par) => el('div', { class: 'stat' }, [
    el('span', { class: 'stat-label', text: label }),
    el('span', { class: `stat-value${par != null && value != null && value <= par ? ' under' : ''}`, text: value ?? '—' }),
    el('span', { class: 'stat-par', text: par != null ? `par ${par}` : '' }),
  ]);
  scoreRow.append(stat('BEST CYCLES', best?.cycles, puzzle.par?.cycles));
  scoreRow.append(stat('BEST CHIPS', best?.chips, puzzle.par?.chips));
  scoreRow.append(stat('BEST INSTR', best?.instructions, null));
  host.append(scoreRow);

  if (puzzle.hints?.length) {
    const shown = hintsShown || 0;
    for (let i = 0; i < shown && i < puzzle.hints.length; i++) {
      host.append(el('p', { class: 'hint', text: puzzle.hints[i] }));
    }
    if (shown < puzzle.hints.length) {
      host.append(el('button', {
        class: 'link-btn',
        text: shown === 0 ? 'reveal a hint' : 'reveal another hint',
        onclick: onHint,
      }));
    }
  }
}

export function renderStreams(host, puzzle, machine, testIndex) {
  clear(host);
  const tc = puzzle.testCase(testIndex);

  host.append(el('div', { class: 'panel-head' }, [
    el('span', { text: 'STREAMS' }),
    el('span', { class: 'panel-sub', text: `test ${testIndex + 1} of ${puzzle.testCount}` }),
  ]));

  const cols = [];
  for (const name of puzzle.inputNames) {
    const rt = machine?.inputs.find((d) => d.name === name)?.impl;
    cols.push({ name, kind: 'in', values: tc.inputs[name], cursor: rt?.index ?? -1 });
  }
  for (const name of puzzle.outputNames) {
    const rt = machine?.outputs.find((d) => d.name === name)?.impl;
    cols.push({
      name, kind: 'out', values: tc.outputs[name],
      got: rt?.received ?? [], bad: rt?.firstError ?? -1,
    });
  }

  const table = el('div', { class: 'streams', style: `--cols:${cols.length}` });
  for (const col of cols) {
    const box = el('div', { class: `stream stream-${col.kind}` });
    box.append(el('div', { class: 'stream-name', text: col.name }));
    const list = el('div', { class: 'stream-list' });
    const rows = Math.max(col.values.length, col.got?.length ?? 0);
    for (let i = 0; i < rows; i++) {
      const want = col.values[i];
      if (col.kind === 'in') {
        list.append(el('div', {
          class: `cellv${i < col.cursor ? ' consumed' : ''}${i === col.cursor ? ' next' : ''}`,
          text: want ?? '',
        }));
      } else {
        const got = col.got[i];
        const has = i < col.got.length;
        const wrong = has && got !== want;
        list.append(el('div', {
          class: `cellv${has ? (wrong ? ' wrong' : ' okv') : ''}`,
        }, [
          el('span', { class: 'want', text: want ?? '—' }),
          has && wrong ? el('span', { class: 'got', text: got }) : null,
        ]));
      }
    }
    box.append(list);
    table.append(box);
  }
  host.append(table);
}

export function renderInspector(host, entity, puzzle, hooks) {
  clear(host);
  if (!entity) {
    host.append(el('div', { class: 'empty-note' }, [
      el('p', { text: 'Nothing selected.' }),
      el('p', { class: 'dim', text: 'Pick a chip from the palette and click a cell to place it. Drag between port nubs to lay a wire. Right-click removes.' }),
    ]));
    return;
  }

  const def = CHIP_TYPES[entity.type];
  host.append(el('div', { class: 'insp-head' }, [
    el('span', { class: 'insp-type', text: def.label }),
    el('span', { class: 'insp-blurb', text: def.blurb }),
    !def.dock ? el('button', { class: 'x-btn', text: '✕ remove', onclick: hooks.onDelete }) : null,
  ]));

  if (entity.type === 'FILTER') {
    const cfg = entity.config || {};
    const row = el('div', { class: 'cfg-row' });
    const opSel = el('select', { class: 'cfg-input' });
    for (const op of ['>', '>=', '<', '<=', '==', '!=', '%']) {
      opSel.append(el('option', { value: op, text: op === '%' ? '% divides evenly by' : op, selected: (cfg.op ?? '>') === op }));
    }
    const num = el('input', { class: 'cfg-input', type: 'number', value: cfg.operand ?? 0, min: -999, max: 999 });
    // Read both fields on every change rather than patching a captured copy, so
    // the panel never writes back a stale value for the field that did not move.
    const push = () => hooks.onConfig({
      op: opSel.value,
      operand: Math.max(-999, Math.min(999, Number(num.value) | 0)),
    });
    opSel.addEventListener('change', push);
    num.addEventListener('change', push);
    row.append(el('span', { class: 'cfg-label', text: 'value' }), opSel, num);
    host.append(row);
    host.append(el('p', { class: 'dim small', text: 'Values that match leave through the east port. Everything else leaves through the south port. An unwired branch is discarded.' }));
  }
}

export function isaModal() {
  const rows = Object.entries(INSTRUCTIONS).map(([name, spec]) => el('tr', {}, [
    el('td', { class: 'isa-op', text: name }),
    el('td', { class: 'isa-args', text: spec.args.join(' ').replace(/SRC/g, 'src').replace(/DST/g, 'dst').replace(/LBL/g, 'label') }),
    el('td', { text: spec.doc }),
  ]));

  return el('div', { class: 'modal-body' }, [
    el('h3', { text: 'INSTRUCTION SET' }),
    el('table', { class: 'isa' }, [el('tbody', {}, rows)]),
    el('h3', { text: 'OPERANDS' }),
    el('ul', { class: 'notes' }, [
      el('li', { html: '<b>ACC</b> — the accumulator. Every arithmetic instruction reads and writes it.' }),
      el('li', { html: '<b>BAK</b> — a second register you cannot address directly. <b>SAV</b> copies ACC into it, <b>SWP</b> exchanges the two.' }),
      el('li', { html: '<b>NIL</b> — reads as zero, discards anything written to it.' }),
      el('li', { html: '<b>N E S W</b> — the four sides of the core. <b>UP RIGHT DOWN LEFT</b> mean the same thing. Reading a side uses its input port, writing uses its output port, so a side can carry traffic both ways at once.' }),
      el('li', { html: 'Numbers run from <b>-999</b> to <b>999</b>. Results outside that range are clamped, not wrapped.' }),
    ]),
    el('h3', { text: 'HOW A CYCLE WORKS' }),
    el('ul', { class: 'notes' }, [
      el('li', { text: 'Every chip declares what it wants to do this cycle, then all transfers that have a willing writer and a willing reader happen at once, then every chip commits.' }),
      el('li', { text: 'A transfer only happens when both ends are ready in the same cycle. Whichever side arrives first waits, doing nothing, and that wait costs cycles.' }),
      el('li', { text: 'Each port carries at most one wire. To send a value to two places, use a SPLIT or write it twice.' }),
      el('li', { text: 'If a whole cycle passes in which nothing moved, nothing ever will — the machine is deterministic, so that state is a genuine deadlock and the run stops there.' }),
    ]),
    el('h3', { text: 'KEYS' }),
    el('ul', { class: 'notes' }, [
      el('li', { html: '<b>space</b> run or stop · <b>.</b> single cycle · <b>r</b> reset · <b>enter</b> verify' }),
      el('li', { html: '<b>delete</b> remove selection · <b>esc</b> cancel placement · <b>f</b> fit board · <b>?</b> this panel' }),
      el('li', { html: 'scroll to zoom, drag the background to pan, right-click a chip or wire to remove it' }),
    ]),
  ]);
}

export function verifyModal(puzzle, result, onClose) {
  const body = el('div', { class: 'modal-body' });
  const pass = result.pass;

  body.append(el('h3', { class: pass ? 'ok' : 'bad', text: pass ? 'VERIFIED' : 'REJECTED' }));

  if (result.problems.length) {
    body.append(el('ul', { class: 'notes' }, result.problems.map((p) => el('li', { class: 'bad', text: p }))));
  }

  const list = el('div', { class: 'test-list' });
  for (const t of result.tests) {
    list.append(el('div', { class: `test-row${t.pass ? ' ok' : ' bad'}` }, [
      el('span', { class: 'tr-name', text: `test ${t.index + 1}` }),
      el('span', { class: 'tr-state', text: t.pass ? `passed in ${t.cycles} cycles` : t.message }),
    ]));
  }
  body.append(list);

  if (pass) {
    const m = result.metrics;
    const par = puzzle.par || {};
    body.append(el('div', { class: 'scores big' }, [
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat-label', text: 'CYCLES' }),
        el('span', { class: `stat-value${m && result.cycles <= (par.cycles ?? Infinity) ? ' under' : ''}`, text: result.cycles }),
        el('span', { class: 'stat-par', text: par.cycles ? `par ${par.cycles}` : '' }),
      ]),
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat-label', text: 'CHIPS' }),
        el('span', { class: `stat-value${m.chips <= (par.chips ?? Infinity) ? ' under' : ''}`, text: m.chips }),
        el('span', { class: 'stat-par', text: par.chips ? `par ${par.chips}` : '' }),
      ]),
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat-label', text: 'INSTRUCTIONS' }),
        el('span', { class: 'stat-value', text: m.instructions }),
      ]),
      el('div', { class: 'stat' }, [
        el('span', { class: 'stat-label', text: 'WIRES' }),
        el('span', { class: 'stat-value', text: m.wires }),
      ]),
    ]));
    body.append(el('p', { class: 'dim small', text: 'Cycles are counted on the slowest of the three test cases. Every metric keeps its own record, so a design that is small and a design that is fast can both stand.' }));
  }

  body.append(el('button', { class: 'btn primary wide', text: 'close', onclick: onClose }));
  return body;
}
