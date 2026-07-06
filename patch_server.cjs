const fs = require('fs');
const p = 'server.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  '<meta data-rh="true" property="og:type" content="video.other" />',
  '<meta data-rh="true" property="og:locale" content="en_US" />\n        <meta data-rh="true" property="og:type" content="website" />'
);

c = c.replace(
  '<meta data-rh="true" property="og:image" content="${image}" />',
  '<meta data-rh="true" property="og:image" content="${image}" />\n        <meta data-rh="true" property="og:image:width" content="1200" />\n        <meta data-rh="true" property="og:image:height" content="630" />'
);

fs.writeFileSync(p, c);
