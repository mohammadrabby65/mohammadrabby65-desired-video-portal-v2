const { initializeApp } = require("firebase/app");
const { initializeFirestore, collection, getDocs, query, limit } = require("firebase/firestore");
const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
};
const fbApp = initializeApp(firebaseConfig, "server-app-count");
const db = initializeFirestore(fbApp, {}, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function count() {
  try {
    const snap = await getDocs(query(collection(db, 'posts'), limit(1000)));
    console.log("Total posts with limit 1000:", snap.docs.length);
  } catch (e) {
    console.log("Error with limit:", e.message);
  }
  process.exit(0);
}
count();
