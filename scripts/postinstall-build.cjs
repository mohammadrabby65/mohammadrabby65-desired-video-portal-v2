const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = process.cwd();
const serverBundlePath = path.resolve(rootDir, "dist/server.cjs");
const appHtmlPath = path.resolve(rootDir, "dist/app.html");

// Always build during Render build phase (or whenever dist artifacts do not exist yet after install)
if (process.env.RENDER || !fs.existsSync(serverBundlePath) || !fs.existsSync(appHtmlPath)) {
  console.log("[postinstall] Building production frontend and backend artifacts...");
  const viteBin = path.resolve(rootDir, "node_modules/vite/bin/vite.js");
  execFileSync(process.execPath, [viteBin, "build"], {
    stdio: "inherit",
    cwd: rootDir,
  });
}
