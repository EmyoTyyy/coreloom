// Runs every game's test suite. `npm test` and the Pages workflow both call
// this file, so adding a game means adding one line below.
//
// Each suite runs in its own process. They are not merely independent — they
// are written against different module systems (Coreloom's is ESM, Decay
// Heat's is CommonJS under its own package.json) and each calls process.exit
// when it finishes, so they cannot share one.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

const SUITES = [
  ['Coreloom', 'coreloom/run.js'],
  ['Decay Heat', 'decay-heat/run.js'],
];

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

const failed = [];

for (const [name, file] of SUITES) {
  console.log(bold(`\n──── ${name} ────\n`));
  const r = spawnSync(process.execPath, [path.join(here, file)], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(name);
}

if (failed.length) {
  console.log(red(`\n${failed.join(', ')} failed.\n`));
  process.exit(1);
}
console.log(green(`\nall ${SUITES.length} suites passed.\n`));
