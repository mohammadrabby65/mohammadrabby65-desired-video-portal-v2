const fs = require('fs');
let content = fs.readFileSync('src/components/video/RelatedVideos.tsx', 'utf8');

if (!content.includes('AdsterraNativeBanner')) {
  content = content.replace(
    "import React, { memo } from 'react';",
    "import React, { memo, Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../ads/AdsterraNativeBanner';"
  );

  content = content.replace(
    /displayVideos\.map\(\s*video\s*=>\s*<VideoCard key=\{video\.id\} video=\{video\} \/>\)/g,
    `displayVideos.map((video, index) => (
            <Fragment key={video.id}>
              <VideoCard video={video} />
              {(index === 4 || index === 14) && <AdsterraNativeBanner />}
            </Fragment>
          ))`
  );
  fs.writeFileSync('src/components/video/RelatedVideos.tsx', content);
}
