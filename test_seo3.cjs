const http = require('http');

setTimeout(() => {
  http.get('http://localhost:3000/video/test-slug', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('--- VIDEO ---');
      const tags = data.match(/<meta[^>]*>/g) || [];
      tags.forEach(t => console.log(t));
      process.exit(0);
    });
  });
}, 2000);
