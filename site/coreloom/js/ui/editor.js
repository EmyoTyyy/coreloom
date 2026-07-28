// CORELOOM :: code editor. A transparent textarea over a highlighted backdrop,
// which keeps native selection, undo and clipboard while still colouring tokens.

import { el, clear } from '../util/dom.js';
import { assemble } from '../core/assembler.js';
import { MNEMONICS, SIDE_ALIAS, REGISTERS } from '../core/isa.js';

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function highlightLine(line) {
  const cut = line.search(/#|\/\//);
  let code = line;
  let comment = '';
  if (cut >= 0) { code = line.slice(0, cut); comment = line.slice(cut); }

  let out = '';
  const re = /(\s+)|([A-Za-z_][A-Za-z0-9_]*:)|(-?\d+)|([A-Za-z_][A-Za-z0-9_]*)|(.)/g;
  let m;
  let first = true;
  while ((m = re.exec(code))) {
    const [, ws, label, num, word, other] = m;
    if (ws) { out += escapeHtml(ws); continue; }
    if (label) { out += `<i class="t-label">${escapeHtml(label)}</i>`; continue; }
    if (num) { out += `<i class="t-num">${escapeHtml(num)}</i>`; continue; }
    if (word) {
      const u = word.toUpperCase();
      let cls = 't-ref';
      if (first && MNEMONICS.includes(u)) cls = 't-op';
      else if (REGISTERS.includes(u)) cls = 't-reg';
      else if (SIDE_ALIAS[u]) cls = 't-port';
      out += `<i class="${cls}">${escapeHtml(word)}</i>`;
      first = false;
      continue;
    }
    out += escapeHtml(other);
  }
  if (comment) out += `<i class="t-comment">${escapeHtml(comment)}</i>`;
  return out || '&nbsp;';
}

export class CodeEditor {
  constructor(host, hooks = {}) {
    this.hooks = hooks;
    this.maxLines = 15;
    this.activeLine = -1;
    this.errors = [];

    this.gutter = el('div', { class: 'ed-gutter' });
    this.backdrop = el('pre', { class: 'ed-backdrop' });
    this.area = el('textarea', {
      class: 'ed-area', spellcheck: 'false', autocomplete: 'off',
      autocapitalize: 'off', autocorrect: 'off', wrap: 'off',
    });
    this.status = el('div', { class: 'ed-status' });

    this.root = el('div', { class: 'editor' }, [
      el('div', { class: 'ed-body' }, [this.gutter, el('div', { class: 'ed-stack' }, [this.backdrop, this.area])]),
      this.status,
    ]);
    host.append(this.root);

    this.area.addEventListener('input', () => this.onInput());
    this.area.addEventListener('scroll', () => {
      this.backdrop.scrollTop = this.area.scrollTop;
      this.backdrop.scrollLeft = this.area.scrollLeft;
      this.gutter.scrollTop = this.area.scrollTop;
    });
    this.area.addEventListener('keydown', (ev) => {
      if (ev.key === 'Tab') {
        ev.preventDefault();
        this.insert('  ');
      }
      // keep board shortcuts from firing while typing
      ev.stopPropagation();
    });
  }

  insert(text) {
    const { selectionStart: s, selectionEnd: e, value } = this.area;
    this.area.value = value.slice(0, s) + text + value.slice(e);
    this.area.selectionStart = this.area.selectionEnd = s + text.length;
    this.onInput();
  }

  onInput() {
    this.paint();
    this.hooks.onChange?.(this.area.value);
  }

  setMaxLines(n) {
    this.maxLines = n;
    this.paint();
  }

  /** Load a program. `silent` avoids echoing the change back to the caller. */
  load(code, maxLines) {
    if (maxLines) this.maxLines = maxLines;
    this.area.value = code ?? '';
    this.paint();
  }

  setActiveLine(line) {
    if (line === this.activeLine) return;
    this.activeLine = line;
    this.paintGutter();
    this.paintBackdrop();
  }

  setEnabled(on, placeholder = '') {
    this.area.disabled = !on;
    this.area.placeholder = placeholder;
    this.root.classList.toggle('disabled', !on);
  }

  paint() {
    const built = assemble(this.area.value, { maxLines: this.maxLines });
    this.errors = built.errors;
    this.paintBackdrop();
    this.paintGutter();
    this.paintStatus(built);
  }

  paintBackdrop() {
    const lines = this.area.value.split('\n');
    const errorLines = new Set(this.errors.map((e) => e.line));
    this.backdrop.innerHTML = lines.map((l, i) => {
      const cls = [
        i === this.activeLine ? 'ln-active' : '',
        errorLines.has(i) ? 'ln-error' : '',
        i >= this.maxLines ? 'ln-over' : '',
      ].filter(Boolean).join(' ');
      return `<span class="ln ${cls}">${highlightLine(l)}</span>`;
    }).join('');
  }

  paintGutter() {
    const count = Math.max(this.area.value.split('\n').length, this.maxLines);
    const errorLines = new Set(this.errors.map((e) => e.line));
    clear(this.gutter);
    for (let i = 0; i < count; i++) {
      this.gutter.append(el('span', {
        class: [
          'gl',
          i === this.activeLine ? 'gl-active' : '',
          errorLines.has(i) ? 'gl-error' : '',
          i >= this.maxLines ? 'gl-over' : '',
        ].filter(Boolean).join(' '),
        text: String(i + 1),
      }));
    }
  }

  paintStatus(built) {
    clear(this.status);
    const used = this.area.value.split('\n').length;
    const over = used > this.maxLines;
    this.status.append(el('span', {
      class: `ed-count${over ? ' bad' : ''}`,
      text: `${used}/${this.maxLines} lines · ${built.ops.length} instr`,
    }));
    if (built.errors.length) {
      const e = built.errors[0];
      this.status.append(el('span', { class: 'ed-err', text: `line ${e.line + 1}: ${e.message}` }));
    }
  }
}
