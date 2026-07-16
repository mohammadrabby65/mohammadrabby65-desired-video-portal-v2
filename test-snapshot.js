import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, orderBy, setLogLevel } from "firebase/firestore";

setLogLevel("silent");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
};

const fbApp = initializeApp(firebaseConfig, "server-app");
const db = initializeFirestore(fbApp, { experimentalForceLongPolling: true }, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function generateSnapshot() {
  console.log("Generating data snapshot...");
  try {
    const catQ = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const catSnap = await getDocs(catQ);
    console.log("Categories:", catSnap.size);
    const postQ = query(collection(db, 'posts'));
    const postSnap = await getDocs(postQ);
    console.log("Posts:", postSnap.size);
  } catch (err) {
    console.error("Error generating snapshot:", err);
  }
}

generateSnapshot().then(() => process.exit(0));
