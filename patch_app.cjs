const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/import\("\.\/pages\/Home"\)/g, 'import("./pages/Home?v=1")');
fs.writeFileSync('src/App.tsx', content);
