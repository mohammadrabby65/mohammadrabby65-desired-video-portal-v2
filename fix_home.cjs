const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(/mask-image-fade-edges/g, '');

fs.writeFileSync('src/pages/Home.tsx', content);
