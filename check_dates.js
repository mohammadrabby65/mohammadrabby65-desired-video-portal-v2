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
  const allPosts = await getDocs(query(collection(db, "posts")));
  const dates = [];
  allPosts.forEach(d => dates.push({ title: d.data().title, publishedAt: d.data().publishedAt, createdAt: d.data().createdAt }));
  
  dates.sort((a,b) => {
    let tA = a.publishedAt?.seconds || a.createdAt?.seconds || 0;
    let tB = b.publishedAt?.seconds || b.createdAt?.seconds || 0;
    if (typeof a.publishedAt === "string") tA = new Date(a.publishedAt).getTime()/1000;
    if (typeof b.publishedAt === "string") tB = new Date(b.publishedAt).getTime()/1000;
    return tB - tA;
  });
  console.log(dates.slice(0, 5));
  process.exit(0);
}
main();
