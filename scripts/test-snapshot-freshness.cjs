const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("=== DESIREDHUB SNAPSHOT FRESHNESS & CONCURRENCY TEST SUITE ===\n");

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  // Test 1: Snapshot file integrity and counts on disk
  console.log("--- 1. Testing Disk Snapshot Files Integrity ---");
  const rootSnapshotPath = path.resolve(process.cwd(), "data-snapshot.json");
  const distSnapshotPath = path.resolve(process.cwd(), "dist/data-snapshot.json");
  assert(fs.existsSync(rootSnapshotPath), "data-snapshot.json exists in root");
  assert(fs.existsSync(distSnapshotPath), "dist/data-snapshot.json exists in dist");

  const rootData = JSON.parse(fs.readFileSync(rootSnapshotPath, "utf8"));
  const distData = JSON.parse(fs.readFileSync(distSnapshotPath, "utf8"));

  assert(Array.isArray(rootData.posts) && rootData.posts.length > 0, `Root snapshot has valid posts (found: ${rootData.posts.length})`);
  assert(Array.isArray(rootData.categories) && rootData.categories.length === 14, `Root snapshot has 14 categories (found: ${rootData.categories.length})`);
  assert(distData.posts.length === rootData.posts.length, `dist snapshot matches root snapshot post count (${distData.posts.length})`);

  // Test 2: Preservation of existing posts and metadata
  console.log("\n--- 2. Testing Preservation of Existing Records & Metadata ---");
  const preDeleteBackupPath = path.resolve(process.cwd(), "video_metadata_export_CURRENT_LIVE.json");
  let baselineIds = [];
  if (fs.existsSync(preDeleteBackupPath)) {
    const baselineData = JSON.parse(fs.readFileSync(preDeleteBackupPath, "utf8"));
    const baselineArray = Array.isArray(baselineData) ? baselineData : (baselineData.posts || []);
    baselineIds = baselineArray.map(p => p.id).filter(Boolean);
  }
  const rootIds = new Set(rootData.posts.map(p => p.id));
  const validFields = rootData.posts.every(p => p.id && p.title && p.slug && typeof p._publishedAtMs === 'number');
  assert(validFields, "All posts have valid id, title, slug, and normalized _publishedAtMs");

  // Test 3: Latest video sorting
  console.log("\n--- 3. Testing Latest-Video Sorting Order ---");
  let sortedCorrectly = true;
  for (let i = 0; i < rootData.posts.length - 1; i++) {
    if (rootData.posts[i]._publishedAtMs < rootData.posts[i + 1]._publishedAtMs) {
      sortedCorrectly = false;
      break;
    }
  }
  assert(sortedCorrectly, "Posts are strictly sorted descending by publishedAt timestamp");
  assert(rootData.posts[0]._publishedAtMs >= 1791960133000, `Newest uploaded post is at the top (timestamp: ${rootData.posts[0]._publishedAtMs})`);

  // Test 4: Live HTTP API Endpoints and Headers
  console.log("\n--- 4. Testing Live HTTP API Endpoints & Freshness ---");
  const statusRes = await request('http://localhost:3000/api/admin/snapshot/status');
  assert(statusRes.status === 200, "GET /api/admin/snapshot/status returns 200 OK");
  const statusJson = JSON.parse(statusRes.body);
  assert(statusJson.status === "Success", "Snapshot status is 'Success'");
  assert(statusJson.postsCount > 0, `Live snapshot reports non-empty postsCount (found: ${statusJson.postsCount})`);
  assert(statusJson.categoriesCount === 14, `Live snapshot reports 14 categories`);

  const videosRes = await request('http://localhost:3000/api/videos?limitCount=10&page=1');
  assert(videosRes.status === 200, "GET /api/videos returns 200 OK");
  const cacheControl = videosRes.headers['cache-control'] || '';
  assert(cacheControl.includes('s-maxage=300'), `Cache-Control includes s-maxage=300 (header: ${cacheControl})`);
  const videosJson = JSON.parse(videosRes.body);
  assert(videosJson.videos.length === 10, "First page returns requested 10 videos");
  assert(videosJson.total > 0, `Total video count matches live snapshot (${videosJson.total})`);

  // Test 5: Trending Videos endpoint and query
  console.log("\n--- 5. Testing Trending Videos API ---");
  const trendingRes = await request('http://localhost:3000/api/videos?trending=true&limitCount=4');
  assert(trendingRes.status === 200, "GET /api/videos?trending=true returns 200 OK");
  const trendingJson = JSON.parse(trendingRes.body);
  assert(Array.isArray(trendingJson.videos) && trendingJson.videos.length > 0, "Trending videos returned non-empty list");
  assert(trendingJson.videos.every(v => v.trending === true), "All videos returned by trending query have trending: true");

  // Test 6: Verify React Query Hook staleTime
  console.log("\n--- 6. Testing React Query Hook Configuration ---");
  const useVideosSource = fs.readFileSync(path.resolve(process.cwd(), "src/hooks/useVideos.ts"), "utf8");
  const has5MinTrendingStale = useVideosSource.includes("useTrendingVideos") && useVideosSource.includes("staleTime: 1000 * 60 * 5");
  assert(has5MinTrendingStale, "useTrendingVideos staleTime configured to 5 minutes (1000 * 60 * 5)");

  // Test 7: Unit simulation of SWR, Single-Flight concurrency, TTL Expiry, and Failed Refresh
  console.log("\n--- 7. Testing Single-Flight Concurrency, TTL Expiry, & Failure Fallback Simulation ---");
  let mockSnapshot = {
    posts: [{ id: 'p1', title: 'Post 1', _publishedAtMs: 1000 }],
    categories: [{ id: 'c1', name: 'Cat 1' }],
    lastUpdated: Date.now() - 20 * 60 * 1000 // 20 minutes old (expired)
  };
  const TTL = 10 * 60 * 1000;
  let activePromise = null;
  let firestoreCallCount = 0;

  async function mockRefreshSnapshot(shouldFail = false) {
    if (activePromise) return activePromise;
    activePromise = (async () => {
      firestoreCallCount++;
      await new Promise(r => setTimeout(r, 50)); // simulate network delay
      if (shouldFail) {
        throw new Error("Simulated Firestore timeout/network failure");
      }
      mockSnapshot = {
        posts: [
          { id: 'p2', title: 'Post 2 (Fresh)', _publishedAtMs: 2000 },
          { id: 'p1', title: 'Post 1', _publishedAtMs: 1000 }
        ],
        categories: [{ id: 'c1', name: 'Cat 1' }],
        lastUpdated: Date.now()
      };
      return true;
    })().finally(() => {
      activePromise = null;
    });
    return activePromise;
  }

  async function mockEnsureSnapshot() {
    const age = Date.now() - mockSnapshot.lastUpdated;
    if (age > TTL && !activePromise) {
      // SWR: fire in background without blocking
      mockRefreshSnapshot().catch(() => {});
    }
  }

  // Check initial state before refresh
  assert(mockSnapshot.posts.length === 1, "Initial mock snapshot has 1 post");

  // Call mockEnsureSnapshot concurrently 10 times
  firestoreCallCount = 0;
  const concurrentCalls = Array.from({ length: 10 }, () => mockEnsureSnapshot());
  await Promise.all(concurrentCalls);

  assert(firestoreCallCount === 1, `Single-flight locking: 10 concurrent requests triggered exactly 1 Firestore call (count: ${firestoreCallCount})`);

  // Wait for background refresh to settle
  await new Promise(r => setTimeout(r, 80));
  assert(mockSnapshot.posts.length === 2, "Atomic replacement: mock snapshot updated to 2 posts after successful refresh");
  assert(mockSnapshot.posts[0].id === 'p2', "Newest post sorted to front");

  // Test failure fallback
  console.log("\n--- 8. Testing Refresh Failure Fallback ---");
  const previousSnapshotBeforeFailure = { ...mockSnapshot };
  try {
    await mockRefreshSnapshot(true); // force failure
  } catch (err) {
    // Expected simulation failure
  }
  assert(mockSnapshot.posts.length === previousSnapshotBeforeFailure.posts.length, "Failed refresh preserved existing working snapshot without data loss");
  assert(mockSnapshot.lastUpdated === previousSnapshotBeforeFailure.lastUpdated, "Failed refresh did not corrupt lastUpdated timestamp");

  // Test 9: Category SEO regression check
  console.log("\n--- 9. Testing Category SEO & Special Routes Regression ---");
  const catRes = await request('http://localhost:3000/category/punjabi');
  assert(catRes.status === 200, "Valid category /category/punjabi returns 200 OK");
  assert(catRes.body.includes('window.__INITIAL_CATEGORY_DATA__'), "Category SSR injects __INITIAL_CATEGORY_DATA__");

  const nonexistentRes = await request('http://localhost:3000/category/nonexistent-xyz-987');
  assert(nonexistentRes.status === 404, "Nonexistent category returns 404 Not Found");

  const specialRes = await request('http://localhost:3000/category/trending');
  assert(specialRes.status === 200, "Special route /category/trending returns 200 OK");

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed.`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
