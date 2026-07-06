const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/xml; charset=UTF-8');
  res.end('<xml/>');
});
const server = app.listen(3015, () => {
  require('http').get('http://localhost:3015/', (r) => {
    console.log(r.headers['content-type']);
    server.close();
    process.exit(0);
  });
});
