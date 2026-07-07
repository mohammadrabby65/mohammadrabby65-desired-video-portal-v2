const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const app = initializeApp({
  projectId: "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2"
});
const db = getFirestore(app);

async function check() {
  const q = collection(db, 'posts');
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, data.videoUrl ? data.videoUrl.substring(0, 50) : "NO URL");
  });
}
check();
