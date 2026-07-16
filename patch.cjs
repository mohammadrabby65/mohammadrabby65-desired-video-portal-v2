const fs = require('fs');
let code = fs.readFileSync('src/hooks/useCategories.ts', 'utf8');
code = code.replace('const data = await res.json();', 'const data = await res.json(); console.log("Fetched categories:", data.length);');
fs.writeFileSync('src/hooks/useCategories.ts', code);
