const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("=== DESIREDHUB COLD-START RESILIENCE & CATEGORY SEO TEST SUITE ===\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Test Disk Snapshot Existence and Schema
console.log("TEST GROUP 1: Disk Snapshot Compatibility & Bundle Paths");
const pathsToCheck = [
  path.resolve(__dirname, '../data-snapshot.json'),
  path.resolve(__dirname, '../dist/data-snapshot.json')
];

for (const p of pathsToCheck) {
  const exists = fs.existsSync(p);
  assert(exists, `Snapshot file exists at: ${p}`);
  if (exists) {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    assert(Array.isArray(data.posts) && data.posts.length > 0, `Snapshot has valid posts array (${data.posts?.length} posts)`);
    assert(Array.isArray(data.categories) && data.categories.length > 0, `Snapshot has valid categories array (${data.categories?.length} categories)`);
    assert(typeof data.lastUpdated === 'number' || data.lastUpdated === undefined, `Snapshot lastUpdated is valid`);
  }
}

// 2. Test Category Matching Function Logic
console.log("\nTEST GROUP 2: Category Matching Normalization");
function normalizeCat(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function postMatchesCategory(postCats, targetCat, allCategories) {
  if (!Array.isArray(postCats) || !targetCat) return false;
  const targetNorm = normalizeCat(targetCat);
  const targetLower = String(targetCat).trim().toLowerCase();
  
  const matchedDoc = (allCategories || []).find((c) => 
    normalizeCat(c.slug) === targetNorm || normalizeCat(c.name) === targetNorm
  );
  const docSlugNorm = matchedDoc ? normalizeCat(matchedDoc.slug) : null;
  const docNameNorm = matchedDoc ? normalizeCat(matchedDoc.name) : null;
  const docNameLower = matchedDoc ? String(matchedDoc.name).trim().toLowerCase() : null;

  return postCats.some((c) => {
    if (!c) return false;
    const cStr = String(c).trim();
    const cNorm = normalizeCat(cStr);
    const cLower = cStr.toLowerCase();
    if (cNorm === targetNorm || cLower === targetLower) return true;
    if (docSlugNorm && cNorm === docSlugNorm) return true;
    if (docNameNorm && cNorm === docNameNorm) return true;
    if (docNameLower && cLower === docNameLower) return true;
    return false;
  });
}

const mockCategories = [
  { id: '1', name: 'Punjabi', slug: 'punjabi', seoDescription: 'Watch the best Punjabi videos.' },
  { id: '2', name: 'Desi Porn', slug: 'desi-porn', seoDescription: 'Watch hot Desi Porn.' },
  { id: '3', name: 'Empty Category', slug: 'empty-cat', seoDescription: 'Empty test category.' }
];

assert(postMatchesCategory(['Punjabi'], 'punjabi', mockCategories), "Matches capitalized post category with lowercase slug");
assert(postMatchesCategory(['punjabi'], 'Punjabi', mockCategories), "Matches lowercase post category with capitalized query");
assert(postMatchesCategory(['Desi Porn'], 'desi-porn', mockCategories), "Matches doc name in post category with slug query");
assert(postMatchesCategory(['desi-porn'], 'Desi Porn', mockCategories), "Matches doc slug in post category with title query");
assert(!postMatchesCategory(['Tamil'], 'punjabi', mockCategories), "Rejects non-matching category");

// 3. Test HTTP Responses against running dev server
console.log("\nTEST GROUP 3: Live Server HTTP & HTML Responses");

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
  });
}

async function runLiveTests() {
  try {
    // 3a. Valid Category with videos
    const punjabiRes = await fetchUrl('/category/punjabi');
    assert(punjabiRes.statusCode === 200, `Valid category /category/punjabi returned 200 OK (got ${punjabiRes.statusCode})`);
    assert(punjabiRes.body.includes('Punjabi Videos'), `Valid category response contains category heading "Punjabi Videos"`);
    assert(punjabiRes.body.includes('window.__INITIAL_CATEGORY_DATA__'), `Valid category response includes window.__INITIAL_CATEGORY_DATA__`);
    assert(punjabiRes.body.includes('<article class="flex flex-col group">'), `Valid category response contains prerendered article cards`);

    // 3b. Genuinely Nonexistent Category
    const nonExistentRes = await fetchUrl('/category/this-category-definitely-does-not-exist-xyz');
    assert(nonExistentRes.statusCode === 404, `Nonexistent category returned 404 Not Found (got ${nonExistentRes.statusCode})`);
    assert(nonExistentRes.body.includes('Category Not Found'), `404 page contains "Category Not Found" heading`);

    // 3c. Special routes
    const trendingRes = await fetchUrl('/category/trending');
    assert(trendingRes.statusCode === 200, `Special route /category/trending returned 200 OK (got ${trendingRes.statusCode})`);
    assert(trendingRes.body.includes('Trending Videos'), `Trending category heading rendered`);

    const latestRes = await fetchUrl('/category/latest');
    assert(latestRes.statusCode === 200, `Special route /category/latest returned 200 OK (got ${latestRes.statusCode})`);
    assert(latestRes.body.includes('Latest Videos'), `Latest category heading rendered`);

    const popularRes = await fetchUrl('/category/popular');
    assert(popularRes.statusCode === 200, `Special route /category/popular returned 200 OK (got ${popularRes.statusCode})`);
    assert(popularRes.body.includes('Popular Videos'), `Popular category heading rendered`);

    // 3d. API verification
    const apiVideosRes = await fetchUrl('/api/videos?category=punjabi&limitCount=20&page=1');
    assert(apiVideosRes.statusCode === 200, `/api/videos?category=punjabi returned 200 OK`);
    const apiVideosJson = JSON.parse(apiVideosRes.body);
    assert(Array.isArray(apiVideosJson.videos) && apiVideosJson.videos.length > 0, `/api/videos returned videos array (${apiVideosJson.videos?.length} videos)`);

    console.log(`\n=== RESULTS: ${passedTests}/${totalTests} tests passed ===`);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  }
}

runLiveTests();
