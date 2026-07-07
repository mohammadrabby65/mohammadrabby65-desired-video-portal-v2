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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          length: data.length,
          title: data.match(/<title[^>]*>([^<]+)<\/title>/)?.[1]
        });
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  for (let i = 0; i < urls.length; i++) {
    const res = await checkUrl(urls[i]);
    if (res.title && res.title.toLowerCase().includes('404')) {
      console.log(`Soft 404 found: ${res.url}`);
    }
    // Also if title is not DesiredHub, log it
    // console.log(`${res.url} - ${res.title}`);
  }
  console.log("Done checking URLs");
}

main();
