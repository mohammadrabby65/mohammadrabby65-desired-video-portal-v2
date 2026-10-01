const fs = require('fs');

const files = [
  'src/pages/Home.tsx',
  'src/pages/Category.tsx',
  'src/pages/Search.tsx',
  'src/pages/Tag.tsx',
  'src/components/video/RelatedVideos.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\(index === 4 \|\| index === 14\)/g, "(index === 4)");
  fs.writeFileSync(file, content);
}
