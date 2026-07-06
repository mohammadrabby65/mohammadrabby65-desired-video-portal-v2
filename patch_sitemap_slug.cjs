const fs = require('fs');
const p = 'server.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  "encodeURIComponent(tag.replace(/\\s+/g, '-').toLowerCase())",
  "encodeURIComponent(tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))"
);

fs.writeFileSync(p, c);
