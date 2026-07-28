# CORELOOM

A concurrent-dataflow programming puzzle game that runs in the browser. You are
given an input stream, a required output stream, and an empty board. You place
chips, draw wires between their ports, write assembly for the programmable ones,
and try to make the right numbers come out the far side.

Then you try to do it in fewer cycles, or fewer chips, and that is where the
evenings go.

```
npm start          # http://localhost:7331
npm test           # engine tests + every reference solution
```

No dependencies, no build step, no network calls. `npm start` runs a ~50-line
static file server; the game is plain ES modules loaded straight from disk.

> `server.js` exists only so you can run it locally. It is **not** part of the
> game and is not deployed. You do need *some* server locally — opening
> `index.html` off the disk fails, because browsers refuse to load ES modules
> over `file://`. Any static server will do; `npm start` just saves you choosing
> one.

**First time in, a guided walkthrough starts automatically** and builds the first
assignment with you — placing a chip, drawing both wires, writing the one-line
program, and verifying it. It points at real controls and waits for you to
actually do each thing rather than clicking through slides, and it adapts: wire
the input into the north side instead of the west and it will tell you to write
`MOV N S`. Replay it any time from **walkthrough** in the top bar.

---

## The machine

The board holds chips. Chips have named, **directed** ports. A wire runs from one
output port to one input port, and **every port carries at most one wire**.

Simulation advances in discrete cycles, each with three strict phases:

1. **plan** — every chip declares its intent for this cycle: read from a port,
   write a value to a port, or neither. Purely internal work (arithmetic, jumps)
   also happens here.
2. **resolve** — for each wire, if the source end offers a write *and* the
   destination end requests a read in this same cycle, the value transfers.
   Because a port has at most one wire, there is nothing to arbitrate: no
   priority rules, no ordering, no tie-breaks.
3. **commit** — every chip is told whether its intent succeeded and updates.

Two consequences fall out of this, and both matter while you are playing:

**Transfers are a rendezvous.** A writer that arrives early waits, doing nothing,
until a reader shows up — and vice versa. Waiting costs cycles. Most of the
optimisation in this game is about making two chips want the same thing at the
same moment.

**Deadlock is provable, not guessed at.** If a whole cycle passes in which no
value moved and no chip did any internal work, the machine's state is
bit-identical to what it was one cycle earlier. The system is deterministic, so
it can never move again. That is a proof, so the run stops immediately and says
so, rather than spinning to a timeout and leaving you to wonder.

### Chips

| chip | ports | behaviour |
|---|---|---|
| `CORE` | `N/E/S/W` × in+out | Runs a program. `ACC` + `BAK`, 15 lines (20 on later assignments). Each side has a separate input and output port, so a side can carry traffic both ways at once. |
| `STACK` | `IN`, `OUT` | 12 deep, last in first out. Writes push, reads pop. |
| `QUEUE` | `IN`, `OUT` | 12 deep, first in first out. |
| `SPLIT` | `IN`, 3 × `OUT` | Holds each value until *every wired* output has taken it. Unwired outputs are ignored. |
| `FILTER` | `IN`, `E_OUT`, `S_OUT` | Compares against a constant; matches leave east, the rest leave south. An unwired branch discards. |
| `SINK` | 2 × `IN` | Absorbs anything. Needed more often than you would expect — an unread branch backs the whole line up. |
| `INPUT` / `OUTPUT` | 1 port | The puzzle's docks. Fixed, not placeable. |

### Instruction set

```
NOP                 do nothing for a cycle
MOV  src dst        copy; a port operand blocks until the transfer happens
ADD  src            ACC = ACC + src        SUB src
MUL  src                                   DIV src   (truncates toward zero)
MOD  src            remainder, sign follows ACC
NEG                 ACC = -ACC
SAV                 BAK = ACC
SWP                 exchange ACC and BAK
JMP  label          JEZ / JNZ / JGZ / JLZ label
JRO  src            jump to (current index + src), clamped to the program
```

