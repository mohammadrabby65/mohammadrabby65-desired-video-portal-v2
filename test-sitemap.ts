import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, limit } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
  messagingSenderId: "15134264747",
  measurementId: ""
};

const fbApp = initializeApp(firebaseConfig, "server-app-test");
const db = initializeFirestore(fbApp, { experimentalForceLongPolling: true }, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function run() {
  try {
    const [categoriesSnapshot, postsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'categories'))),
      getDocs(query(collection(db, 'posts'), limit(1000)))
    ]);
    console.log("Success:", categoriesSnapshot.docs.length, postsSnapshot.docs.length);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
