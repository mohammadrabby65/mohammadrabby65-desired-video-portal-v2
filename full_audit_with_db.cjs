const fs = require('fs');
const https = require('https');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs, limit } = require("firebase/firestore");

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
const urlBlocks = [...sitemapContent.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]);
let headerMatch = sitemapContent.match(/^[\s\S]*?<urlset[^>]*>/);
let header = headerMatch ? headerMatch[0] : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
let footer = '</urlset>';

async function checkUrlHttp(url) {
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
        resolve({
          status: res.statusCode,
          location: res.headers['location'],
          metaRobots,
          robotsTag,
          canonical,
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function main() {
  const validBlocks = [];
  const invalidReasons = [];
  let totalChecked = 0;
  
  console.log("Total URLs checking...");
  
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/);
    if (!locMatch) continue;
    
    const url = locMatch[1];
    totalChecked++;
    
    let problems = [];
    const res = await checkUrlHttp(url);
    
    if (res.error) problems.push(`Network Error: ${res.error}`);
    else {
      if (res.status !== 200) problems.push(`HTTP Status: ${res.status}`);
      if (res.location) problems.push(`Redirects to: ${res.location}`);
      if (res.canonical && res.canonical !== url) problems.push(`Canonical Mismatch (is ${res.canonical})`);
      if (res.metaRobots && res.metaRobots.toLowerCase().includes('noindex')) problems.push(`Meta Robots NOINDEX`);
      if (res.robotsTag && res.robotsTag.toLowerCase().includes('noindex')) problems.push(`X-Robots-Tag NOINDEX`);
    }
    
    // Soft 404 detection via DB (since SSR doesn't do it)
    if (url.includes('/category/')) {
      const slug = url.split('/category/')[1];
      if (!['trending', 'latest', 'popular'].includes(slug)) {
        const q = query(collection(db, "posts"), where("categories", "array-contains", slug), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
          problems.push(`Soft 404: Empty Category`);
        }
      }
    } else if (url.includes('/video/')) {
      const slug = url.split('/video/')[1];
      const q = query(collection(db, "posts"), where("slug", "==", slug), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        problems.push(`Soft 404: Video not found`);
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
  
  console.log(`\nTotal URLs checked: ${totalChecked}`);
  console.log(`Invalid URLs: ${invalidReasons.length}`);
  console.log(`Reason for each invalid URL:`);
  invalidReasons.forEach(r => {
    console.log(`- ${r.url}: ${r.reasons.join(', ')}`);
  });
  console.log(`New sitemap URL count: ${validBlocks.length}`);
}

main();
