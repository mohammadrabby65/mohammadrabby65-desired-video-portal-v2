import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, collection, getDocs, query, where, limit, startAfter, orderBy } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function run() {
  const q1 = query(
    collection(db, 'posts'), 
    where('searchTerms', 'array-contains', 'bangladeshi'), 
    limit(2)
  );
  const snap1 = await getDocs(q1);
  console.log("Page 1:");
  snap1.docs.forEach(d => console.log(d.id, d.data().title));
  
  const lastDoc = snap1.docs[1];
  
  const q2 = query(
    collection(db, 'posts'), 
    where('searchTerms', 'array-contains', 'bangladeshi'), 
    startAfter(lastDoc),
    limit(2)
  );
  const snap2 = await getDocs(q2);
  console.log("Page 2 with doc snapshot:");
  snap2.docs.forEach(d => console.log(d.id, d.data().title));

  const q3 = query(
    collection(db, 'posts'), 
    where('searchTerms', 'array-contains', 'bangladeshi'), 
    orderBy('__name__'),
    startAfter(lastDoc.id),
    limit(2)
  );
  const snap3 = await getDocs(q3);
  console.log("Page 2 with doc ID:");
  snap3.docs.forEach(d => console.log(d.id, d.data().title));
  
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
