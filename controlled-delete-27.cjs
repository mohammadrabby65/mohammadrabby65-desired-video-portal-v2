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
  "c0yH49yPYNjBQs7LGrdc",
  "os1U3R1ZvyHHrLftVSVK",
  "mRMLteJrvzzfBJshMZdX",
  "4ySfG45fx2bnnnqFusQf",
  "bZ2hXJikjZt6ChqAIkBG",
  "NBBdl0hNcayyOYQ4ocJW",
  "PW2t86TAxliYiwRXbsaH",
  "SA3xWuUou5LQ0nKIx5Hq",
  "RnNPdzqhGFX9jDN8bUkA",
  "TKZl9kZbAdUC992kX8uM",
  "Zzy5EkIHoIN0QiyVa0ZB",
  "qLBqRXOrzAOGE6nXHuci",
  "28DOSbDj0RKjLw9xXs9s",
  "OrtmwwLfEPVYmPmxy5xu",
  "vVRF5FiMotJZ1UwTvNUp",
  "WVx6j1ohwOo4MSBrrdbS",
  "wFw6NfetMAdrVACKcFq2",
  "6wgTbntJcmbKLFMiYmvO",
  "tYzg2OKqOMI6fy1OBiAB",
  "RDn8xSmUZP9RBH9He0pa",
  "pk2PhcSJXjcf5Txh2pNk",
  "GamhkIvh3kgPMNUczyrh",
  "D83XVHLJOVeKKIi0hp5P",
  "zy6rTpXRyZqy218Cegms",
  "gQ97glXckTQbU7qOr6tr",
  "kxxwZq3nVq4vGAJ6r7hW",
  "E8ius6LaQ3hD0Xoc8e8f"
];