Operands are a literal (`-999`..`999`), `ACC`, `NIL`, or a side (`N E S W`, or
equivalently `UP RIGHT DOWN LEFT`). Reading a side uses its input port, writing
uses its output port. `BAK` is deliberately not addressable — `SAV` and `SWP`
are the only ways to reach it, and designing around that is most of the fun.

Arithmetic clamps at ±999 rather than wrapping. Dividing by zero faults the core
and stops the run with the offending line number.

### Why comparison is hard, and why that is the point

`ADD`, `SUB` and friends read their operand and destroy it. Comparing two values
therefore costs you both of them, and with only `ACC` and `BAK` you cannot
recover the loser. Every non-trivial assignment in the library is downstream of
that one constraint: you learn to duplicate a value before comparing it, park
the copies in a `QUEUE`, and let a second core decide which one survives. That
comparator shows up in `DOMINANCE`, gets reused in `PAIRWISE ORDER`, and is the
engine of the final assignment.

---

## Layout

```
server.js                zero-dependency static server
web/
  index.html
  css/main.css
  js/
    core/
      isa.js             instruction table, value range
      assembler.js       source -> ops + diagnostics (3 passes, label binding)
      chips.js           every chip as a plan/settle state machine
      machine.js         board topology, cycle scheduler, verification
      puzzle.js          turns a definition into a runnable puzzle
    data/puzzles.js      all 23 assignments
    ui/
      board.js           canvas rendering, wiring, drag, pan, zoom
      editor.js          syntax-highlighted editor over a real textarea
      panels.js          brief, streams, inspector, modals
      tutor.js           the state-gated walkthrough and the level-one script
    util/                rng, localStorage, DOM helpers
    app.js               controller
tests/
  solutions.js           a worked solution for every assignment
  run.js                 the harness
```

## Tests

`npm test` runs three layers:

- **assembler** — labels, operand classes, line limits, error messages.
- **machine semantics** — cycle costs, `STACK` vs `QUEUE` ordering, `SPLIT`
  fan-out, `FILTER` on negative multiples, clamping, deadlock detection,
  determinism, and every layout validation rule.
- **reference solutions** — all 23 assignments solved and run against all their
  hidden test cases.

That last layer is the one that matters. It is what guarantees the puzzle library
is actually solvable within the chips, the board size and the line limits on
offer, rather than merely believed to be. It also measures each solution, and a
final check asserts every published par is calibrated against real measured
data — between 55% and 105% of what the reference achieves. Par is a target you
have to work for, not decoration.

The reference solutions are correct, not optimal. Beating them is the game.

## Hosting it

Everything the game needs is static, self-contained and relative-pathed, so it
drops onto GitHub Pages (or any static host) as-is. `server.js` is not involved.

The included workflow runs the test suite and then publishes `web/` — so a
broken engine never reaches the live site.

1. Push the repo to GitHub with `main` as the default branch.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push. The `test and deploy` workflow does the rest, and the URL appears on
   the workflow run.

The site lands at `https://<user>.github.io/<repo>/`. That subpath is why every
asset reference in `index.html` is relative — it works identically at a domain
root or nested any number of directories deep.

**If you would rather not use Actions**, GitHub Pages can also serve straight
from a branch, but only from the repository root or `/docs`. In that case rename
`web/` to `docs/` and pick *Deploy from a branch → main → /docs*. Nothing inside
needs to change. (`web/.nojekyll` is already there so Jekyll never touches it.)

Worth knowing before you publish: progress lives in `localStorage`, which is
per-browser and per-origin. Players keep their own solutions, nothing is shared,
and there is no backend to run.

## Scoring

Cycles are counted on the slowest of the three test cases. Each metric — cycles,
chips, instructions, wires — keeps its own record, so a design that is small and
a design that is fast can both stand on your record sheet.

Progress and designs live in `localStorage`. `export` puts the current design on
your clipboard as a code; `import` takes one back, including for an assignment
you are not currently looking at.

## Keys

`space` run/stop · `.` single cycle · `r` reset · `enter` verify ·
`delete` remove selection · `esc` cancel placement · `f` fit board · `?` manual

Scroll to zoom, drag the background to pan, right-click a chip or wire to remove
it, double-click a core to jump to the editor.
