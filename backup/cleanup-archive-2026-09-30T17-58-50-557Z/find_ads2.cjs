const fs = require('fs');

function searchAll(pattern) {
  function scan(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === 'node_modules' || item === '.git') continue;
      const full = dir + '/' + item;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else if (/\.(ts|tsx|js|cjs|mjs|json|html)$/.test(item)) {
        const c = fs.readFileSync(full, 'utf8');
        const m = c.match(pattern);
        if (m) {
          console.log(full, m);
        }
      }
    }
  }
  scan('.');
}

console.log('--- predestineheadypleasure ---');
searchAll(/https?:\/\/[^\s"'`]*predestineheadypleasure[^\s"'`]+/gi);

console.log('--- effectivecpmnetwork ---');
searchAll(/https?:\/\/[^\s"'`]*effectivecpmnetwork[^\s"'`]+/gi);

console.log('--- atOptions ---');
searchAll(/atOptions\s*=\s*\{[^}]+\}/g);

console.log('--- adsterra ---');
searchAll(/adsterra[a-zA-Z0-9_-]*/gi);
