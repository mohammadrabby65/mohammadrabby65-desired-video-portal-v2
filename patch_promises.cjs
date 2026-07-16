const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`          let allPosts: any[] = [];
          for (let i = 1; i <= chunkCount; i++) {
            const chunkDoc = await getDoc(doc(db, 'public_snapshot', 'chunks', 'posts', \`posts_\${i}\`));
            if (chunkDoc.exists()) {
              allPosts = allPosts.concat(chunkDoc.data().data || []);
            }
          }`,
`          let allPosts: any[] = [];
          const chunkPromises = [];
          for (let i = 1; i <= chunkCount; i++) {
            chunkPromises.push(getDoc(doc(db, 'public_snapshot', 'chunks', 'posts', \`posts_\${i}\`)));
          }
          const chunkDocs = await Promise.all(chunkPromises);
          for (const chunkDoc of chunkDocs) {
            if (chunkDoc.exists()) {
              allPosts = allPosts.concat(chunkDoc.data().data || []);
            }
          }`
);

fs.writeFileSync('server.ts', code);
