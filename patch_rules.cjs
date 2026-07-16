const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
  'match /settings/{document} {',
  'match /public_snapshot/{document} {\n      allow read, write: if true;\n    }\n\n    match /settings/{document} {'
);

fs.writeFileSync('firestore.rules', rules);
