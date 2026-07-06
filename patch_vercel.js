const fs = require('fs');
const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
delete config.headers;
fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2));