async function run() {
  console.log("=== STEP 0: AUTHENTICATE ===");
  await signInWithEmailAndPassword(auth, "script-admin@desired.com", "admin123456");
  console.log("Auth OK. Admin UID:", auth.currentUser.uid);

  console.log("=== STEP 1: FETCH ALL FIRESTORE POSTS & PRE-DELETE AUDIT ===");
  const allPostsSnap = await getDocs(query(collection(db, "posts"), limit(2000)));
  const totalFetched = allPostsSnap.docs.length;
  console.log(`Live Firestore /posts count: ${totalFetched}`);

  const docMap = new Map();
  const allFirestoreRecords = [];
  allPostsSnap.docs.forEach(d => {
    const data = { id: d.id, ...d.data() };
    docMap.set(d.id, data);
    allFirestoreRecords.push(data);
  });

  // Verify target IDs
  console.log("=== STEP 2: VERIFY EXACT 27 TARGETS ===");
  const missingTargets = targetIds.filter(id => !docMap.has(id));
  const foundTargets = targetIds.filter(id => docMap.has(id));

  console.log(`Target requested count: ${targetIds.length}`);
  console.log(`Target found count: ${foundTargets.length}`);
  if (missingTargets.length > 0) {
    console.error("Missing targets in Firestore:", missingTargets);
    console.error("FATAL: Target count is not exactly 27 present. Aborting!");
    process.exit(1);
  }

  // Backup directory
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const backupDir = path.resolve(process.cwd(), "backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Backup all 204 posts from Firestore
  const postsBackupPath = path.join(backupDir, `pre-delete-204-posts-${safeTimestamp}.json`);
  fs.writeFileSync(postsBackupPath, JSON.stringify(allFirestoreRecords, null, 2), "utf8");
  console.log(`Saved Firestore posts backup (${allFirestoreRecords.length} posts) to: ${postsBackupPath}`);

  // 2. Backup data-snapshot.json
  const currentSnapshotPath = path.resolve(process.cwd(), "data-snapshot.json");
  const snapshotBackupPath = path.join(backupDir, `pre-delete-data-snapshot-${safeTimestamp}.json`);
  if (fs.existsSync(currentSnapshotPath)) {
    fs.copyFileSync(currentSnapshotPath, snapshotBackupPath);
    console.log(`Saved data-snapshot.json backup to: ${snapshotBackupPath}`);
  }

  // Validate backups
  if (!fs.existsSync(postsBackupPath) || fs.statSync(postsBackupPath).size === 0) {
    console.error("FATAL: Posts backup file is missing or empty. Aborting!");
    process.exit(1);
  }

  console.log("=== STEP 3: PERFORM CONTROLLED DELETION OF 27 POSTS ===");
  let deletedCount = 0;
  let failedCount = 0;

  for (const id of targetIds) {
    try {
      const docRef = doc(db, "posts", id);
      await deleteDoc(docRef);
      deletedCount++;
      console.log(`Deleted (${deletedCount}/${targetIds.length}): ${id}`);
    } catch (err) {
      failedCount++;
      console.error(`Failed to delete ${id}:`, err.message);
    }
  }

  console.log(`Deletion cycle finished. Deleted: ${deletedCount}, Failed: ${failedCount}`);

  console.log("=== STEP 4: UPDATE DATA-SNAPSHOT.JSON ===");
  let rawSnapshot = { posts: [], categories: [], lastUpdated: Date.now() };
  if (fs.existsSync(currentSnapshotPath)) {
    try {
      rawSnapshot = JSON.parse(fs.readFileSync(currentSnapshotPath, "utf8"));
    } catch (e) {
      console.warn("Could not parse data-snapshot.json, building from remaining posts");
    }
  }

  const targetSet = new Set(targetIds);
  // Keep only posts that are not in targetSet
  const remainingSnapshotPosts = (rawSnapshot.posts || []).filter(p => !targetSet.has(p.id));
  
  // If rawSnapshot had fewer posts or needed syncing with all 177 non-deleted posts from Firestore:
  const nonTargetFirestorePosts = allFirestoreRecords.filter(p => !targetSet.has(p.id));

  // Use the canonical 177 non-deleted posts
  rawSnapshot.posts = nonTargetFirestorePosts;
  rawSnapshot.lastUpdated = Date.now();

  fs.writeFileSync(currentSnapshotPath, JSON.stringify(rawSnapshot, null, 2), "utf8");
  console.log(`Updated data-snapshot.json with ${rawSnapshot.posts.length} posts.`);

  console.log("=== STEP 5: VERIFY FINAL FIRESTORE STATE ===");
  const postCheckSnap = await getDocs(query(collection(db, "posts"), limit(2000)));
  const finalFirestoreCount = postCheckSnap.docs.length;
  const postDocIdSet = new Set(postCheckSnap.docs.map(d => d.id));

  const targetStillPresent = targetIds.filter(id => postDocIdSet.has(id));
  const other177Intact = nonTargetFirestorePosts.every(p => postDocIdSet.has(p.id));

  console.log(`Final Firestore /posts count: ${finalFirestoreCount}`);
  console.log(`Final data-snapshot.json posts count: ${rawSnapshot.posts.length}`);
  console.log(`Target IDs still present in Firestore: ${targetStillPresent.length}`);
  console.log(`All other 177 posts remain intact: ${other177Intact}`);

  // Trigger server in-memory snapshot refresh if dev server is running
  try {
    const res = await fetch("http://localhost:3000/api/admin/snapshot/generate", { method: "POST" });
    const snapResult = await res.json();
    console.log("Server in-memory snapshot update:", snapResult);
  } catch (e) {
    console.log("Server snapshot update note:", e.message);
  }

  console.log("\n=== FINAL OPERATION REPORT ===");
  console.log(`Pre-delete count: ${totalFetched}`);
  console.log(`Backup path: ${postsBackupPath}`);
  console.log(`Target IDs verified: 27/27`);
  console.log(`Successfully deleted count: ${deletedCount}`);
  console.log(`Failed count: ${failedCount}`);
  console.log(`Final Firestore count: ${finalFirestoreCount}`);
  console.log(`Final snapshot count: ${rawSnapshot.posts.length}`);
  console.log(`Unexpected deletions: ${other177Intact && finalFirestoreCount === 177 ? "NO" : "YES"}`);
  console.log(`Confirmation that the other 177 posts remain intact: ${other177Intact ? "CONFIRMED" : "FAILED"}`);

  process.exit(0);
}

run().catch(err => {
  console.error("FATAL ERROR during controlled deletion:", err);
  process.exit(1);
});
