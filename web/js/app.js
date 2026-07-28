// CORELOOM :: application controller.

import { $, el, clear, debounce, toast } from './util/dom.js';
import { store } from './util/store.js';
import { compileAll } from './core/puzzle.js';
import { PUZZLE_DEFS } from './data/puzzles.js';
import { Machine, verify, measure, validateLayout, emptyLayout, cloneLayout, HALT } from './core/machine.js';
import { CHIP_TYPES } from './core/chips.js';
import { BoardView } from './ui/board.js';
import { CodeEditor } from './ui/editor.js';
import { Tutor, relayTour } from './ui/tutor.js';
import {
  renderAssignmentList, renderPalette, renderBrief, renderStreams,
  renderInspector, isaModal, verifyModal,
} from './ui/panels.js';

const SPEEDS = [
  { label: '1×', cps: 3 },
  { label: '2×', cps: 12 },
  { label: '4×', cps: 45 },
  { label: '8×', cps: 200 },
  { label: 'MAX', cps: Infinity },
];

class App {
  constructor() {
    this.puzzles = compileAll(PUZZLE_DEFS);
    this.byId = new Map(this.puzzles.map((p) => [p.id, p]));

    this.puzzle = null;
    this.layout = emptyLayout();
    this.machine = null;
    this.testIndex = 0;
    this.running = false;
    this.speedIndex = 1;
    this.hintsShown = 0;
    this.selection = null;
    this.accumulator = 0;
    this.lastFrame = performance.now();

    this.save = debounce(() => {
      if (this.puzzle) store.saveDesign(this.puzzle.id, this.layout);
    }, 350);

    this.buildDom();
    this.bindKeys();
    window.addEventListener('beforeunload', () => this.save.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save.flush();
    });

    const start = new URLSearchParams(location.search).get('p');
    const first = store.isFirstVisit();
    this.openPuzzle(this.byId.has(start) ? start : this.firstUnsolved());
    this.loop();

