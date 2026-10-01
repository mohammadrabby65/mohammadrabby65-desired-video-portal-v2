const http = require('http');
http.get('http://127.0.0.1:3000/api/videos', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('DATA:', data));
});
