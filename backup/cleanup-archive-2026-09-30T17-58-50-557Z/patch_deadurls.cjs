const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/DeadUrls.tsx', 'utf8');

// Ensure thumbnailUrl is saved
if (!content.includes("thumbnailUrl: video.thumbnailUrl")) {
  content = content.replace(
    /videoUrl: video\.videoUrl,/g,
    "videoUrl: video.videoUrl,\n        thumbnailUrl: video.thumbnailUrl,"
  );
  fs.writeFileSync('src/pages/admin/DeadUrls.tsx', content);
}
