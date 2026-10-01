const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/  to \{ opacity: 1; \}\}/g, '');
css = css.replace(/  to \{ opacity: 1; transform: scale\(1\); \}\}/g, '');
css = css.replace(/\.mask-image-fade-edges\s*\{[\s\S]*?\}/g, '');

fs.writeFileSync('src/index.css', css);
