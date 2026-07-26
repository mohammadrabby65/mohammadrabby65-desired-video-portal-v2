const fs = require('fs');

let fileStr = fs.readFileSync('src/components/video/GlobalRandomVideos.tsx', 'utf-8');

const regex = /if \(randomVideos\.length === 0\) return null;/;
const replacement = `  // Only show on specific pages
  const isTargetPage = /^\\/(?:video\\/.*|category\\/.*|tag\\/.*|search)?$/.test(location.pathname);
  
  if (randomVideos.length === 0 || !isTargetPage) return null;`;

fileStr = fileStr.replace(regex, replacement);

fs.writeFileSync('src/components/video/GlobalRandomVideos.tsx', fileStr);
