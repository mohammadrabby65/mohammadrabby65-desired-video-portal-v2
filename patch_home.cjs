const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Insert import if not exists
if (!content.includes('useLanguage')) {
  content = content.replace(
    'import { Pagination } from "../components/ui/Pagination";',
    'import { Pagination } from "../components/ui/Pagination";\nimport { useLanguage } from "../contexts/LanguageContext";'
  );
}

// Insert hook inside Home component
content = content.replace(
  'export function Home() {',
  'export function Home() {\n  const { t } = useLanguage();'
);

// Replace "Trending Now" text
content = content.replace(
  />\s*Trending Now\s*<\/h2>/g,
  '>{t("Trending Now")}</h2>'
);

// Replace "Newest Videos" text
content = content.replace(
  /"Newest Videos"/g,
  't("Newest Videos")'
);

fs.writeFileSync('src/pages/Home.tsx', content);
console.log('Patched Home.tsx');
