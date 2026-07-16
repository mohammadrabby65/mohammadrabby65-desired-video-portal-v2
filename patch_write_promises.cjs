const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`      for (let i = 0; i < chunkCount; i++) {
        const chunk = posts.slice(i * 100, (i + 1) * 100);
        await setDoc(doc(db, 'public_snapshot', 'chunks', 'posts', \`posts_\${i + 1}\`), {
          data: chunk
        });
      }`,
`      const writePromises = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunk = posts.slice(i * 100, (i + 1) * 100);
        writePromises.push(setDoc(doc(db, 'public_snapshot', 'chunks', 'posts', \`posts_\${i + 1}\`), {
          data: chunk
        }));
      }
      await Promise.all(writePromises);`
);

fs.writeFileSync('server.ts', code);
