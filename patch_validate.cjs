const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'posts.sort((a, b) => b._publishedAtMs - a._publishedAtMs);\n\n    publicDataSnapshot = {',
  'posts.sort((a, b) => b._publishedAtMs - a._publishedAtMs);\n\n    if (posts.length === 0) {\n      console.warn("Validation failed: 0 posts fetched. Aborting update.");\n      return;\n    }\n\n    publicDataSnapshot = {'
);

fs.writeFileSync('server.ts', code);
