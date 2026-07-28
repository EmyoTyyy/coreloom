// CORELOOM :: reference solutions.
//
// Every assignment in the library has a worked solution here. The test harness
// runs all of them against all hidden test cases, which is what guarantees the
// puzzle set is actually solvable with the chips and line limits on offer.
// These are correct, not optimal — beating them is the entire point of the game.

/**
 * Tiny layout DSL.
 *   chips: { id: [TYPE, col, row, code?, config?] }
 *   wires: [ 'src.PORT -> dst.PORT', ... ]
 */
export function layout(chips, wires) {
  return {
    chips: Object.entries(chips).map(([id, [type, c, r, code, config]]) => ({
      // strip the leading newline that template literals introduce, so the
      // fixtures are counted the same way the editor would count them
      id, type, c, r, code: (code || '').replace(/^\n/, ''), config: config || {},
    })),
    wires: wires.map((w, i) => {
      const [a, b] = w.split('->').map((s) => s.trim());
      const [ac, ap] = a.split('.');
      const [bc, bp] = b.split('.');
      return { id: `w${i}`, from: [ac, ap], to: [bc, bp] };
    }),
  };
}

// A comparator that receives two values on W and their copies on N, then emits
// the smaller one followed by the larger one. Reused by several solutions.
const CMP_MIN_MAX = `
top: MOV W ACC
     SUB W
     JGZ bfirst
     MOV N E
     MOV N E
     JMP top
bfirst: MOV N ACC
     SAV
     MOV N E
     SWP
     MOV ACC E
     JMP top`;

// Reads one value and writes it to E and S. One value in, two copies out.
const FANOUT2 = `
MOV W ACC
MOV ACC E
MOV ACC S`;

