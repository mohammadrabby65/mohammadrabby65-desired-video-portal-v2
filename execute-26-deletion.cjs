const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, collection, doc, getDoc, deleteDoc, getDocs, query, limit } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

const targetIds = [
  "gQ97glXckTQbU7qOr6tr",
  "pk2PhcSJXjcf5Txh2pNk",
  "zy6rTpXRyZqy218Cegms",
  "kxxwZq3nVq4vGAJ6r7hW",
  "wFw6NfetMAdrVACKcFq2",
  "TKZl9kZbAdUC992kX8uM",
  "GamhkIvh3kgPMNUczyrh",
  "NBBdl0hNcayyOYQ4ocJW",
  "bZ2hXJikjZt6ChqAIkBG",
  "D83XVHLJOVeKKIi0hp5P",
  "Zzy5EkIHoIN0QiyVa0ZB",
  "qLBqRXOrzAOGE6nXHuci",
  "RDn8xSmUZP9RBH9He0pa",
  "4ySfG45fx2bnnnqFusQf",
  "os1U3R1ZvyHHrLftVSVK",
  "mRMLteJrvzzfBJshMZdX",
  "PW2t86TAxliYiwRXbsaH",
  "SA3xWuUou5LQ0nKIx5Hq",
  "RnNPdzqhGFX9jDN8bUkA",
  "WVx6j1ohwOo4MSBrrdbS",
  "vVRF5FiMotJZ1UwTvNUp",
  "OrtmwwLfEPVYmPmxy5xu",
  "28DOSbDj0RKjLw9xXs9s",
  "6wgTbntJcmbKLFMiYmvO",
  "c0yH49yPYNjBQs7LGrdc",
  "tYzg2OKqOMI6fy1OBiAB"
];

async function run() {
  console.log("=== STEP 0: AUTHENTICATE ===");
  await signInWithEmailAndPassword(auth, "script-admin@desired.com", "admin123456");
  console.log("Auth OK. User UID:", auth.currentUser.uid);

  console.log("=== STEP 1 & 2: FETCH LIVE DATA & PRE-DELETE VERIFICATION ===");

  // Fetch all documents from Firestore /posts
  const allPostsSnap = await getDocs(query(collection(db, "posts"), limit(2000)));
  console.log("Live Firestore documents fetched:", allPostsSnap.docs.length);

  const docMap = new Map();
  allPostsSnap.docs.forEach(d => {
    docMap.set(d.id, { docId: d.id, ...d.data() });
  });

  const backupData = [];
  const verificationTable = [];

  for (const id of targetIds) {
    if (docMap.has(id)) {
      const record = docMap.get(id);
      backupData.push(record);
      verificationTable.push({
        id: record.docId,
        exists: true,
        title: record.title || "[EMPTY TITLE]",
        match: true,
        action: "VERIFIED_MATCH"
      });
    } else {
      verificationTable.push({
        id,
        exists: false,
        title: "N/A",
        match: false,
        action: "NOT_FOUND"
      });
    }
  }

  console.log(`Pre-verification completed. Target requested: ${targetIds.length}, Verified found: ${backupData.length}`);

  if (backupData.length === 0) {
    console.error("CRITICAL ERROR: No target documents found in Firestore! Aborting.");
    process.exit(1);
  }

  // Save Backup
  const isoDate = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.resolve(process.cwd(), "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFilePath = path.join(backupDir, `delete-26-videos-${isoDate}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");

  if (!fs.existsSync(backupFilePath) || fs.statSync(backupFilePath).size === 0) {
    console.error("CRITICAL SAFETY RULE: Backup file creation failed or file is empty! Aborting deletion.");
    process.exit(1);
  }

  console.log(`BACKUP CREATED SUCCESSFULLY: ${backupFilePath} (${fs.statSync(backupFilePath).size} bytes, ${backupData.length} records)`);

  console.log("=== STEP 3: PERFORM DELETION ===");
  let deletedCount = 0;
  for (const item of verificationTable) {
    if (item.exists && item.action === "VERIFIED_MATCH") {
      const docRef = doc(db, "posts", item.id);
      await deleteDoc(docRef);
      deletedCount++;
      console.log(`Deleted document (${deletedCount}/${backupData.length}): ${item.id}`);
    }
  }

  console.log(`Deletion complete. Successfully deleted ${deletedCount} documents.`);

  console.log("=== STEP 4: REGENERATE SNAPSHOT / CACHE ===");
  try {
    const res = await fetch("http://localhost:3000/api/admin/snapshot/generate", { method: "POST" });
    const snapResult = await res.json();
    console.log("Snapshot regenerate result:", snapResult);
  } catch (e) {
    console.warn("Snapshot regeneration warning:", e.message);
  }

  console.log("=== STEP 5: POST-DELETE VERIFICATION ===");
  const postCheckSnap = await getDocs(query(collection(db, "posts"), limit(2000)));
  const remainingCount = postCheckSnap.docs.length;
  const postDocIdSet = new Set(postCheckSnap.docs.map(d => d.id));

  let notFoundCount = 0;
  targetIds.forEach(id => {
    if (!postDocIdSet.has(id)) {
      notFoundCount++;
    }
  });

  console.log("=== SUMMARY ===");
  console.log("Deletion requested:", targetIds.length);
  console.log("Backup created: YES");
  console.log("Backup file path:", backupFilePath);
  console.log("Verified before deletion:", backupData.length);
  console.log("Successfully deleted:", deletedCount);
  console.log("Post-check target NOT FOUND count:", notFoundCount);
  console.log("Remaining /posts count:", remainingCount);

  process.exit(0);
}

run().catch(err => {
  console.error("FATAL ERROR during deletion workflow:", err);
  process.exit(1);
});
