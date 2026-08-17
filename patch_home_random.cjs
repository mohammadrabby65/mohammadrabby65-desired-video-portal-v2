const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

if (!content.includes('randomVideos.map((video, index)')) {
  content = content.replace(
    /randomVideos\.map\(\(video\)\s*=>\s*\(\s*<VideoCard key=\{`random-\$\{video\.id\}`\} video=\{video\} \/>\s*\)\)/g,
    `randomVideos.map((video, index) => (
              <Fragment key={\`random-\$\{video.id\}\`}>
                <VideoCard video={video} />
                {(index === 4) && <AdsterraNativeBanner />}
              </Fragment>
            ))`
  );
  fs.writeFileSync('src/pages/Home.tsx', content);
}
