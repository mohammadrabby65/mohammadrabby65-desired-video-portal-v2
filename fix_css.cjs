const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/@keyframes fade-in\s*\{[\s\S]*?\}/g, '');
css = css.replace(/@keyframes fadeIn\s*\{[\s\S]*?\}/g, '');
css = css.replace(/\.animate-fade-in\s*\{[\s\S]*?\}/g, '');

fs.writeFileSync('src/index.css', css);
