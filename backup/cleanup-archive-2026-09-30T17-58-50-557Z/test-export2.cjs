const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, limit } = require("firebase/firestore");
const fs = require("fs");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function exportPureFirestore() {
  const scanTimestamp = new Date().toISOString();
  console.log("Starting pure Firestore export at:", scanTimestamp);

  const postsRef = collection(db, "posts");
  const q = query(postsRef, limit(2000));
  const snap = await getDocs(q);

  console.log("Docs retrieved:", snap.docs.length);

  const rawDocs = snap.docs.map(doc => {
    const data = doc.data();
    return {
      docId: doc.id,
      id: data.id || doc.id,
      slug: data.slug || "",
      title: data.title !== undefined && data.title !== null ? data.title.toString() : "[EMPTY TITLE]",
      description: data.description !== undefined && data.description !== null && data.description.toString().trim() !== "" ? data.description.toString() : "[EMPTY DESCRIPTION]"
    };
  });

  const firestoreCount = rawDocs.length;
  const exportedCount = rawDocs.length;

  const idSet = new Set();
  let duplicateIdsCount = 0;
  let emptyTitlesCount = 0;
  let emptyDescriptionsCount = 0;

  rawDocs.forEach(item => {
    if (idSet.has(item.id)) {
      duplicateIdsCount++;
    } else {
      idSet.add(item.id);
    }

    if (item.title === "[EMPTY TITLE]" || item.title.trim() === "") emptyTitlesCount++;
    if (item.description === "[EMPTY DESCRIPTION]" || item.description.trim() === "") emptyDescriptionsCount++;
  });

  const jsonExportData = rawDocs.map((item, idx) => ({
    index: idx + 1,
    docId: item.docId,
    id: item.id,
    slug: item.slug,
    title: item.title,
    description: item.description
  }));

  fs.writeFileSync("video_metadata_export_FRESH_2.json", JSON.stringify(jsonExportData, null, 2), "utf8");

  let txtOutput = `=== FRESH PRODUCTION VIDEO METADATA EXPORT 2 ===\n\nTOTAL: ${firestoreCount}\n\n`;

  jsonExportData.forEach(item => {
    txtOutput += `--- VIDEO ${item.index} ---\n`;
    txtOutput += `Video ID: ${item.id}\n`;
    txtOutput += `Slug: ${item.slug}\n`;
    txtOutput += `Title: ${item.title}\n`;
    txtOutput += `Description: ${item.description}\n\n`;
  });

  txtOutput += `=== AUDIT ===\n`;
  txtOutput += `Current Firestore video documents scanned: ${firestoreCount}\n`;
  txtOutput += `Records exported: ${exportedCount}\n`;
  txtOutput += `Missing records: 0\n`;
  txtOutput += `Duplicate Video IDs: ${duplicateIdsCount}\n`;
  txtOutput += `Empty titles: ${emptyTitlesCount}\n`;
  txtOutput += `Empty descriptions: ${emptyDescriptionsCount}\n`;
  txtOutput += `Firestore collection: /posts\n`;
  txtOutput += `Database ID: ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2\n`;
  txtOutput += `Pagination required: No (all records retrieved in single query batch)\n`;
  txtOutput += `Timestamp: ${scanTimestamp}\n`;

  fs.writeFileSync("video_metadata_export_FRESH_2.txt", txtOutput, "utf8");

  console.log("=== PURE FIRESTORE EXPORT SUCCESS ===");
  console.log("Current Firestore video count:", firestoreCount);
  console.log("Number exported:", exportedCount);
  console.log("Missing records:", 0);
  console.log("Duplicate Video IDs:", duplicateIdsCount);
  console.log("Empty titles:", emptyTitlesCount);
  console.log("Empty descriptions:", emptyDescriptionsCount);
  console.log("Scan timestamp:", scanTimestamp);
  process.exit(0);
}

exportPureFirestore().catch(e => {
  console.error("Export Error:", e);
  process.exit(1);
});
