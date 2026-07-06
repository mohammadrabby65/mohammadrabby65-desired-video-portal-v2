const http = require('http');

setTimeout(() => {
  http.get('http://localhost:3000/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('--- HOME ---');
      console.log(data.match(/<link[^>]*rel="canonical"[^>]*>/g) || 'No canonical');
    });
  });

  http.get('http://localhost:3000/video/test-slug', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('--- VIDEO ---');
      console.log(data.match(/<link[^>]*rel="canonical"[^>]*>/g) || 'No canonical');
      
      process.exit(0);
    });
  });
}, 2000);
