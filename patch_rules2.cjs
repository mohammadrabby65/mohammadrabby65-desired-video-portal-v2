const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
  'match /public_snapshot/{document} {\n      allow read, write: if true;\n    }',
  'match /public_snapshot/{document=**} {\n      allow read: if true;\n      allow write: if isAdmin();\n    }'
);

fs.writeFileSync('firestore.rules', rules);
