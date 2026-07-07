const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function run() {
  const q = query(collection(db, "posts"), where("slug", "==", "Indian-Girlfriend-Sex-Video"));
  const snap = await getDocs(q);
  console.log("Found: ", snap.size);
  snap.forEach(doc => {
    console.log(doc.data().slug);
    console.log(doc.data().publishedAt);
  });
}
run();
