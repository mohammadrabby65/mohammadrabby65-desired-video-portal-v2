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
      let robotsTag = res.headers['x-robots-tag'] || '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let metaRobots = data.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1];
        resolve({
          url,
          metaRobots,
          robotsTag,
          canonical: data.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
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
    if (res.metaRobots && res.metaRobots.toLowerCase().includes('noindex')) {
      console.log(`NOINDEX in meta: ${res.url}`);
    }
    if (res.robotsTag && res.robotsTag.toLowerCase().includes('noindex')) {
      console.log(`NOINDEX in header: ${res.url}`);
    }
    if (res.canonical && res.canonical !== res.url) {
      console.log(`Canonical mismatch: ${res.url} -> ${res.canonical}`);
    }
  }
  console.log("Done checking URLs");
}

main();
