const fs = require('fs');
const p = 'src/components/seo/SEO.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  '<meta property="og:type" content="video.other" />',
  '<meta property="og:locale" content="en_US" />\n      <meta property="og:type" content="website" />'
);

c = c.replace(
  '<meta property="og:image" content={ogImage} />',
  '<meta property="og:image" content={ogImage} />\n      <meta property="og:image:width" content="1200" />\n      <meta property="og:image:height" content="630" />'
);

fs.writeFileSync(p, c);
