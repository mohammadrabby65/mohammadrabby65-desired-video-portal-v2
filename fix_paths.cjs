const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
/await setDoc\(doc\(db, 'public_snapshot', `posts_\$\{i \+ 1\}`\), \{/g,
"await setDoc(doc(db, 'public_snapshot', 'chunks', 'posts', `posts_${i + 1}`), {"
);

fs.writeFileSync('server.ts', code);
