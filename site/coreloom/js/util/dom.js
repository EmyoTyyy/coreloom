// CORELOOM :: tiny DOM helpers.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/**
 * Trailing-edge debounce with an explicit flush, so pending work can be forced
 * out before something that would invalidate it (navigation, unload).
 */
export function debounce(fn, ms) {
  let t = null;
  let pending = null;
  const wrapped = (...args) => {
    pending = args;
    clearTimeout(t);
    t = setTimeout(() => { t = null; const a = pending; pending = null; fn(...a); }, ms);
  };
  wrapped.flush = () => {
    if (t === null) return;
    clearTimeout(t);
    t = null;
    const a = pending;
    pending = null;
    fn(...a);
  };
  wrapped.cancel = () => { clearTimeout(t); t = null; pending = null; };
  return wrapped;
}

/** Non-blocking toast in the corner. */
let toastHost = null;
export function toast(message, kind = 'info', ms = 3200) {
  if (!toastHost) {
    toastHost = el('div', { class: 'toast-host' });
    document.body.append(toastHost);
  }
  const node = el('div', { class: `toast toast-${kind}`, text: message });
  toastHost.append(node);
  requestAnimationFrame(() => node.classList.add('in'));
  setTimeout(() => {
    node.classList.remove('in');
    setTimeout(() => node.remove(), 300);
  }, ms);
}
