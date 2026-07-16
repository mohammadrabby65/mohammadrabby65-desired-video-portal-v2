const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`async function ensureSnapshot() {
  if (publicDataSnapshot.lastUpdated > 0 && publicDataSnapshot.posts.length > 0) return;
  if (!snapshotPromise) {
    snapshotPromise = (async () => {
      try {
        const snapDoc = await getDoc(doc(db, 'public_snapshot', 'latest'));
        if (snapDoc.exists()) {
          const data = snapDoc.data();
          publicDataSnapshot = {
            posts: data.posts || [],
            categories: data.categories || [],
            lastUpdated: data.generatedAt ? (data.generatedAt.toDate ? data.generatedAt.toDate().getTime() : new Date(data.generatedAt).getTime()) : Date.now()
          };
          console.log(\`Loaded snapshot from Firestore. Posts: \${publicDataSnapshot.posts.length}\`);
        } else {
          await generateSnapshot();
        }
      } catch (err) {
        console.error("Failed to load snapshot from Firestore, generating...", err);
        await generateSnapshot();
      }
    })().finally(() => {
      snapshotPromise = null;
    });
  }
  await snapshotPromise;
}`,
`async function ensureSnapshot() {
  if (publicDataSnapshot.lastUpdated > 0 && publicDataSnapshot.posts.length > 0) return;
  if (!snapshotPromise) {
    snapshotPromise = (async () => {
      try {
        const metaDoc = await getDoc(doc(db, 'public_snapshot', 'metadata'));
        if (metaDoc.exists()) {
          const meta = metaDoc.data();
          const chunkCount = meta.chunkCount || 0;
          
          const catDoc = await getDoc(doc(db, 'public_snapshot', 'categories'));
          const categories = catDoc.exists() ? catDoc.data().data || [] : [];
          
          let allPosts: any[] = [];
          for (let i = 1; i <= chunkCount; i++) {
            const chunkDoc = await getDoc(doc(db, 'public_snapshot', 'chunks', 'posts', \`posts_\${i}\`));
            if (chunkDoc.exists()) {
              allPosts = allPosts.concat(chunkDoc.data().data || []);
            }
          }
          
          publicDataSnapshot = {
            posts: allPosts,
            categories: categories,
            lastUpdated: meta.generatedAt ? (meta.generatedAt.toDate ? meta.generatedAt.toDate().getTime() : new Date(meta.generatedAt).getTime()) : Date.now()
          };
          console.log(\`Loaded snapshot from Firestore. Posts: \${publicDataSnapshot.posts.length}\`);
        } else {
          await generateSnapshot();
        }
      } catch (err) {
        console.error("Failed to load snapshot from Firestore, generating...", err);
        await generateSnapshot();
      }
    })().finally(() => {
      snapshotPromise = null;
    });
  }
  await snapshotPromise;
}`
);

code = code.replace(
`    publicDataSnapshot = {
      posts,
      categories,
      lastUpdated: Date.now()
    };
    
    await setDoc(doc(db, 'public_snapshot', 'latest'), {
      generatedAt: Timestamp.now(),
      version: 1,
      posts,
      categories
    });
    console.log(\`Snapshot generated and saved to Firestore. Posts: \${posts.length}, Categories: \${categories.length}\`);
  } catch (err) {`,
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
  } catch (err) {`
);

fs.writeFileSync('server.ts', code);
