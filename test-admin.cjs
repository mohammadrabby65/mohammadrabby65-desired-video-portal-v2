const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();
db.collection('posts').limit(1).get().then(snap => {
  console.log("Admin OK! Docs:", snap.size);
}).catch(e => {
  console.error("Admin Error:", e);
});
