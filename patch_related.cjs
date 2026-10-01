const fs = require('fs');
let code = fs.readFileSync('src/components/video/RelatedVideos.tsx', 'utf8');

code = code.replace(
  /className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-10 min-w-0 w-full"/,
  'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-5 min-w-0 w-full"'
);

fs.writeFileSync('src/components/video/RelatedVideos.tsx', code);
