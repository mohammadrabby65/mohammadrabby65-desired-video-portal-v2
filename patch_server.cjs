const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add snapshotPromise and ensureSnapshot
const ensureSnapshotCode = `
let snapshotPromise: Promise<void> | null = null;

async function ensureSnapshot() {
  if (publicDataSnapshot.lastUpdated > 0 && publicDataSnapshot.posts.length > 0) return;
  if (!snapshotPromise) {
    snapshotPromise = generateSnapshot().finally(() => {
      snapshotPromise = null;
    });
  }
  await snapshotPromise;
}
`;

code = code.replace('async function generateSnapshot() {', ensureSnapshotCode + '\nasync function generateSnapshot() {');

// Inject await ensureSnapshot() into all API routes
const routesToPatch = [
  'app.get("/api/categories", async (req, res) => {\n    try {\n',
  'app.get("/api/videos", async (req, res) => {\n    try {\n',
  'app.get("/api/videos/related", async (req, res) => {\n    try {\n',
  'app.get("/api/videos/adjacent", async (req, res) => {\n    try {\n',
  'app.get("/api/video/:slug", async (req, res) => {\n    try {\n',
  'app.get("/video/:slug", async (req, res, next) => {\n    try {\n'
];

code = code.replace('app.get("/api/video/:slug", (req, res) => {', 'app.get("/api/video/:slug", async (req, res) => {');

for (const route of routesToPatch) {
  code = code.replace(route, route + '      await ensureSnapshot();\n');
}

// Modify the startup catch block
code = code.replace('} catch (e) {\n  generateSnapshot();\n}', '} catch (e) {\n  ensureSnapshot();\n}');

fs.writeFileSync('server.ts', code);
