import { app, db } from "./src/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

async function run() {
  const cacheDoc = await getDoc(doc(db, "cache", "snapshot"));
  console.log("cache/snapshot exists?", cacheDoc.exists());
  
  const settingsDoc = await getDoc(doc(db, "settings", "snapshot"));
  console.log("settings/snapshot exists?", settingsDoc.exists());
  
  const snaps = await getDocs(collection(db, "snapshots"));
  console.log("snapshots count:", snaps.docs.length);
}
run().catch(console.error);
