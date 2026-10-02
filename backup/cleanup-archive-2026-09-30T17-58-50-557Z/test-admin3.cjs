const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
  initializeApp({
    projectId: "gen-lang-client-0637384010",
    databaseId: "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2"
  });
  const db = getFirestore("ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");
  db.collection('posts').limit(1).get().then(snap => {
    console.log("Admin OK! Docs:", snap.size);
  }).catch(e => {
    console.error("Admin Auth Error:", e);
  });
} catch(e) {
  console.error("Init error:", e);
}
