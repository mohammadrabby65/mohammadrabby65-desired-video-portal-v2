const fs = require('fs');

function addImports(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("AdsterraNativeBanner")) {
      content = "import { Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';\n" + content;
      fs.writeFileSync(file, content);
  }
}

addImports('src/pages/Category.tsx');
addImports('src/pages/Search.tsx');
addImports('src/pages/Tag.tsx');
