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
        let metaRobotsMatch = data.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        let metaRobots = metaRobotsMatch ? metaRobotsMatch[1] : '';
        let canonicalMatch = data.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
        let canonical = canonicalMatch ? canonicalMatch[1] : '';
        let titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
        let title = titleMatch ? titleMatch[1] : '';
        
        let hasVideoNotFound = data.includes('Video not found') || data.includes('does not exist or has been removed');
        
        resolve({
          url,
          status: res.statusCode,
          location: res.headers['location'],
          metaRobots,
          robotsTag,
          canonical,
          title,
          hasVideoNotFound
        });
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  console.log("URL | Problem | Evidence");
  console.log("---|---|---");
  
  for (let i = 0; i < urls.length; i++) {
    const res = await checkUrl(urls[i]);
    
    let problems = [];
    
    if (res.error) {
      problems.push(`Network Error: ${res.error}`);
    } else {
      if (res.status !== 200) {
        problems.push(`HTTP Status: ${res.status}`);
      }
      if (res.location) {
        problems.push(`Redirects to: ${res.location}`);
      }
      if (res.canonical && res.canonical !== res.url) {
        problems.push(`Canonical Mismatch: Canonical is ${res.canonical}`);
      }
      if (res.hasVideoNotFound || (res.title && res.title.toLowerCase().includes('404'))) {
        problems.push(`Soft 404 Detected: title='${res.title}', body has 'Video not found'`);
      }
      if (res.metaRobots && res.metaRobots.toLowerCase().includes('noindex')) {
        problems.push(`Meta Robots NOINDEX: ${res.metaRobots}`);
      }
      if (res.robotsTag && res.robotsTag.toLowerCase().includes('noindex')) {
        problems.push(`X-Robots-Tag NOINDEX: ${res.robotsTag}`);
      }
      // if title is exactly DesiredHub that could indicate SSR failure, but it might not be a GSC error, just poor SEO.
      if (!res.title || res.title.trim() === 'DesiredHub') {
        problems.push(`Missing or Default Title: '${res.title}'`);
      }
    }
    
    if (problems.length > 0) {
      console.log(`${res.url} | ${problems.join(', ')} | see details`);
    }
  }
  console.log("Audit complete.");
}

main();
