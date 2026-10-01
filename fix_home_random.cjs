const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const oldStr = `{randomVideos.map((video, index) => (
              <Fragment key={\`random-\$\{video.id\}\`}>
                <VideoCard video={video} />
                {(index === 4) && <AdsterraNativeBanner />}
              </Fragment>
            ))}`;

const newStr = `{randomVideos.map((video) => (
              <VideoCard key={\`random-\$\{video.id\}\`} video={video} />
            ))}`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync('src/pages/Home.tsx', content);
} else {
  console.log("Could not find the random string.");
}
