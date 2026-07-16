const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, getCountFromServer, Timestamp, startAfter, setLogLevel } from "firebase/firestore";`,
`import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, getCountFromServer, Timestamp, startAfter, setLogLevel, setDoc } from "firebase/firestore";`
);

code = code.replace(
`async function ensureSnapshot() {
  if (publicDataSnapshot.lastUpdated > 0 && publicDataSnapshot.posts.length > 0) return;
  if (!snapshotPromise) {
    snapshotPromise = generateSnapshot().finally(() => {
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
}`
);

code = code.replace(
`    publicDataSnapshot = {
      posts,
      categories,
      lastUpdated: Date.now()
    };
    
    console.log(\`Snapshot generated. Posts: \${posts.length}, Categories: \${categories.length}\`);
  } catch (err) {`,
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
  } catch (err) {`
);

fs.writeFileSync('server.ts', code);
