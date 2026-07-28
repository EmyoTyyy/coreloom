// CORELOOM :: instruction set architecture for the CORE chip.

export const VAL_MIN = -999;
export const VAL_MAX = 999;

export const clamp = (v) => (v < VAL_MIN ? VAL_MIN : v > VAL_MAX ? VAL_MAX : v | 0);

export const SIDES = ['N', 'E', 'S', 'W'];

/** Human-friendly aliases accepted by the assembler for each side. */
export const SIDE_ALIAS = {
  N: 'N', UP: 'N', NORTH: 'N',
  E: 'E', RIGHT: 'E', EAST: 'E',
  S: 'S', DOWN: 'S', SOUTH: 'S',
  W: 'W', LEFT: 'W', WEST: 'W',
};

export const REGISTERS = ['ACC', 'NIL'];

// operand classes: SRC = anything readable, DST = anything writable, LBL = label
export const SRC = 'SRC';
export const DST = 'DST';
export const LBL = 'LBL';

/**
 * The instruction table. `args` lists operand classes in order.
 * `doc` is surfaced in the in-game reference panel.
 */
export const INSTRUCTIONS = {
  NOP: { args: [], doc: 'Do nothing for one cycle.' },
  MOV: { args: [SRC, DST], doc: 'Copy SRC into DST. Reading or writing a port blocks until the transfer completes.' },
  ADD: { args: [SRC], doc: 'ACC = ACC + SRC' },
  SUB: { args: [SRC], doc: 'ACC = ACC - SRC' },
  MUL: { args: [SRC], doc: 'ACC = ACC * SRC' },
  DIV: { args: [SRC], doc: 'ACC = ACC / SRC, truncated toward zero. Dividing by zero faults the core.' },
  MOD: { args: [SRC], doc: 'ACC = remainder of ACC / SRC, sign follows ACC. Zero divisor faults the core.' },
  NEG: { args: [], doc: 'ACC = -ACC' },
  SAV: { args: [], doc: 'BAK = ACC' },
  SWP: { args: [], doc: 'Exchange ACC and BAK.' },
  JMP: { args: [LBL], doc: 'Jump to a label.' },
  JEZ: { args: [LBL], doc: 'Jump if ACC == 0' },
  JNZ: { args: [LBL], doc: 'Jump if ACC != 0' },
  JGZ: { args: [LBL], doc: 'Jump if ACC > 0' },
  JLZ: { args: [LBL], doc: 'Jump if ACC < 0' },
  JRO: { args: [SRC], doc: 'Jump to instruction (current index + SRC), clamped to the program.' },
};

export const MNEMONICS = Object.keys(INSTRUCTIONS);

/** Default maximum number of code lines a single CORE may hold. */
export const DEFAULT_CODE_LINES = 15;
