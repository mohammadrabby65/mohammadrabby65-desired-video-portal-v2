const http = require('http');

setTimeout(() => {
  http.get('http://localhost:3000/sitemap.xml', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(data);
      process.exit(0);
    });
  });
}, 2000);