export const SOLUTIONS = {
  // ---- ORIENTATION ------------------------------------------------------
  relay: layout(
    { c1: ['CORE', 0, 0, 'MOV W E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  invert: layout(
    { c1: ['CORE', 0, 0, 'MOV W ACC\nNEG\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  amplify: layout(
    { c1: ['CORE', 0, 0, 'MOV W ACC\nMUL 3\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  adder: layout(
    { c1: ['CORE', 0, 1, 'MOV W ACC\nADD N\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'in1.OUT -> c1.N_IN', 'c1.E_OUT -> out0.IN'],
  ),

  // ---- CONTROL ----------------------------------------------------------
  sign: layout(
    {
      c1: ['CORE', 0, 0, `
top: MOV W ACC
     JGZ pos
     JLZ neg
     MOV 0 E
     JMP top
pos: MOV 1 E
     JMP top
neg: MOV -1 E
     JMP top`],
    },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  rectify: layout(
    {
      c1: ['CORE', 0, 0, `
top: MOV W ACC
     JGZ out
     NEG
out: MOV ACC E
     JMP top`],
    },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  ceiling: layout(
    {
      c1: ['CORE', 0, 0, `
top: MOV W ACC
     SUB 50
     JGZ hi
     ADD 100
     JLZ lo
     SUB 50
     MOV ACC E
     JMP top
hi:  MOV 50 E
     JMP top
lo:  MOV -50 E
     JMP top`],
    },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  // Comparing consumes both operands, so a fan-out core keeps spare copies in
  // a queue while a second core works out which of the pair won.
  larger: layout(
    {
      c1: ['CORE', 0, 1, `
top: MOV W ACC
     MOV ACC E
     MOV ACC S
     MOV N ACC
     MOV ACC E
     MOV ACC S
     JMP top`],
      q1: ['QUEUE', 0, 2],
      c2: ['CORE', 1, 1, `
top: MOV W ACC
     SUB W
     JGZ takea
     MOV N NIL
     MOV N E
     JMP top
takea: MOV N E
     MOV N NIL
     JMP top`],
    },
    [
      'in0.OUT -> c1.W_IN', 'in1.OUT -> c1.N_IN',
      'c1.E_OUT -> c2.W_IN', 'c1.S_OUT -> q1.IN',
      'q1.OUT -> c2.N_IN', 'c2.E_OUT -> out0.IN',
    ],
  ),

  // ---- ROUTING ----------------------------------------------------------
  duplicate: layout(
    { s1: ['SPLIT', 1, 1] },
    ['in0.OUT -> s1.IN', 's1.E_OUT -> out0.IN', 's1.S_OUT -> out1.IN'],
  ),

  weave: layout(
    { c1: ['CORE', 1, 1, 'MOV W E\nMOV N E'] },
    ['in0.OUT -> c1.W_IN', 'in1.OUT -> c1.N_IN', 'c1.E_OUT -> out0.IN'],
  ),

  sortyard: layout(
    { f1: ['FILTER', 1, 1, '', { op: '>', operand: 0 }] },
    ['in0.OUT -> f1.IN', 'f1.E_OUT -> out0.IN', 'f1.S_OUT -> out1.IN'],
  ),

  sieve3: layout(
    {
      f1: ['FILTER', 1, 1, '', { op: '%', operand: 3 }],
      k1: ['SINK', 1, 2],
    },
    ['in0.OUT -> f1.IN', 'f1.E_OUT -> out0.IN', 'f1.S_OUT -> k1.N_IN'],
  ),

  // ---- MEMORY -----------------------------------------------------------
  delayline: layout(
    {
      c1: ['CORE', 0, 1, `
     MOV 0 E
     MOV 0 E
     MOV 0 E
top: MOV W E
     JMP top`],
      q1: ['QUEUE', 1, 1],
    },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> q1.IN', 'q1.OUT -> out0.IN'],
  ),

  reversal: layout(
    {
      c1: ['CORE', 0, 1, `
top:  MOV 10 ACC
push: MOV W S
      SUB 1
      JNZ push
      MOV 10 ACC
pop:  MOV N E
      SUB 1
      JNZ pop
      JMP top`],
      s1: ['STACK', 1, 1],
    },
    ['in0.OUT -> c1.W_IN', 'c1.S_OUT -> s1.IN', 's1.OUT -> c1.N_IN', 'c1.E_OUT -> out0.IN'],
  ),

  accumulate: layout(
    { c1: ['CORE', 1, 1, 'ADD W\nMOV ACC E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),

  highwater: layout(
    {
      sp: ['SPLIT', 0, 1],
      c1: ['CORE', 1, 1, `
     MOV -999 ACC
top: SAV
     SUB W
     JLZ new
     SWP
     MOV S NIL
     MOV ACC E
     JMP top
new: MOV S ACC
     MOV ACC E
     JMP top`],
    },
    ['in0.OUT -> sp.IN', 'sp.E_OUT -> c1.W_IN', 'sp.S_OUT -> c1.S_IN', 'c1.E_OUT -> out0.IN'],
  ),

  // ---- ALGORITHMS -------------------------------------------------------
  pairsort: layout(
    {
      c1: ['CORE', 0, 1, `
top: MOV W ACC
     MOV ACC E
     MOV ACC S
     MOV W ACC
     MOV ACC E
     MOV ACC S
     JMP top`],
      q1: ['QUEUE', 0, 2],
      c2: ['CORE', 1, 1, CMP_MIN_MAX],
    },
    [
      'in0.OUT -> c1.W_IN', 'c1.E_OUT -> c2.W_IN', 'c1.S_OUT -> q1.IN',
      'q1.OUT -> c2.N_IN', 'c2.E_OUT -> out0.IN',
    ],
  ),

  // median = sum - max - min. Three specialists, one adder, one fan-out that
  // feeds each of them the copies they need.
  median: layout(
    {
      c1: ['CORE', 0, 1, `
top: MOV W ACC
     MOV ACC E
     MOV ACC S
     MOV ACC S
     MOV ACC N
     MOV ACC N
     JMP top`],
      csum: ['CORE', 1, 1, 'MOV W ACC\nADD W\nADD W\nMOV ACC E'],
      cmax: ['CORE', 1, 2, `
     MOV W ACC
     MOV W NIL
     SAV
     SUB W
     JLZ n1
     SWP
     MOV W NIL
     JMP c2
n1:  MOV W ACC
c2:  SAV
     SUB W
     JLZ n2
     SWP
     MOV W NIL
     JMP em
n2:  MOV W ACC
em:  MOV ACC E`],
      cmin: ['CORE', 1, 0, `
     MOV W ACC
     MOV W NIL
     SAV
     SUB W
     JGZ n1
     SWP
     MOV W NIL
     JMP c2
n1:  MOV W ACC
c2:  SAV
     SUB W
     JGZ n2
     SWP
     MOV W NIL
     JMP em
n2:  MOV W ACC
em:  MOV ACC E`],
      cfin: ['CORE', 2, 1, 'MOV W ACC\nSUB N\nSUB S\nMOV ACC E'],
    },
    [
      'in0.OUT -> c1.W_IN',
      'c1.E_OUT -> csum.W_IN', 'c1.S_OUT -> cmax.W_IN', 'c1.N_OUT -> cmin.W_IN',
      'csum.E_OUT -> cfin.W_IN', 'cmin.E_OUT -> cfin.N_IN', 'cmax.E_OUT -> cfin.S_IN',
      'cfin.E_OUT -> out0.IN',
    ],
  ),

  // A counter core injects a sentinel the data can never contain, which lets
  // the encoder flush its final run instead of stalling on an empty stream.
  rle: layout(
    {
      c1: ['CORE', 0, 1, `
      MOV 24 ACC
top:  MOV W E
      SUB 1
      JNZ top
      MOV 0 E
done: MOV W E
      JMP done`],
      sp: ['SPLIT', 1, 1],
      c2: ['CORE', 2, 1, `
      MOV W ACC
      MOV S NIL
      MOV 1 N
loop: SAV
      SUB W
      JNZ diff
      MOV E ACC
      ADD 1
      MOV ACC N
      SWP
      MOV S NIL
      JMP loop
diff: SWP
      MOV ACC S
      MOV E S
      MOV S ACC
      MOV 1 N
      JMP loop`],
      st: ['STACK', 2, 0],
    },
    [
      'in0.OUT -> c1.W_IN', 'c1.E_OUT -> sp.IN',
      'sp.E_OUT -> c2.W_IN', 'sp.S_OUT -> c2.S_IN',
      'c2.N_OUT -> st.IN', 'st.OUT -> c2.E_IN',
      'c2.S_OUT -> out0.IN',
    ],
  ),

  // r^2 is the sum of the first r odd numbers. Subtract 1, 3, 5, ... and count.
  // The queue holds two copies of the current odd number so it survives being read.
  rootext: layout(
    {
      c1: ['CORE', 1, 1, `
top:  MOV 1 S
      MOV 1 S
      MOV W ACC
loop: SUB S
      JLZ done
      SAV
      MOV S ACC
      ADD 2
      MOV ACC S
      MOV ACC S
      SWP
      JMP loop
done: MOV S ACC
      SUB 1
      DIV 2
      MOV ACC E
      JMP top`],
      q1: ['QUEUE', 1, 2],
    },
    ['in0.OUT -> c1.W_IN', 'c1.S_OUT -> q1.IN', 'q1.OUT -> c1.S_IN', 'c1.E_OUT -> out0.IN'],
  ),

  tournament: layout(
    {
      sp: ['SPLIT', 0, 1],
      c1: ['CORE', 1, 1, `
top:  MOV 7 N
      MOV W ACC
      MOV S NIL
loop: SAV
      SUB W
      JLZ new
      SWP
      MOV S NIL
      JMP dec
new:  MOV S ACC
dec:  SAV
      MOV E ACC
      SUB 1
      JEZ fin
      MOV ACC N
      SWP
      JMP loop
fin:  SWP
      MOV ACC E
      JMP top`],
      st: ['STACK', 1, 0],
    },
    [
      'in0.OUT -> sp.IN', 'sp.E_OUT -> c1.W_IN', 'sp.S_OUT -> c1.S_IN',
      'c1.N_OUT -> st.IN', 'st.OUT -> c1.E_IN', 'c1.E_OUT -> out0.IN',
    ],
  ),

  // Carry the winner of each comparison forward, emit the loser immediately.
  bubblepass: layout(
    {
      c1: ['CORE', 0, 1, `
top:  MOV 7 ACC
      SAV
      MOV W ACC
loop: MOV ACC S
      MOV W S
      MOV N E
      MOV N ACC
      SWP
      SUB 1
      JEZ fin
      SWP
      JMP loop
fin:  SWP
      MOV ACC E
      JMP top`],
      c2: ['CORE', 1, 2, FANOUT2],
      q1: ['QUEUE', 2, 2],
      c3: ['CORE', 2, 1, CMP_MIN_MAX],
    },
    [
      'in0.OUT -> c1.W_IN', 'c1.S_OUT -> c2.W_IN',
      'c2.E_OUT -> c3.W_IN', 'c2.S_OUT -> q1.IN', 'q1.OUT -> c3.N_IN',
      'c3.E_OUT -> c1.N_IN', 'c1.E_OUT -> out0.IN',
    ],
  ),

  scratch: layout(
    { c1: ['CORE', 1, 1, 'MOV W E'] },
    ['in0.OUT -> c1.W_IN', 'c1.E_OUT -> out0.IN'],
  ),
};
