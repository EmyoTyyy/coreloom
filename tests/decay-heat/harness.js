const fs = require('node:fs');
const path = require('node:path');
const { BASE, load } = require('./load.js');

for (const f of ['i18n.js', 'i18n-text.js', 'i18n-doc.js', 'sim/steam.js', 'sim/kinetics.js', 'sim/decay.js', 'sim/xenon.js',
  'sim/reactivity.js', 'sim/thermal.js', 'sim/instruments.js', 'sim/plant.js', 'ui/replay.js']) {
  load(...f.split('/'));
}

const sdir = path.join(BASE, 'scenarios');
if (fs.existsSync(sdir)) for (const f of fs.readdirSync(sdir).sort()) load('scenarios', f);

module.exports = globalThis.DH;
