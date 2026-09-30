const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace('console.error("View API Error", err); fs.writeFileSync("/tmp/view_err.log", err.toString() + "\\n" + err.stack);', 'console.error("View API Error", err);');
fs.writeFileSync('server.ts', code);
