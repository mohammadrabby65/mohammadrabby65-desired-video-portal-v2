const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  initializeApp({
    projectId: "gen-lang-client-0637384010"
  });
  const db = getFirestore();
  db.collection('posts').limit(1).get().then(snap => {
    console.log("Admin OK! Docs:", snap.size);
  }).catch(e => {
    console.error("Admin Auth Error:", e);
  });
} catch(e) {
  console.error("Init error:", e);
}
