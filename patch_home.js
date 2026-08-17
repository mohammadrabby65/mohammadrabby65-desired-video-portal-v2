const fs = require('fs');

let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Add imports
if (!content.includes('AdsterraNativeBanner')) {
  content = content.replace(
    "import { useState, useMemo, useEffect } from 'react';",
    "import { useState, useMemo, useEffect, Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';"
  );

  // Replace mapping
  content = content.replace(
    /videos\.map\(\(video,\s*index\)\s*=>\s*\(\s*<VideoCard key=\{video\.id\} video=\{video\} priority=\{index < 4\} \/>\s*\)\)/g,
    `videos.map((video, index) => (
                  <Fragment key={video.id}>
                    <VideoCard video={video} priority={index < 4} />
                    {(index === 4 || index === 14) && <AdsterraNativeBanner />}
                  </Fragment>
                ))`
  );

  fs.writeFileSync('src/pages/Home.tsx', content);
}
