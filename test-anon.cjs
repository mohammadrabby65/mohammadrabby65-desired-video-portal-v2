const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, limit, getDocs, updateDoc, doc, increment } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

signInAnonymously(auth).then(cred => {
  console.log("Signed in anonymously:", cred.user.uid);
  const docRef = doc(db, 'posts', 'l21GJ92EJ8SEimzn6EiN');
  return updateDoc(docRef, { views: increment(1) });
}).then(() => {
  console.log("Successfully updated doc!");
}).catch(e => {
  console.error("Error:", e);
});
