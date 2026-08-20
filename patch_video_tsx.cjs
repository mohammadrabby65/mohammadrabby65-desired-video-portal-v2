const fs = require('fs');
let code = fs.readFileSync('src/pages/Video.tsx', 'utf8');

code = code.replace(
  /<VideoPlayer\s+videoUrl=\{video\.videoUrl\}\s+thumbnailUrl=\{video\.thumbnailUrl\}\s+\/>/,
  '<VideoPlayer videoId={video.id} videoUrl={video.videoUrl} thumbnailUrl={video.thumbnailUrl} />'
);

fs.writeFileSync('src/pages/Video.tsx', code);
