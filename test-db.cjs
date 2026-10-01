const { initializeApp } = require("firebase/app");
const { initializeFirestore, collection, getDocs, query, limit } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
  messagingSenderId: "15134264747",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function test() {
  try {
    const postQ = query(collection(db, 'posts'), limit(1000));
    const snap = await getDocs(postQ);
    console.log("Docs found:", snap.docs.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
