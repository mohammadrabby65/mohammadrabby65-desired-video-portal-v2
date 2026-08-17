const fs = require('fs');
let content = fs.readFileSync('src/pages/Search.tsx', 'utf8');

if (!content.includes('AdsterraNativeBanner')) {
  content = content.replace(
    "import { useState, useEffect, useMemo, useRef } from 'react';",
    "import { useState, useEffect, useMemo, useRef, Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';"
  );

  content = content.replace(
    /videos\.map\(\s*video\s*=>\s*\(\s*<VideoCard key=\{video\.id\} video=\{video\} \/>\s*\)\)/g,
    `videos.map((video, index) => (
                      <Fragment key={video.id}>
                        <VideoCard video={video} />
                        {(index === 4 || index === 14) && <AdsterraNativeBanner />}
                      </Fragment>
                    ))`
  );
  fs.writeFileSync('src/pages/Search.tsx', content);
}
