const fs = require('fs');
const https = require('https');

const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
const urlBlocks = [...sitemapContent.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]);
let headerMatch = sitemapContent.match(/^[\s\S]*?<urlset[^>]*>/);
let header = headerMatch ? headerMatch[0] : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
let footer = '</urlset>';

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
        
        let hasVideoNotFound = data.includes('Video not found') || data.includes('does not exist or has been removed') || data.includes('No videos found');
        
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
  const validBlocks = [];
  const invalidReasons = [];
  let totalChecked = 0;
  
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/);
    if (!locMatch) continue;
    
    const url = locMatch[1];
    totalChecked++;
    const res = await checkUrl(url);
    
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
        problems.push(`Canonical Mismatch (is ${res.canonical})`);
      }
      if (res.hasVideoNotFound || (res.title && res.title.toLowerCase().includes('404'))) {
        problems.push(`Soft 404 / Video not found`);
      }
      if (res.metaRobots && res.metaRobots.toLowerCase().includes('noindex')) {
        problems.push(`Meta Robots NOINDEX`);
      }
      if (res.robotsTag && res.robotsTag.toLowerCase().includes('noindex')) {
        problems.push(`X-Robots-Tag NOINDEX`);
      }
    }
    
    if (problems.length > 0) {
      invalidReasons.push({ url, reasons: problems });
    } else {
      validBlocks.push(block);
    }
  }
  
  const newSitemap = header + '\n' + validBlocks.join('\n') + '\n' + footer;
  fs.writeFileSync('public/sitemap.xml', newSitemap);
  
  console.log(`Total URLs checked: ${totalChecked}`);
  console.log(`Invalid URLs: ${invalidReasons.length}`);
  console.log(`Reason for each invalid URL:`);
  invalidReasons.forEach(r => {
    console.log(`- ${r.url}: ${r.reasons.join(', ')}`);
  });
  console.log(`New sitemap URL count: ${validBlocks.length}`);
}

main();
