const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function run() {
  const categories = await getDocs(collection(db, "categories"));
  categories.forEach(d => {
    const slug = d.data().slug;
    if (/[^a-zA-Z0-9\-]/.test(slug)) {
      console.log(`Bad char in category: ${slug}`);
    }
  });
  
  const posts = await getDocs(collection(db, "posts"));
  posts.forEach(d => {
    const slug = d.data().slug;
    if (/[^a-zA-Z0-9\-]/.test(slug)) {
      console.log(`Bad char in post: ${slug}`);
    }
  });
  console.log("Done checking slugs");
}
run();
