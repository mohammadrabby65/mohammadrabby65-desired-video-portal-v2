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
        let titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        let title = titleMatch ? titleMatch[1] : '';
        resolve({ url, title, status: res.statusCode });
      });
    });
  });
}

async function main() {
  for (let i = 0; i < urls.length; i++) {
    const res = await checkUrl(urls[i]);
    console.log(`${res.url} | ${res.title}`);
  }
}
main();
