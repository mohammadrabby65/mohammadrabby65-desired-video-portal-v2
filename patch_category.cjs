const fs = require('fs');
let content = fs.readFileSync('src/pages/Category.tsx', 'utf8');

if (!content.includes('AdsterraNativeBanner')) {
  content = content.replace(
    "import { useState, useMemo, useEffect } from 'react';",
    "import { useState, useMemo, useEffect, Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';"
  );

  content = content.replace(
    /videos\.map\(\(video:\s*any,\s*index:\s*number\)\s*=>\s*\(\s*<VideoCard key=\{video\.id\} video=\{video\} priority=\{index < 4\} \/>\s*\)\)/g,
    `videos.map((video: any, index: number) => (
                    <Fragment key={video.id}>
                      <VideoCard video={video} priority={index < 4} />
                      {(index === 4 || index === 14) && <AdsterraNativeBanner />}
                    </Fragment>
                  ))`
  );
  fs.writeFileSync('src/pages/Category.tsx', content);
}
