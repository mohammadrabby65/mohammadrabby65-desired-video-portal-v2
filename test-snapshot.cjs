const { initializeApp } = require("firebase/app");
const { initializeFirestore, collection, getDocs, query, limit, orderBy } = require("firebase/firestore");
const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
};
const fbApp = initializeApp(firebaseConfig, "server-app-test");
const db = initializeFirestore(fbApp, { experimentalForceLongPolling: true }, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function test() {
  try {
    console.log("Testing categories...");
    const catQ = query(collection(db, 'categories'), orderBy('name', 'asc'), limit(1000));
    await getDocs(catQ);
    console.log("Categories OK");
  } catch (e) {
    console.error("Categories failed:", e.message);
  }
  try {
    console.log("Testing posts...");
    const postQ = query(collection(db, 'posts'), limit(1000));
    await getDocs(postQ);
    console.log("Posts OK");
  } catch (e) {
    console.error("Posts failed:", e.message);
  }
  process.exit(0);
}
test();
