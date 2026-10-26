const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = process.cwd();
const serverBundlePath = path.resolve(rootDir, "dist/server.cjs");
const appHtmlPath = path.resolve(rootDir, "dist/app.html");

if (!fs.existsSync(serverBundlePath) || !fs.existsSync(appHtmlPath)) {
  console.log(
    "[ensure-build] dist/server.cjs or dist/app.html not found. Running production build..."
  );
  const viteBin = path.resolve(rootDir, "node_modules/vite/bin/vite.js");
  execFileSync(process.execPath, [viteBin, "build"], {
    stdio: "inherit",
    cwd: rootDir,
  });
}

if (!fs.existsSync(serverBundlePath)) {
  console.error(
    `[ensure-build] FATAL: Expected backend bundle at ${serverBundlePath} is still missing after build.`
  );
  process.exit(1);
}
