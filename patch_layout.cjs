const fs = require('fs');

let layoutStr = fs.readFileSync('src/components/layout/Layout.tsx', 'utf-8');

if (!layoutStr.includes('import { GlobalRandomVideos }')) {
  layoutStr = layoutStr.replace('import { AdInjector } from "./AdInjector";', 'import { AdInjector } from "./AdInjector";\nimport { GlobalRandomVideos } from "../video/GlobalRandomVideos";');
}

if (!layoutStr.includes('<GlobalRandomVideos />')) {
  layoutStr = layoutStr.replace('</main>\n      <footer', '</main>\n      <GlobalRandomVideos />\n      <footer');
}

fs.writeFileSync('src/components/layout/Layout.tsx', layoutStr);
