const fs = require('fs');
let content = fs.readFileSync('src/pages/Tag.tsx', 'utf8');

if (!content.includes('AdsterraNativeBanner')) {
  content = content.replace(
    "import { useParams, useSearchParams } from 'react-router-dom';",
    "import { useParams, useSearchParams } from 'react-router-dom';\nimport { Fragment } from 'react';\nimport { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';"
  );

  content = content.replace(
    /videos\.map\(\s*\(?video\)?\s*=>\s*\(\s*<VideoCard key=\{video\.id\} video=\{video\} \/>\s*\)\)/g,
    `videos.map((video, index) => (
              <Fragment key={video.id}>
                <VideoCard video={video} />
                {(index === 4 || index === 14) && <AdsterraNativeBanner />}
              </Fragment>
            ))`
  );
  fs.writeFileSync('src/pages/Tag.tsx', content);
}
