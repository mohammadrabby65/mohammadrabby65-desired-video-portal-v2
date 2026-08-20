const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace('require("fs").writeFileSync', 'fs.writeFileSync');
fs.writeFileSync('server.ts', code);
