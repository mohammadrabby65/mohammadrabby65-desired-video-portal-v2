const fs = require('fs');

function addImports(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("AdsterraNativeBanner")) {
      if (content.includes("import { useState, useMemo } from \"react\";")) {
        content = content.replace("import { useState, useMemo } from \"react\";", "import { useState, useMemo, Fragment } from \"react\";\nimport { AdsterraNativeBanner } from \"../components/ads/AdsterraNativeBanner\";");
      } else if (content.includes("import { useParams, useSearchParams } from 'react-router-dom';")) {
          content = content.replace("import { useParams, useSearchParams } from 'react-router-dom';", "import { useParams, useSearchParams } from 'react-router-dom';\nimport { Fragment } from \"react\";\nimport { AdsterraNativeBanner } from \"../components/ads/AdsterraNativeBanner\";");
      } else if (content.includes("import { useState, useEffect, useMemo, useRef } from 'react';")) {
          content = content.replace("import { useState, useEffect, useMemo, useRef } from 'react';", "import { useState, useEffect, useMemo, useRef, Fragment } from 'react';\nimport { AdsterraNativeBanner } from \"../components/ads/AdsterraNativeBanner\";");
      }
      fs.writeFileSync(file, content);
  }
}

addImports('src/pages/Category.tsx');
addImports('src/pages/Search.tsx');
addImports('src/pages/Tag.tsx');
