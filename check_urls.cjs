const fs = require('fs');
const https = require('https');

const urls = fs.readFileSync('urls.txt', 'utf8').split('\n').filter(l => l.trim() !== '');

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        contentType: res.headers['content-type'],
        location: res.headers['location']
      });
      res.resume();
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  for (let i = 0; i < urls.length; i++) {
    const res = await checkUrl(urls[i]);
    if (res.status !== 200 || res.location) {
      console.log(`Error or non-200 for URL: ${urls[i]} - Status: ${res.status} Location: ${res.location}`);
    }
  }
  console.log("Done checking URLs");
}

main();
