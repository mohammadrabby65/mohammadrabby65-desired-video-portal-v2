const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');
code = code.replace(
  'allow write: if isAdmin();',
  `allow write: if isAdmin();
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views']) &&
                       (request.resource.data.views > resource.data.views || resource.data.views == null);`
);
fs.writeFileSync('firestore.rules', code);
