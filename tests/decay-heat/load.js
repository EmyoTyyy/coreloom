// Loads the game's scripts the way the page does: evaluated in order against
// one shared global. They are classic <script> files that assign to
// globalThis.DH — they export nothing — so require() is the wrong tool for
// them, and would fail anyway, because the repo's package.json marks .js as
// ESM and these files live outside this directory's commonjs scope.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const BASE = path.join(__dirname, '..', '..', 'site', 'decay-heat', 'js');
const seen = new Set();

// Idempotent, because several suites pull in overlapping sets and the game's
// files are not written to be evaluated twice.
function load(...rel) {
  const file = path.join(BASE, ...rel);
  if (!seen.has(file)) {
    seen.add(file);
    vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
  }
  return globalThis.DH;
}

module.exports = { BASE, load };
