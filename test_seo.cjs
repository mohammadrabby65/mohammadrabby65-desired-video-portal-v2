const http = require('http');
const app = require('./dist/server.cjs').default || require('./dist/server.cjs');
const server = http.createServer(app);
server.listen(3003, async () => {
  try {
    const res = await fetch('http://localhost:3003/video/bengali-young-girl-showing-bathing-pressing-her-boobs');
    const text = await res.text();
    console.log("CONTAINS data-rh? ", text.includes('data-rh="true"'));
    console.log("Count of data-rh: ", (text.match(/data-rh="true"/g) || []).length);
    console.log("CONTAINS SEO? ", text.includes('VideoObject'));
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
});
