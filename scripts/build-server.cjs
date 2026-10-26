const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Ensure dist/app.html exists from dist/index.html (idempotent)
const indexHtmlPath = path.resolve(distDir, "index.html");
const appHtmlPath = path.resolve(distDir, "app.html");
if (fs.existsSync(indexHtmlPath)) {
  fs.copyFileSync(indexHtmlPath, appHtmlPath);
  fs.unlinkSync(indexHtmlPath);
}

// 2. Copy data-snapshot.json to dist/data-snapshot.json
const srcSnapshotPath = path.resolve(rootDir, "data-snapshot.json");
const distSnapshotPath = path.resolve(distDir, "data-snapshot.json");
if (fs.existsSync(srcSnapshotPath)) {
  fs.copyFileSync(srcSnapshotPath, distSnapshotPath);
}

// 3. Bundle server.ts -> dist/server.cjs
const serverEntryPath = path.resolve(rootDir, "server.ts");
const serverOutfilePath = path.resolve(distDir, "server.cjs");

esbuild.buildSync({
  entryPoints: [serverEntryPath],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  sourcemap: true,
  outfile: serverOutfilePath,
  logOverride: {
    "empty-import-meta": "silent",
  },
});

if (!fs.existsSync(serverOutfilePath)) {
  console.error(`ERROR: Failed to generate ${serverOutfilePath}`);
  process.exit(1);
}

const stats = fs.statSync(serverOutfilePath);
console.log(
  `[build-server] Successfully generated ${serverOutfilePath} (${(stats.size / 1024).toFixed(1)} kB)`
);
