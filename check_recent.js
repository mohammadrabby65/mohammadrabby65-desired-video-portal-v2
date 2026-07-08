import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, limit, orderBy } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
  messagingSenderId: "15134264747",
  measurementId: ""
};

const fbApp = initializeApp(firebaseConfig);
const db = initializeFirestore(fbApp, {}, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function main() {
  const allPosts = await getDocs(query(collection(db, "posts"), orderBy("publishedAt", "desc"), limit(5)));
  allPosts.forEach(d => {
    console.log(d.data().title, d.data().publishedAt, d.data().isActive);
  });
  process.exit(0);
}
main();
