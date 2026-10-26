const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = process.cwd();
const serverBundlePath = path.resolve(rootDir, "dist/server.cjs");
const appHtmlPath = path.resolve(rootDir, "dist/app.html");

if (!fs.existsSync(serverBundlePath) || !fs.existsSync(appHtmlPath)) {
  console.log(
    "[ensure-build] dist/server.cjs or dist/app.html not found. Running production build..."
  );
  execSync("npm run build", { stdio: "inherit", cwd: rootDir });
}

if (!fs.existsSync(serverBundlePath)) {
  console.error(
    `[ensure-build] FATAL: Expected backend bundle at ${serverBundlePath} is still missing after build.`
  );
  process.exit(1);
}
