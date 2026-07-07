const fs = require('fs');
const https = require('https');

const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
const urlBlocks = [...sitemapContent.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]);

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
        let hasNoVideosFound = data.includes('No videos found');
        
        resolve({
          url,
          status: res.statusCode,
          location: res.headers['location'],
          metaRobots,
          robotsTag,
          canonical,
          title,
          hasVideoNotFound,
          hasNoVideosFound
        });
      });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/);
    if (!locMatch) continue;
    const url = locMatch[1];
    
    const res = await checkUrl(url);
    if (res.hasNoVideosFound) {
      console.log(`Soft 404 (No Videos): ${url}`);
    }
    if (res.hasVideoNotFound) {
      console.log(`Soft 404 (Video Not Found): ${url}`);
    }
    if (res.title.includes('404')) {
      console.log(`Soft 404 (Title): ${url}`);
    }
    if (!res.title || res.title === 'DesiredHub') {
      console.log(`Missing Title (SSR failure?): ${url}`);
    }
  }
}

main();
