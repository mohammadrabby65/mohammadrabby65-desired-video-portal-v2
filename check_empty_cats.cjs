const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

const cats = ['trending', 'latest', 'popular', 'bhabhi', 'desi-porn', 'tamil', 'outdoor', 'bangla', 'mms', 'punjabi', 'indian-porn'];

async function run() {
  for (const cat of cats) {
    if (['trending', 'latest', 'popular'].includes(cat)) {
      const q = query(collection(db, "posts"));
      const snap = await getDocs(q);
      if (snap.empty) console.log(`${cat} is empty`);
      continue;
    }
    const q = query(collection(db, "posts"), where("categories", "array-contains", cat));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log(`Category empty: ${cat}`);
    } else {
      // console.log(`Category ${cat} has ${snap.size} videos`);
    }
  }
}
run();
