/* Lightweight static check: require every backend .js file to catch syntax/module errors. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function listJs(dir) {
  return fs.readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) return listJs(p);
    if (p.endsWith('.js')) return [p];
    return [];
  });
}

const files = listJs(root).filter((p) => !/\\node_modules\\/.test(p));
let hadError = false;
for (const f of files) {
  if (f.endsWith(path.join('backend', 'index.js')) || /scripts\\/.test(f)) continue;
  try {
    require(f);
    console.log('OK', path.relative(root, f));
  } catch (e) {
    hadError = true;
    console.error('ERR', path.relative(root, f), '\n ', e && e.stack ? e.stack.split('\n')[0] : e.message);
  }
}

if (hadError) process.exit(1);
else console.log('\nAll backend modules required successfully.');
