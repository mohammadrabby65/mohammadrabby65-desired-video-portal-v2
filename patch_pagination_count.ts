import fs from 'fs';

let content = fs.readFileSync('src/hooks/useVideos.ts', 'utf-8');

content = content.replace(
  /const q = query\(collection\(db, 'posts'\), \.\.\.constraints\);/,
  `const q = query(collection(db, 'posts'), ...constraints, limit(1000));`
);

fs.writeFileSync('src/hooks/useVideos.ts', content);
console.log('Patched usePaginationCount');
