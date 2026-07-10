import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, limit, getCountFromServer } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function test() {
  try {
    const q = query(collection(db, 'posts'), limit(1000));
    const snap = await getCountFromServer(q);
    console.log("Count:", snap.data().count);
  } catch(e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
test();