    // A brand new player lands on the walkthrough rather than on a blank board.
    if (first && this.puzzle.id === 'relay') {
      setTimeout(() => this.startTour(), 420);
    }
  }

  firstUnsolved() {
    return (this.puzzles.find((p) => !store.solved(p.id)) || this.puzzles[0]).id;
  }

  // -------------------------------------------------------------------- setup

  buildDom() {
    this.sidebar = $('#sidebar');
    this.canvas = $('#board');
    this.paletteHost = $('#palette');
    this.briefHost = $('#brief');
    this.streamsHost = $('#streams');
    this.inspectorHost = $('#inspector');
    this.editorHost = $('#editor-host');
    this.editorTitle = $('#editor-title');
    this.transport = $('#transport');
    this.modal = $('#modal');
    this.modalCard = $('#modal-card');

    this.board = new BoardView(this.canvas, {
      onSelect: (sel) => this.onSelect(sel),
      onPlace: (type, c, r) => this.placeChip(type, c, r),
      onMove: (id, c, r) => this.moveChip(id, c, r),
      onConnect: (a, b) => this.connect(a, b),
      onDelete: (sel) => this.deleteEntity(sel),
      onOpen: () => this.editor.area.focus(),
    });

    this.editor = new CodeEditor(this.editorHost, {
      onChange: (code) => this.onCodeChange(code),
    });

    this.tutor = new Tutor(this);

    new ResizeObserver(() => { this.board.resize(); }).observe(this.canvas);

    this.buildTransport();

    $('#btn-isa').addEventListener('click', () => this.showModal(isaModal()));
    $('#btn-tour').addEventListener('click', () => this.startTour());
    $('#btn-fit').addEventListener('click', () => this.board.fit());
    $('#btn-clear').addEventListener('click', () => this.clearBoard());
    $('#btn-export').addEventListener('click', () => this.exportDesign());
    $('#btn-import').addEventListener('click', () => this.importDesign());
    this.modal.addEventListener('click', (ev) => { if (ev.target === this.modal) this.hideModal(); });
  }

  buildTransport() {
    clear(this.transport);
    this.btnRun = el('button', { class: 'btn primary', onclick: () => this.toggleRun() }, ['▶ run']);
    this.btnStep = el('button', { class: 'btn', onclick: () => this.step() }, ['▸ step']);
    this.btnReset = el('button', { class: 'btn', onclick: () => this.reset() }, ['↺ reset']);
    this.btnVerify = el('button', { class: 'btn verify', onclick: () => this.runVerify() }, ['✓ verify']);

    this.speedBtn = el('button', {
      class: 'btn speed',
      onclick: () => {
        this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
        this.speedBtn.textContent = `speed ${SPEEDS[this.speedIndex].label}`;
      },
    }, [`speed ${SPEEDS[this.speedIndex].label}`]);

    this.testBtn = el('button', {
      class: 'btn',
      onclick: () => {
        this.testIndex = (this.testIndex + 1) % this.puzzle.testCount;
        this.reset();
        this.refreshPanels();
      },
    }, ['test 1']);

    this.readout = el('div', { class: 'readout' });

    this.transport.append(
      this.btnRun, this.btnStep, this.btnReset, this.speedBtn,
      el('div', { class: 'spacer' }), this.testBtn, this.readout, this.btnVerify,
    );
  }

  bindKeys() {
    window.addEventListener('keydown', (ev) => {
      if (ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'INPUT') return;
      if (ev.metaKey || ev.ctrlKey) return;
      switch (ev.key) {
        case ' ': ev.preventDefault(); this.toggleRun(); break;
        case '.': this.step(); break;
        case 'r': this.reset(); break;
        case 'f': this.board.fit(); break;
        case 'Enter': this.runVerify(); break;
        case 'Escape':
          if (this.modal.classList.contains('open')) this.hideModal();
          else { this.board.armedType = null; this.refreshPalette(); }
          break;
        case '?': this.showModal(isaModal()); break;
        case 'Delete': case 'Backspace':
          if (this.selection) this.deleteEntity(this.selection);
          break;
        default: break;
      }
    });
  }

  // ------------------------------------------------------------------ puzzles

  /** The walkthrough teaches on the first assignment, so make sure we are on it. */
  startTour() {
    if (this.puzzle.id !== 'relay') this.openPuzzle('relay');
    this.hideModal();
    this.tutor.start(relayTour());
  }

  openPuzzle(id) {
    // commit any debounced edit while it still belongs to the outgoing puzzle
    this.save.flush();
    // wandering off the first assignment ends the walkthrough rather than
    // leaving it pointing at chips that are no longer on screen
    if (this.tutor?.active && id !== 'relay') this.tutor.stop(true);
    this.puzzle = this.byId.get(id);
    this.layout = store.loadDesign(id) || emptyLayout();
    this.migrateLayout();
    this.testIndex = 0;
    this.hintsShown = 0;
    this.running = false;
    this.board.armedType = null;
    this.board.setPuzzle(this.puzzle, this.layout);
    this.selection = null;
    store.markSeen(id);
    history.replaceState(null, '', `?p=${id}`);
    $('#puzzle-name').textContent = this.puzzle.name;
    this.reset();
    this.refreshAll();
  }

  /** Drop anything a saved design refers to that this puzzle no longer offers. */
  migrateLayout() {
    const allowed = this.puzzle.allowed;
    this.layout.chips = this.layout.chips.filter((c) => {
      if (!CHIP_TYPES[c.type]) return false;
      if (allowed && !allowed.includes(c.type)) return false;
      return c.c < this.puzzle.grid.cols && c.r < this.puzzle.grid.rows;
    });
    const live = new Set([...this.layout.chips.map((c) => c.id), ...this.puzzle.docks.map((d) => d.id)]);
    this.layout.wires = this.layout.wires.filter((w) => live.has(w.from[0]) && live.has(w.to[0]));
  }

  // --------------------------------------------------------------- simulation

  reset() {
    this.running = false;
    this.announced = false;
    const tc = this.puzzle.testCase(this.testIndex);
    this.machine = new Machine(this.layout, this.puzzle, tc);
    this.board.setMachine(this.machine);
    this.accumulator = 0;
    this.refreshTransport();
    this.refreshStreams();
  }

  step(n = 1) {
    const m = this.machine;
    if (!m) return;
    for (let i = 0; i < n && m.state === HALT.RUNNING; i++) m.step();
    // Only the final cycle of a burst is animated. Pushing a pulse per cycle
    // would light every wire at once as soon as the speed passes one cycle
    // per frame, which reads as noise rather than dataflow.
    this.board.notePulses(m.lastTransfers);
    if (m.state !== HALT.RUNNING) this.onHalt();
    this.syncEditorCursor();
    this.refreshTransport();
    this.refreshStreams();
  }

  toggleRun() {
    if (!this.machine) return;
    if (this.machine.state !== HALT.RUNNING) this.reset();
    this.running = !this.running;
    this.refreshTransport();
  }

  /** Announce the outcome exactly once per run, whether stepping or free-running. */
  onHalt() {
    this.running = false;
    if (this.announced) return;
    this.announced = true;
    const m = this.machine;
    const kind = m.state === HALT.SUCCESS ? 'good' : m.state === HALT.MISMATCH ? 'bad' : 'warn';
    toast(
      m.state === HALT.SUCCESS
        ? `test ${this.testIndex + 1} passed in ${m.cycle} cycles — press enter to verify all tests`
        : m.message,
      kind, 4600,
    );
  }

  loop() {
    const now = performance.now();
    const dt = Math.min(64, now - this.lastFrame);
    this.lastFrame = now;

    if (this.running && this.machine?.state === HALT.RUNNING) {
      const speed = SPEEDS[this.speedIndex].cps;
      if (speed === Infinity) {
        this.step(4000);
      } else {
        this.accumulator += (dt / 1000) * speed;
        const n = Math.floor(this.accumulator);
        if (n > 0) { this.accumulator -= n; this.step(Math.min(n, 4000)); }
      }
    }

    this.board.render(dt);
    this.tutor.tick();
    requestAnimationFrame(() => this.loop());
  }

  // ----------------------------------------------------------------- editing

  markDirty() {
    this.save();
    this.reset();
    this.refreshStreams();
  }

  nextId(type) {
    let n = 1;
    const taken = new Set(this.layout.chips.map((c) => c.id));
    while (taken.has(`${type.toLowerCase()}${n}`)) n++;
    return `${type.toLowerCase()}${n}`;
  }

  placeChip(type, c, r) {
    if (this.layout.chips.some((k) => k.c === c && k.r === r)) {
      toast('that cell is taken', 'warn');
      return;
    }
    const chip = { id: this.nextId(type), type, c, r, code: '', config: {} };
    if (type === 'FILTER') chip.config = { op: '>', operand: 0 };
    this.layout.chips.push(chip);
    this.board.armedType = null;
    this.board.select({ kind: 'chip', id: chip.id });
    this.markDirty();
    this.refreshPalette();
  }

  moveChip(id, c, r) {
    const chip = this.layout.chips.find((k) => k.id === id);
    if (!chip) return;
    if (c < 0 || r < 0 || c >= this.puzzle.grid.cols || r >= this.puzzle.grid.rows) return;
    if (this.layout.chips.some((k) => k !== chip && k.c === c && k.r === r)) return;
    chip.c = c;
    chip.r = r;
    this.markDirty();
  }

  connect(a, b) {
    // allow dragging in either direction; the output end is always the source
    let src = a;
    let dst = b;
    if (a.dir === 'in' && b.dir === 'out') { src = b; dst = a; }
    if (src.dir !== 'out' || dst.dir !== 'in') {
      toast('a wire runs from an output nub to an input nub', 'warn');
      return;
    }
    if (src.chipId === dst.chipId) { toast('a chip cannot wire into itself', 'warn'); return; }

    const busy = (chipId, port) => this.layout.wires.some(
      (w) => (w.from[0] === chipId && w.from[1] === port) || (w.to[0] === chipId && w.to[1] === port),
    );
    if (busy(src.chipId, src.port) || busy(dst.chipId, dst.port)) {
      toast('that port already carries a wire', 'warn');
      return;
    }

    this.layout.wires.push({
      id: `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      from: [src.chipId, src.port],
      to: [dst.chipId, dst.port],
    });
    this.markDirty();
  }

  deleteEntity(sel) {
    if (!sel) return;
    if (sel.kind === 'chip') {
      this.layout.chips = this.layout.chips.filter((c) => c.id !== sel.id);
      this.layout.wires = this.layout.wires.filter((w) => w.from[0] !== sel.id && w.to[0] !== sel.id);
    } else if (sel.kind === 'wire') {
      this.layout.wires = this.layout.wires.filter((w) => w.id !== sel.id);
    } else {
      return;
    }
    this.board.select(null);
    this.markDirty();
  }

  clearBoard() {
    if (!this.layout.chips.length && !this.layout.wires.length) return;
    this.layout = emptyLayout();
    this.board.setLayout(this.layout);
    this.board.select(null);
    this.markDirty();
  }

  onSelect(sel) {
    this.selection = sel;
    this.refreshInspector();
  }

  onCodeChange(code) {
    const chip = this.selectedChip();
    if (!chip || !CHIP_TYPES[chip.type]?.programmable) return;
    chip.code = code;
    this.markDirty();
  }

  selectedChip() {
    if (this.selection?.kind !== 'chip') return null;
    return this.layout.chips.find((c) => c.id === this.selection.id) || null;
  }

  syncEditorCursor() {
    const chip = this.selectedChip();
    if (!chip || chip.type !== 'CORE') return;
    const rt = this.machine?.byId.get(chip.id)?.impl;
    this.editor.setActiveLine(rt ? rt.activeLine : -1);
  }

  // ---------------------------------------------------------------- verifying

  runVerify() {
    const problems = validateLayout(this.layout, this.puzzle);
    if (problems.length) {
      this.showModal(verifyModal(this.puzzle, { pass: false, problems, tests: [], metrics: measure(this.layout) }, () => this.hideModal()));
      return;
    }
    const result = verify(this.layout, this.puzzle, { stopEarly: false });
    if (result.pass) {
      const { improved } = store.recordScore(this.puzzle.id, {
        cycles: result.cycles,
        chips: result.metrics.chips,
        instructions: result.metrics.instructions,
        wires: result.metrics.wires,
      });
      if (improved) toast('new record filed', 'good');
    }
    this.showModal(verifyModal(this.puzzle, result, () => this.hideModal()));
    this.refreshSidebar();
    this.refreshBrief();
  }

  // ------------------------------------------------------------ import/export

  exportDesign() {
    const payload = { v: 1, puzzle: this.puzzle.id, layout: this.layout };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    navigator.clipboard?.writeText(code).then(
      () => toast('design copied to the clipboard', 'good'),
      () => this.showModal(el('div', { class: 'modal-body' }, [
        el('h3', { text: 'DESIGN CODE' }),
        el('textarea', { class: 'share-box', readonly: 'true', text: code }),
        el('button', { class: 'btn primary wide', text: 'close', onclick: () => this.hideModal() }),
      ])),
    );
  }

  importDesign() {
    const box = el('textarea', { class: 'share-box', placeholder: 'paste a design code here' });
    const apply = () => {
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob(box.value.trim()))));
        if (data.puzzle !== this.puzzle.id) {
          const p = this.byId.get(data.puzzle);
          if (!p) throw new Error('unknown assignment');
          store.saveDesign(data.puzzle, data.layout);
          this.hideModal();
          this.openPuzzle(data.puzzle);
          toast(`loaded a design for ${p.name}`, 'good');
          return;
        }
        this.layout = cloneLayout(data.layout);
        this.migrateLayout();
        this.board.setLayout(this.layout);
        this.board.select(null);
        this.markDirty();
        this.hideModal();
        toast('design loaded', 'good');
      } catch {
        toast('that does not look like a design code', 'bad');
      }
    };
    this.showModal(el('div', { class: 'modal-body' }, [
      el('h3', { text: 'IMPORT DESIGN' }),
      box,
      el('button', { class: 'btn primary wide', text: 'load', onclick: apply }),
    ]));
    box.focus();
  }

  // ------------------------------------------------------------------- modals

  showModal(node) {
    clear(this.modalCard).append(node);
    this.modal.classList.add('open');
  }

  hideModal() {
    this.modal.classList.remove('open');
  }

  // ------------------------------------------------------------------ refresh

  refreshAll() {
    this.refreshSidebar();
    this.refreshPalette();
    this.refreshBrief();
    this.refreshStreams();
    this.refreshInspector();
    this.refreshTransport();
  }

  refreshSidebar() {
    renderAssignmentList(this.sidebar, this.puzzles, this.puzzle.id, (id) => this.openPuzzle(id));
  }

  refreshPalette() {
    renderPalette(this.paletteHost, this.puzzle, this.board.armedType, (type) => {
      this.board.armedType = type;
      this.refreshPalette();
    });
  }

  refreshBrief() {
    renderBrief(this.briefHost, this.puzzle, this.machine, this.hintsShown, () => {
      this.hintsShown++;
      this.refreshBrief();
    });
  }

  refreshStreams() {
    renderStreams(this.streamsHost, this.puzzle, this.machine, this.testIndex);
  }

  refreshInspector() {
    const chip = this.selectedChip();
    const dock = this.selection?.kind === 'dock'
      ? this.puzzle.docks.find((d) => d.id === this.selection.id)
      : null;
    const entity = chip || (dock ? { id: dock.id, type: dock.kind, config: {} } : null);

    renderInspector(this.inspectorHost, entity, this.puzzle, {
      onDelete: () => this.deleteEntity(this.selection),
      onConfig: (config) => {
        if (!chip) return;
        chip.config = config;
        this.markDirty();
        this.refreshInspector();
      },
    });

    const programmable = chip && CHIP_TYPES[chip.type]?.programmable;
    this.editorTitle.textContent = programmable
      ? `CORE ${chip.id.toUpperCase()}  ·  cell ${chip.c + 1},${chip.r + 1}`
      : 'NO CORE SELECTED';
    if (programmable) {
      this.editor.setEnabled(true, '');
      this.editor.load(chip.code || '', this.puzzle.codeLines);
      this.syncEditorCursor();
    } else {
      this.editor.setEnabled(false, 'Select a CORE on the board to write its program.');
      this.editor.load('', this.puzzle.codeLines);
      this.editor.setActiveLine(-1);
    }
  }

  refreshTransport() {
    const m = this.machine;
    this.btnRun.textContent = this.running ? '❚❚ stop' : '▶ run';
    this.btnRun.classList.toggle('active', this.running);
    this.testBtn.textContent = `test ${this.testIndex + 1}`;

    clear(this.readout);
    const state = m?.state ?? HALT.RUNNING;
    const label = {
      [HALT.RUNNING]: 'idle', [HALT.SUCCESS]: 'complete', [HALT.MISMATCH]: 'wrong value',
      [HALT.DEADLOCK]: 'deadlock', [HALT.FAULT]: 'fault', [HALT.TIMEOUT]: 'timed out',
    }[state];
    this.readout.append(
      el('span', { class: 'rd-cycles', text: `${m?.cycle ?? 0}` }),
      el('span', { class: 'rd-label', text: 'cycles' }),
      el('span', { class: `rd-state rd-${state}`, text: label }),
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.coreloom = new App();
});
