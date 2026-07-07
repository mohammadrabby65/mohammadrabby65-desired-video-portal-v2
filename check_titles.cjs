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
          title: data.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
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
    if (!res.title || res.title === 'DesiredHub') {
      // If it's the raw index.html title, that might mean the server failed to inject SEO!
      console.log(`Missing SEO title for: ${res.url}`);
    } else {
      // console.log(`${res.url} -> ${res.title}`);
    }
  }
  console.log("Done checking titles");
}

main();
