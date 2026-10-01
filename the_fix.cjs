const fs = require('fs');

const importStr = "import { Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';\n";

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("AdsterraNativeBanner") && !content.includes("import { AdsterraNativeBanner }")) {
    content = importStr + content;
    fs.writeFileSync(file, content);
  }
}

fixFile('src/pages/Category.tsx');
fixFile('src/pages/Search.tsx');
fixFile('src/pages/Tag.tsx');
