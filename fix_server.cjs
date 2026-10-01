const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/\\n  app\.get\("\/"/g, '\n  app.get("/"');
fs.writeFileSync('server.ts', code);
