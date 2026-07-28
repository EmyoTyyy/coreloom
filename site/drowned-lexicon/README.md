# The Drowned Lexicon

*A Decipherment of Tel Vaskir.*

You are a philologist with seventy-two days at a sunken bronze-age city before the monsoon
closes the site. There are roughly ninety signs of a dead script and no dictionary. Your job
is to work out what each one means, using nothing but the tablets themselves.

**The language is generated fresh from a seed** — phonology, glyph shapes, vocabulary, and a
randomised grammar (word order, affix inventory, whether modifiers precede or follow their
nouns). Nobody has solved any particular language before, including the person who wrote the
game. Sharing a seed gives another player the identical puzzle.

## Running it

Open `index.html` in a browser. That's it — no build step, no package manager, no local
server. The scripts are plain classic `<script src>` tags rather than ES modules precisely so
that the game runs from a `file://` URL.

Progress autosaves to `localStorage` under `drowned_lexicon_save_v1`.

## Layout

```
index.html              markup shell + script order
css/
  base.css              design tokens, reset, primitives, layout shell
  game.css              game components (clay slab, sites, lexicon, header…)
js/
  rng.js                seeded RNG (mulberry32 + FNV-1a string hash)
  concepts.js           the ~90 concepts, decoy meanings, English morphology
  glyphs.js             procedural sign shapes: family radicals + body strokes
  language.js           language generation; NP/clause builders; numeral parsing
  tablets.js            one generator per document genre (ledger, decree, hymn…)
  content.js            authored content: the 13 story beats, 7 sites, 18 notes
  world.js              deterministic world build from a seed
  state.js              game state, actions, economy, save/load
  ui.js                 shared helpers, glyph rendering, translation rendering
  view-*.js             one file per screen
  ending.js             endings and the full-lexicon reveal
  manual.js             field manual and season menu
  main.js               render dispatch and boot
assets/                 environment art, artefact plates, endings, clay texture
```

Scripts must load in the order listed in `index.html`: a few top-level constants are derived
at load time (`GOODS`, `ACTS`, … in `tablets.js` read `ROOTS` from `concepts.js`).

## How the puzzle works

Five independent evidence channels, so the player is never stuck on one:

- **Arithmetic.** Ledgers list quantities and then state their own total. Guess the bracketed
  numerals; if the column adds up, the tablet confirms them outright. Numbers are the only
  part of the language that cannot lie, so they are the wedge into everything else.
- **Collation.** Read a tablet to your assistant and he reports how many of your namings are
  correct — never *which*. Mastermind, played over a corpus. First reading of each tablet is
  free; further ones cost insight.
- **Family motifs.** Signs carry a class radical (a standing stroke for persons, a wave for
  the natural world, a box for goods, a bracket for numerals). A day at the drawing board
  reveals what a family *means*, narrowing a dozen signs at once.
- **Concordance.** Every sign can be viewed with all its attestations and four signs of
  context either side.
- **Bilingual seals and object labels**, rationed.

Thirteen tablets carry the story of the city's last year. An account is written up only when
**your own translation of it is about two-thirds correct**, so the narrative rewards reading
rather than digging. The season ends at a sealed basalt door that opens to two answers: a
number derived arithmetically from its inscription, and a sign the inscription names.

## Design notes

- **Determinism.** The world is rebuilt from the seed on load; the save file stores only
  player progress (assignments, which pool indices have been drawn, damage masks).
- **Damage models breakage, not decay.** A damaged tablet loses a contiguous run from the head
  or foot of one or two lines. Random per-sign damage was tried first and destroyed most
  ledgers' arithmetic, which is the game's entry point.
- **Story unlocking is passive.** It is re-checked whenever readings change, so it is never
  gated behind paying to re-collate a tablet you have already improved.
- **Rendering degrades honestly.** Until word order is established, the translation panel
  shows glosses in scribal order. Affixes fold into their hosts only once identified.

## Assets

19 images in `assets/`, generated for this project (Higgsfield, `z_image`) and post-processed
locally:

- **hero** — the title screen
- **site-\*** (6) — one painted banner per excavation site
- **vault-door** — the endgame banner
- **obj-\*** (8) — archaeological catalogue plates of the excavated objects. These are not
  decoration: an object label tablet is *pictorial evidence*, so being able to see the jar or
  the fish is part of solving it.
- **end-archive / end-monsoon** — the two endings
- **clay-tile** — the tablet surface, high-passed to fine grain so it repeats without a
  visible seam

Total weight is about 455 KB. Everything else — the script itself, every sign, every tablet —
is drawn procedurally at runtime.
