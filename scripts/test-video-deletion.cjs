const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("=== DESIREDHUB VIDEO DELETION & TOMBSTONE REGRESSION TEST SUITE ===\n");

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
  try {
    // 1. Initial snapshot status check
    console.log("--- 1. Checking Snapshot Status before deletion ---");
    const statusRes = await request('http://localhost:3000/api/admin/snapshot/status');
    assert(statusRes.status === 200, "GET /api/admin/snapshot/status returns 200 OK");
    const initialStatus = JSON.parse(statusRes.body);
    const initialPostCount = initialStatus.postsCount;
    console.log(`  Initial post count: ${initialPostCount}`);

    // 2. Fetch list of videos to pick a test target
    console.log("\n--- 2. Fetching videos to select target for deletion test ---");
    const videosRes = await request('http://localhost:3000/api/videos?limitCount=10&page=1');
    assert(videosRes.status === 200, "GET /api/videos returns 200 OK");
    const videosJson = JSON.parse(videosRes.body);
    assert(Array.isArray(videosJson.videos) && videosJson.videos.length > 0, "Videos list is non-empty");

    // Pick the last video in the list to avoid deleting the newest top featured video
    const targetVideo = videosJson.videos[videosJson.videos.length - 1];
    const targetId = targetVideo.id;
    const targetSlug = targetVideo.slug;
    console.log(`  Selected target for deletion test: ID="${targetId}", slug="${targetSlug}"`);

    // 3. Test DELETE /api/admin/posts/:id
    console.log(`\n--- 3. Testing DELETE /api/admin/posts/${targetId} ---`);
    const deleteRes = await request(`http://localhost:3000/api/admin/posts/${encodeURIComponent(targetId)}`, {
      method: 'DELETE'
    });
    assert(deleteRes.status === 200, `DELETE endpoint returned HTTP 200 (received: ${deleteRes.status})`);
    const deleteJson = JSON.parse(deleteRes.body);
    assert(deleteJson.success === true, `Response returned success: true`);
    assert(deleteJson.id === targetId, `Response returned deleted ID: "${targetId}"`);

    // 4. Verify snapshot status updated after deletion
    console.log("\n--- 4. Verifying Snapshot Status & Counts After Deletion ---");
    const newStatusRes = await request('http://localhost:3000/api/admin/snapshot/status');
    const newStatus = JSON.parse(newStatusRes.body);
    console.log(`  Post count after deletion: ${newStatus.postsCount}`);
    assert(newStatus.postsCount === initialPostCount - 1, `Post count decreased by 1 (from ${initialPostCount} to ${newStatus.postsCount})`);

    // 5. Verify deleted video is absent from API endpoints
    console.log("\n--- 5. Verifying API & Page Endpoints Exclude Deleted Video ---");
    const apiVideosAfter = await request('http://localhost:3000/api/videos?limitCount=50&page=1');
    const apiJsonAfter = JSON.parse(apiVideosAfter.body);
    const foundInApi = apiJsonAfter.videos.some(v => v.id === targetId || v.slug === targetSlug);
    assert(!foundInApi, `Deleted video "${targetId}" is excluded from GET /api/videos`);

    const singleVideoApi = await request(`http://localhost:3000/api/video/${targetSlug}`);
    assert(singleVideoApi.status === 404, `GET /api/video/${targetSlug} returns 404 Not Found`);

    const ssrPageRes = await request(`http://localhost:3000/video/${targetSlug}`);
    assert(ssrPageRes.status === 404, `GET /video/${targetSlug} returns SSR 404 page`);
    assert(ssrPageRes.body.includes('404') && ssrPageRes.body.includes('Video Not Found'), `404 HTML content contains "Video Not Found"`);

    // 6. Verify disk snapshot files do not contain deleted video
    console.log("\n--- 6. Verifying Disk Snapshot Files ---");
    const rootSnapshotPath = path.resolve(process.cwd(), "data-snapshot.json");
    if (fs.existsSync(rootSnapshotPath)) {
      const rootData = JSON.parse(fs.readFileSync(rootSnapshotPath, "utf8"));
      const inDisk = rootData.posts.some(p => p.id === targetId || p.slug === targetSlug);
      assert(!inDisk, `data-snapshot.json on disk does not contain deleted video "${targetId}"`);
    }

    // 7. Verify snapshot refresh does NOT resurrect the deleted video
    console.log("\n--- 7. Verifying Snapshot Refresh Resilience ---");
    const refreshRes = await request('http://localhost:3000/api/admin/snapshot/generate', { method: 'POST' });
    assert(refreshRes.status === 200, "POST /api/admin/snapshot/generate returns 200 OK");
    const refreshJson = JSON.parse(refreshRes.body);
    assert(refreshJson.success === true, "Snapshot refresh succeeded");

    const apiVideosPostRefresh = await request('http://localhost:3000/api/videos?limitCount=50&page=1');
    const apiJsonPostRefresh = JSON.parse(apiVideosPostRefresh.body);
    const foundAfterRefresh = apiJsonPostRefresh.videos.some(v => v.id === targetId || v.slug === targetSlug);
    assert(!foundAfterRefresh, `Deleted video "${targetId}" was NOT resurrected by snapshot refresh`);

    console.log(`\n=== TEST RESULTS: ${passed}/${total} PASSED ===\n`);
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
