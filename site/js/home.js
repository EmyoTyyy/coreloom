// EmyoT.Fun :: the shelf.
//
// Adding a game is one entry here. `external: true` marks anything hosted
// somewhere other than this site so the card can say so.

const GAMES = [
  {
    title: 'Coreloom',
    href: 'coreloom/',
    img: 'img/coreloom.webp',
    accent: '#e08b1e',
    accentDark: '#f2a03d',
    kind: 'Programming puzzle',
    blurb: 'Place chips, draw wires between their ports and write assembly to turn one stream of numbers into another. 23 assignments, and then the real game: doing it again in fewer cycles.',
  },
  {
    title: 'The Shifting Mansion',
    href: 'shifting-mansion/',
    img: 'img/mansion.webp',
    accent: '#8b52d6',
    accentDark: '#a06be8',
    kind: 'Horror exploration',
    blurb: 'A cursed house that rearranges itself every night. Explore room by room, gather keys and clues, manage your sanity, and stay ahead of the thing stalking you. Five nights.',
  },
  {
    title: 'The Drowned Lexicon',
    href: 'drowned-lexicon/',
    img: 'img/lexicon.webp',
    accent: '#b07d33',
    accentDark: '#e2a850',
    kind: 'Decipherment',
    blurb: 'Ninety signs of a dead script, seventy-two days, and no dictionary. Work out what each one means from the clay tablets alone. Every seed writes a different language, so nobody has solved yours before.',
  },
  {
    title: 'Detour',
    href: 'https://emyotyyy.github.io/detour/',
    img: 'img/detour.webp',
    accent: '#1f97ad',
    accentDark: '#3fb9d2',
    kind: 'Tactical board game',
    external: true,
    blurb: 'A 1v1 race across a 9×9 board. Move a step, or spend your turn walling your opponent into the long way around. Play a friend, or a bot that reads several moves ahead.',
  },
];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function card(game) {
  const a = el('a', 'card');
  a.href = game.href;
  a.dataset.accent = game.accent;
  a.dataset.accentDark = game.accentDark || game.accent;
  if (game.external) {
    a.target = '_blank';
    a.rel = 'noopener';
  }

  const shot = el('div', 'card-shot');
  const img = new Image();
  img.src = game.img;
  img.alt = `${game.title} screenshot`;
  img.loading = 'lazy';
  img.decoding = 'async';
  shot.append(img);

  const row = el('div', 'card-row');
  row.append(el('h3', null, game.title));
  if (game.external) {
    const ext = el('span', 'card-ext', '↗');
    ext.title = 'Opens on another site';
    row.append(ext);
  }

  const body = el('div', 'card-body');
  body.append(row, el('p', 'card-kind', game.kind), el('p', 'card-blurb', game.blurb));

  a.append(shot, body);
  return a;
}

const grid = document.getElementById('grid');
for (const game of GAMES) grid.append(card(game));

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const THEME_KEY = 'emyotfun.theme';
const root = document.documentElement;
const btn = document.getElementById('theme-toggle');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** Whatever is on screen right now: an explicit choice, else the system's. */
function activeTheme() {
  const chosen = root.getAttribute('data-theme');
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return darkQuery.matches ? 'dark' : 'light';
}

/** Accents are picked per theme so they stay legible on either background. */
function paintAccents(theme) {
  for (const c of document.querySelectorAll('.card')) {
    c.style.setProperty('--accent', theme === 'dark' ? c.dataset.accentDark : c.dataset.accent);
  }
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#14161b' : '#fdfcfa');
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  btn.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}

btn.addEventListener('click', () => {
  const next = activeTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked */ }
  paintAccents(next);
});

// Follow the system while no explicit choice has been made.
darkQuery.addEventListener('change', () => {
  if (!root.getAttribute('data-theme')) paintAccents(activeTheme());
});

paintAccents(activeTheme());
