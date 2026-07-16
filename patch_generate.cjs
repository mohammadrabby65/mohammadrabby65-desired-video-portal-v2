const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`    const chunkCount = Math.ceil(posts.length / 100);

    await setDoc(doc(db, 'public_snapshot', 'metadata'), {
      generatedAt: Timestamp.now(),
      version: 2,
      chunkCount,
      totalPosts: posts.length,
      totalCategories: categories.length
    });

    await setDoc(doc(db, 'public_snapshot', 'categories'), {
      data: categories
    });

    for (let i = 0; i < chunkCount; i++) {
      const chunk = posts.slice(i * 100, (i + 1) * 100);
      await setDoc(doc(db, 'public_snapshot', 'chunks', 'posts', \`posts_\${i + 1}\`), {
        data: chunk
      });
    }

    publicDataSnapshot = {
      posts,
      categories,
      lastUpdated: Date.now()
    };
    
    console.log(\`Snapshot generated and saved to Firestore. Posts: \${posts.length}, Categories: \${categories.length}\`);
  } catch (err) {`,
`    const chunkCount = Math.ceil(posts.length / 100);

    publicDataSnapshot = {
      posts,
      categories,
      lastUpdated: Date.now()
    };

    try {
      await setDoc(doc(db, 'public_snapshot', 'metadata'), {
        generatedAt: Timestamp.now(),
        version: 2,
        chunkCount,
        totalPosts: posts.length,
        totalCategories: categories.length
      });

      await setDoc(doc(db, 'public_snapshot', 'categories'), {
        data: categories
      });

      for (let i = 0; i < chunkCount; i++) {
        const chunk = posts.slice(i * 100, (i + 1) * 100);
        await setDoc(doc(db, 'public_snapshot', \`posts_\${i + 1}\`), {
          data: chunk
        });
      }
      console.log(\`Snapshot generated and saved to Firestore. Posts: \${posts.length}, Categories: \${categories.length}\`);
    } catch (writeErr) {
      console.warn("Could not save snapshot to Firestore (likely permission denied for server environment). Memory updated.", writeErr.message);
    }
  } catch (err) {`
);

fs.writeFileSync('server.ts', code);
