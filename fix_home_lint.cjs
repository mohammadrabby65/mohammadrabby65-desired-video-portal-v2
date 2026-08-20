const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(/usePaginationVideos\(page, 20, \{ sortBy \}\)/g, 'usePaginationVideos({ sortBy }, 20, page)');

fs.writeFileSync('src/pages/Home.tsx', content);
