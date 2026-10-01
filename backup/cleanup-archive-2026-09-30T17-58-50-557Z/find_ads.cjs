const fs = require('fs');

const distAssets = fs.existsSync('dist/assets') ? fs.readdirSync('dist/assets') : [];
for (const f of distAssets) {
  if (f.endsWith('.js')) {
    const c = fs.readFileSync('dist/assets/' + f, 'utf8');
    const m = c.match(/https?:\/\/[^\s"'`]+(?:effectivecpmnetwork|predestineheadypleasure|adsterra)[^\s"'`]+/gi);
    if (m) console.log('dist/assets/' + f, Array.from(new Set(m)));
  }
}

// Also check all files in workspace for any scripts or ad tags
console.log('--- checking source files ---');
function scanDir(dir) {
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
    const full = dir + '/' + item;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (/\.(ts|tsx|js|cjs|mjs|json|html)$/.test(item)) {
      const c = fs.readFileSync(full, 'utf8');
      const m = c.match(/https?:\/\/[^\s"'`]+(?:effectivecpmnetwork|predestineheadypleasure|adsterra)[^\s"'`]+/gi);
      if (m) console.log(full, Array.from(new Set(m)));
    }
  }
}
scanDir('.');
