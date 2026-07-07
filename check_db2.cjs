const fs = require('fs');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

const urls = fs.readFileSync('urls.txt', 'utf8').split('\n').filter(l => l.trim() !== '');

async function run() {
  for (const url of urls) {
    if (url.includes('/category/')) {
      const slug = url.split('/category/')[1];
      if (['trending', 'latest', 'popular'].includes(slug)) continue;
      const q = query(collection(db, "categories"), where("slug", "==", slug));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log(`MISSING FROM DB: ${url}`);
      }
    }
  }
  console.log("Done checking DB cats");
}
run();
