const http = require('http');

http.get('http://localhost:3000/sitemap.xml', (res) => {
  res.on('data', (chunk) => {
    console.log(chunk.slice(0, 20).toString('hex'));
    console.log(chunk.slice(0, 20).toString('utf-8'));
    process.exit(0);
  });
});
