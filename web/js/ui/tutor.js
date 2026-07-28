// CORELOOM :: the walkthrough.
//
// A guided tour that points at real interface elements and waits for the player
// to actually do the thing. Steps are state-gated rather than click-gated: if
// you wander off and complete a step your own way, the tour notices and moves
// on. Steps whose goal is already satisfied are skipped silently, so restarting
// the tour on a half-built board does not make you redo work.

import { el, clear } from '../util/dom.js';
import { HALT } from '../core/machine.js';
import { store } from '../util/store.js';

export class Tutor {
  constructor(app) {
    this.app = app;
    this.steps = [];
    this.index = -1;
    this.active = false;

    this.ring = el('div', { id: 'tutor-ring' });
    this.markers = [el('div', { class: 'tutor-marker' }), el('div', { class: 'tutor-marker' })];
    this.card = el('div', { id: 'tutor-card' });
    this.root = el('div', { id: 'tutor', class: 'hidden' }, [this.ring, ...this.markers, this.card]);
    document.body.append(this.root);
  }

  start(steps) {
    this.steps = steps;
    this.index = -1;
    this.active = true;
    this.root.classList.remove('hidden');
    // Progress is checked on a timer as well as on every rendered frame:
    // requestAnimationFrame stops in a background tab, and a walkthrough that
    // silently refuses to advance is worse than no walkthrough at all.
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 120);
    this.next();
  }

  stop(completed = false) {
    this.active = false;
    clearInterval(this.timer);
    this.timer = null;
    this.root.classList.add('hidden');
    if (completed) store.setFlag('tutorialDone', true);
  }

  get step() {
    return this.steps[this.index] || null;
  }

  next() {
    // Advance past any action step whose goal is already met.
    let i = this.index + 1;
    while (i < this.steps.length) {
      const s = this.steps[i];
      if (s.done && !s.always && s.done(this.app)) i++;
      else break;
    }
    if (i >= this.steps.length) { this.finish(); return; }
    this.index = i;
    this.step.onEnter?.(this.app);
    this.paint();
  }

  back() {
    if (this.index <= 0) return;
    this.index--;
    this.paint();
  }

  finish() {
    this.stop(true);
    this.app.refreshAll();
  }

  /** Called every frame: advances state-gated steps and keeps the spotlight glued on. */
  tick() {
    if (!this.active) return;
    const step = this.step;
    if (!step) return;

    // Never fight a modal for the screen.
    const modalOpen = document.querySelector('#modal')?.classList.contains('open');
    this.root.classList.toggle('behind', !!modalOpen);
    if (modalOpen && !step.overModal) return;

    if (step.done && step.done(this.app)) { this.next(); return; }
    this.position();
  }

  paint() {
    const step = this.step;
    if (!step) return;
    clear(this.card);

    this.card.append(el('div', { class: 'tut-top' }, [
      el('span', { class: 'tut-count', text: `${this.index + 1} / ${this.steps.length}` }),
      el('button', { class: 'tut-skip', text: 'skip the walkthrough', onclick: () => this.stop(true) }),
    ]));
    this.card.append(el('h4', { class: 'tut-title', text: step.title }));

    const body = typeof step.body === 'function' ? step.body(this.app) : step.body;
    for (const para of [].concat(body)) {
      this.card.append(el('p', { class: 'tut-body', html: para }));
    }

    const actions = el('div', { class: 'tut-actions' });
    if (this.index > 0) {
      actions.append(el('button', { class: 'tut-back', text: '← back', onclick: () => this.back() }));
    }
    for (const a of step.actions || []) {
      actions.append(el('button', {
        class: 'tut-alt',
        text: a.label,
        onclick: () => { a.run(this.app); this.paint(); },
      }));
    }
    if (!step.done) {
      actions.append(el('button', {
        class: 'tut-next',
        text: this.index === this.steps.length - 1 ? 'finish' : 'next →',
        onclick: () => this.next(),
      }));
    } else {
      actions.append(el('span', { class: 'tut-waiting', text: step.waiting || 'waiting for you…' }));
    }
    this.card.append(actions);
    this.position();
  }

  position() {
    const step = this.step;
    const rects = [].concat(step.anchor ? (step.anchor(this.app) || []) : []).filter(Boolean);

    for (const m of this.markers) m.style.display = 'none';

    if (!rects.length) {
      // No anchor: dim everything and centre the card.
      this.ring.style.cssText = `left:50%;top:50%;width:0;height:0`;
      this.card.style.left = `${(window.innerWidth - this.card.offsetWidth) / 2}px`;
      this.card.style.top = `${(window.innerHeight - this.card.offsetHeight) / 2}px`;
      return;
    }

    const union = rects.reduce((a, r) => ({
      left: Math.min(a.left, r.left),
      top: Math.min(a.top, r.top),
      right: Math.max(a.right ?? a.left + a.width, r.left + r.width),
      bottom: Math.max(a.bottom ?? a.top + a.height, r.top + r.height),
    }), { left: rects[0].left, top: rects[0].top, width: rects[0].width, height: rects[0].height });
    const box = {
      left: union.left, top: union.top,
      width: union.right - union.left, height: union.bottom - union.top,
    };

    this.ring.style.cssText =
      `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px`;

    // When a step spans two targets, mark each one so the drag reads clearly.
    if (rects.length > 1) {
      rects.slice(0, 2).forEach((r, i) => {
        const m = this.markers[i];
        m.style.display = 'block';
        m.style.left = `${r.left}px`;
        m.style.top = `${r.top}px`;
        m.style.width = `${r.width}px`;
        m.style.height = `${r.height}px`;
      });
    }
    this.placeCard(box);
  }

  /**
   * Place the card beside the spotlight without ever covering it — a card
   * sitting on top of the nub you are being told to drag from is worse than
   * useless. Tries right, left, below, above, and only then gives up and parks
   * in a corner.
   */
  placeCard(box) {
    const M = 20;
    const cw = this.card.offsetWidth || 336;
    const ch = this.card.offsetHeight || 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

    const midY = clamp(box.top + box.height / 2 - ch / 2, M, vh - ch - M);
    const midX = clamp(box.left + box.width / 2 - cw / 2, M, vw - cw - M);
    const candidates = [
      { left: box.left + box.width + M, top: midY },
      { left: box.left - cw - M, top: midY },
      { left: midX, top: box.top + box.height + M },
      { left: midX, top: box.top - ch - M },
    ];

    const onScreen = (c) => c.left >= M && c.top >= M && c.left + cw <= vw - M && c.top + ch <= vh - M;
    const clears = (c) => c.left + cw < box.left || c.left > box.left + box.width
      || c.top + ch < box.top || c.top > box.top + box.height;

    const pick = candidates.find((c) => onScreen(c) && clears(c))
      || candidates.find(onScreen)
      || { left: vw - cw - M, top: vh - ch - M };

    this.card.style.left = `${pick.left}px`;
    this.card.style.top = `${pick.top}px`;
  }
}

