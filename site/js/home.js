// EmyoT.Fun :: the shelf.
//
// Adding a game is one entry here. `external: true` marks anything hosted
// somewhere other than this site so the card can say so.

const GAMES = [
  {
    title: 'Coreloom',
    href: 'coreloom/',
    img: 'img/coreloom.webp',
    accent: '#f2a03d',
    kind: 'Programming puzzle',
    blurb: 'Place chips, draw wires between their ports and write assembly to turn one stream of numbers into another. 23 assignments, and then the real game: doing it again in fewer cycles.',
  },
  {
    title: 'The Shifting Mansion',
    href: 'shifting-mansion/',
    img: 'img/mansion.webp',
    accent: '#a06be8',
    kind: 'Horror exploration',
    blurb: 'A cursed house that rearranges itself every night. Explore room by room, gather keys and clues, manage your sanity, and stay ahead of the thing stalking you. Five nights.',
  },
  {
    title: 'Detour',
    href: 'https://emyotyyy.github.io/detour/',
    img: 'img/detour.webp',
    accent: '#3fb9d2',
    kind: 'Tactical board game',
    external: true,
    blurb: 'A 1v1 race across a 9×9 board. Move a step, or spend your turn walling your opponent into the long way around. Play a friend, or a bot that reads several moves ahead.',
  },
];

function card(game) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = game.href;
  a.style.setProperty('--accent', game.accent);
  if (game.external) {
    a.target = '_blank';
    a.rel = 'noopener';
  }

  const shot = document.createElement('div');
  shot.className = 'card-shot';
  const img = document.createElement('img');
  img.src = game.img;
  img.alt = `${game.title} screenshot`;
  img.loading = 'lazy';
  img.decoding = 'async';
  shot.append(img);

  const body = document.createElement('div');
  body.className = 'card-body';

  const row = document.createElement('div');
  row.className = 'card-row';
  const h = document.createElement('h3');
  h.textContent = game.title;
  row.append(h);
  if (game.external) {
    const tag = document.createElement('span');
    tag.className = 'card-ext';
    tag.textContent = '↗';
    tag.title = 'Opens on another site';
    row.append(tag);
  }

  const kind = document.createElement('p');
  kind.className = 'card-kind';
  kind.textContent = game.kind;

  const blurb = document.createElement('p');
  blurb.className = 'card-blurb';
  blurb.textContent = game.blurb;

  body.append(row, kind, blurb);
  a.append(shot, body);
  return a;
}

const grid = document.getElementById('grid');
for (const game of GAMES) grid.append(card(game));