// ---------------------------------------------------------------------------
// The level-one tour.
// ---------------------------------------------------------------------------

const sideOf = (port) => port.split('_')[0];
const SIDE_WORD = { N: 'north (top)', E: 'east (right)', S: 'south (bottom)', W: 'west (left)' };

const theCore = (app) => app.layout.chips[0] || null;
const inWire = (app) => app.layout.wires.find((w) => w.from[0] === 'in0');
const outWire = (app) => app.layout.wires.find((w) => w.to[0] === 'out0');

/** The program that matches however the player actually wired their core. */
function suggestedCode(app) {
  const src = inWire(app) ? sideOf(inWire(app).to[1]) : 'W';
  const dst = outWire(app) ? sideOf(outWire(app).from[1]) : 'E';
  return `MOV ${src} ${dst}`;
}

function writeItForThem(app) {
  const core = theCore(app);
  if (!core) return;
  const text = suggestedCode(app);
  app.board.select({ kind: 'chip', id: core.id });
  app.editor.load(text);
  app.onCodeChange(text);
}

export function relayTour() {
  return [
    {
      title: 'Welcome to CORELOOM',
      body: [
        'Numbers arrive on the left. The same numbers have to come out on the right, in the same order.',
        'Everything in between is yours to build — chips you place, wires you draw, and programs you write. This walkthrough builds the first one with you. It takes about two minutes.',
      ],
    },
    {
      title: 'The two ends',
      anchor: (app) => [app.board.entityScreenRect('in0'), app.board.entityScreenRect('out0')],
      body: [
        '<b>IN.A</b> on the left holds twenty values and hands them out one at a time, in order. The big number is the one waiting to be taken.',
        '<b>OUT.A</b> on the right has to receive all twenty, unchanged. It will not accept them out of order, and it will not accept a wrong one — the run stops the moment a value does not match.',
        'The dashed squares between them are where chips go.',
      ],
    },
    {
      title: 'Pick up a chip',
      anchor: () => rectOf('#palette'),
      body: [
        'Chips come from this bar. This assignment only offers one kind: a <b>CORE</b>, which is a small programmable processor.',
        'Click <b>CORE</b> now. It arms the chip — you are picking it up, not dragging it.',
      ],
      waiting: 'waiting for you to click CORE…',
      done: (app) => app.board.armedType === 'CORE' || app.layout.chips.length > 0,
    },
    {
      title: 'Drop it on the board',
      anchor: (app) => app.board.cellScreenRect(1, 0),
      body: [
        'Now click any empty dashed cell to place the core. The highlighted one is a good spot, but any of them works — position only affects how tidy your wires are, never how the machine behaves.',
      ],
      waiting: 'waiting for you to place a core…',
      done: (app) => app.layout.chips.length > 0,
    },
    {
      title: 'Ports: the nubs on the edges',
      anchor: (app) => app.board.entityScreenRect(theCore(app)?.id, 14),
      body: [
        'Look closely at the four edges of your core. There are eight little nubs, two per side, and the difference between them is the single most important thing on this screen:',
        '<b>○ A hollow ring is an output.</b> Data leaves here.<br><b>● A filled dot is an input.</b> Data arrives here.',
        'A wire always runs from a hollow ring to a filled dot. Hover over any nub to see its name.',
      ],
    },
    {
      title: 'Wire the input in',
      anchor: (app) => [
        app.board.portScreenRect('in0', 'OUT'),
        app.board.portScreenRect(theCore(app)?.id, 'W_IN'),
      ],
      body: [
        'Drag from the <b>hollow ring on IN.A</b> to a <b>filled dot on your core</b>. The two marked nubs are the natural pair.',
        'Press the mouse down on one nub, drag, and release on the other. Any side of the core will do — the walkthrough adapts to whichever you pick.',
      ],
      waiting: 'waiting for a wire from IN.A…',
      done: (app) => !!inWire(app) && !!theCore(app) && inWire(app).to[0] === theCore(app).id,
    },
    {
      title: 'Wire the output out',
      anchor: (app) => [
        app.board.portScreenRect(theCore(app)?.id, 'E_OUT'),
        app.board.portScreenRect('out0', 'IN'),
      ],
      body: [
        'Now the other half: drag from a <b>hollow ring on your core</b> to the <b>filled dot on OUT.A</b>.',
        'Each port holds at most one wire. If you need a value in two places you will need a second chip for it — but not today.',
      ],
      waiting: 'waiting for a wire into OUT.A…',
      done: (app) => !!outWire(app) && !!theCore(app) && outWire(app).from[0] === theCore(app).id,
    },
    {
      title: 'The core is empty',
      anchor: () => rectOf('#editor-panel'),
      body: [
        'Your core is wired but has no program, so it does nothing. Selecting a core on the board opens its program down here — yours should be selected already.',
        'A core has two registers: <b>ACC</b>, which every arithmetic instruction works on, and <b>BAK</b>, a backup you can only reach with <code>SAV</code> and <code>SWP</code>. You will not need either one yet.',
      ],
      onEnter: (app) => {
        const core = theCore(app);
        if (core) app.board.select({ kind: 'chip', id: core.id });
      },
    },
    {
      title: 'Write one instruction',
      anchor: () => rectOf('#editor-panel'),
      body: (app) => {
        const code = suggestedCode(app);
        const [, src, dst] = code.split(' ');
        return [
          `Click into the editor and type:<br><code class="tut-code">${code}</code>`,
          `<code>MOV</code> copies. <code>${src}</code> means the ${SIDE_WORD[src]} side, <code>${dst}</code> means the ${SIDE_WORD[dst]} side — the two you just wired. Reading a side takes from its input port; writing to one sends out its output port.`,
          'It reads one value and passes it on. <b>When a program runs off the end it starts again from the top</b>, so a single line is already a loop.',
        ];
      },
      waiting: 'waiting for a program that assembles…',
      actions: [{ label: 'write it for me', run: writeItForThem }],
      done: (app) => {
        const core = theCore(app);
        if (!core) return false;
        const rt = app.machine?.byId.get(core.id)?.impl;
        return !!rt && rt.ops.length > 0;
      },
    },
    {
      title: 'One cycle at a time',
      anchor: () => rectOf('#transport'),
      body: [
        'Press <b>step</b> a few times and watch three things: the highlighted line in the editor, the value travelling along the wire, and the counters on the two docks.',
        'You will see the core spend one cycle reading and another writing. A transfer only happens when one end offers a value and the other asks for it <b>in the same cycle</b> — whoever gets there first waits, and waiting is what costs you cycles.',
      ],
      waiting: 'waiting for a few cycles…',
      done: (app) => (app.machine?.cycle ?? 0) >= 3,
    },
    {
      title: 'Let it run',
      anchor: () => rectOf('#transport'),
      body: (app) => [
        'Press <b>run</b> to let it go by itself. <b>speed</b> cycles through the rates, and <b>reset</b> puts it back to cycle zero.',
        'You are looking for the readout to turn green and say <i>complete</i>.',
        (app.machine?.state === HALT.MISMATCH || app.machine?.state === HALT.DEADLOCK)
          ? '<span class="tut-warn">It stopped early. Press <b>reset</b>, check your wires and your program, and try again — or use the button below.</span>'
          : '',
      ].filter(Boolean),
      waiting: 'waiting for a passing run…',
      actions: [{ label: 'fix it for me', run: writeItForThem }],
      done: (app) => app.machine?.state === HALT.SUCCESS,
    },
    {
      title: 'Verify to bank it',
      anchor: () => rectOf('#transport'),
      body: [
        'One test passing is not the same as being correct. There are <b>three</b> test cases and two of them are hidden, with different numbers.',
        'Press <b>verify</b> to run all three and file your score. That is what marks the assignment solved.',
      ],
      waiting: 'waiting for a verified solution…',
      done: () => store.solved('relay'),
      overModal: true,
    },
    {
      title: 'That is the whole game',
      body: [
        'Everything else is the same four moves: place chips, wire them, program them, verify.',
        'Your score is <b>cycles</b> and <b>chips</b>, and the greyed numbers under each brief are par — a real target measured against a working solution, not decoration. Each metric keeps its own record, so a small design and a fast design can both stand.',
        'The assignments on the left introduce one idea at a time. Press <b>?</b> for the full instruction set at any point, and <b>reveal a hint</b> under any brief when you are stuck.',
        'Next up: <b>PHASE INVERTER</b>. Good luck.',
      ],
    },
  ];
}

function rectOf(selector) {
  const node = document.querySelector(selector);
  if (!node) return null;
  const r = node.getBoundingClientRect();
  return { left: r.left - 4, top: r.top - 4, width: r.width + 8, height: r.height + 8 };
}
