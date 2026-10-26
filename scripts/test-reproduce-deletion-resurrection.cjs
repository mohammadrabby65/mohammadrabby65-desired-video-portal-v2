const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("=== REGRESSION TEST: REPRODUCE ISSUE (ADMIN DELETION -> SNAPSHOT REFRESH -> PERSISTENT REMOVAL) ===\n");

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

async function run() {
  try {
    // 1. Check current status
    console.log("--- Step 1: Snapshot status check ---");
    const statusRes = await request('http://localhost:3000/api/admin/snapshot/status');
    assert(statusRes.status === 200, "Snapshot status endpoint is accessible");
    const statusBefore = JSON.parse(statusRes.body);
    const countBefore = statusBefore.postsCount;
    console.log(`  Current snapshot post count: ${countBefore}`);

    // 2. Select a video from the current snapshot
    console.log("\n--- Step 2: Select candidate video for Admin deletion test ---");
    const videosRes = await request('http://localhost:3000/api/videos?limitCount=20&page=1');
    const videosData = JSON.parse(videosRes.body);
    assert(videosData.videos && videosData.videos.length > 0, "Videos returned by /api/videos");
    
    // Select an item from the list
    const candidate = videosData.videos[videosData.videos.length - 1];
    const candidateId = candidate.id;
    const candidateSlug = candidate.slug;
    console.log(`  Selected test candidate: ID="${candidateId}", Title="${candidate.title}", Slug="${candidateSlug}"`);

    // Verify it is accessible before deletion
    const checkSlugBefore = await request(`http://localhost:3000/api/video/${candidateSlug}`);
    assert(checkSlugBefore.status === 200, `Video API returns 200 before deletion`);

    // 3. Perform Admin deletion via DELETE /api/admin/posts/:id
    console.log(`\n--- Step 3: Executing DELETE /api/admin/posts/${candidateId} ---`);
    const delRes = await request(`http://localhost:3000/api/admin/posts/${encodeURIComponent(candidateId)}`, {
      method: 'DELETE'
    });
    assert(delRes.status === 200, `DELETE /api/admin/posts/:id returned 200 OK`);
    const delJson = JSON.parse(delRes.body);
    assert(delJson.success === true, `Deletion response success is true`);
    assert(delJson.id === candidateId, `Deletion response confirms deleted ID`);

    // 4. Verify post count decreased immediately
    console.log("\n--- Step 4: Verify immediate memory update ---");
    const statusAfterDel = await request('http://localhost:3000/api/admin/snapshot/status');
    const statusAfterJson = JSON.parse(statusAfterDel.body);
    assert(statusAfterJson.postsCount === countBefore - 1, `Snapshot post count decreased by 1 (${statusAfterJson.postsCount})`);

    // 5. Verify /api/videos and /api/video/:slug exclude candidate
    console.log("\n--- Step 5: Verify excluded from API and returns 404 ---");
    const checkApiAfter = await request('http://localhost:3000/api/videos?limitCount=50&page=1');
    const checkApiJson = JSON.parse(checkApiAfter.body);
    const inApiList = checkApiJson.videos.some(v => v.id === candidateId || v.slug === candidateSlug);
    assert(!inApiList, `Deleted video is absent from /api/videos list`);

    const checkSlugAfter = await request(`http://localhost:3000/api/video/${candidateSlug}`);
    assert(checkSlugAfter.status === 404, `/api/video/${candidateSlug} returns 404 Not Found`);

    const checkPageAfter = await request(`http://localhost:3000/video/${candidateSlug}`);
    assert(checkPageAfter.status === 404, `/video/${candidateSlug} SSR returns 404 Not Found`);

    // 6. Trigger Snapshot Generation (reproducing the old resurrection bug)
    console.log("\n--- Step 6: Trigger snapshot refresh (Testing if resurrection occurs) ---");
    const genRes = await request('http://localhost:3000/api/admin/snapshot/generate', { method: 'POST' });
    assert(genRes.status === 200, `POST /api/admin/snapshot/generate returned 200 OK`);

    // 7. Verify the video does NOT reappear after snapshot refresh
    console.log("\n--- Step 7: Verify deleted video does NOT reappear after refresh ---");
    const checkApiPostGen = await request('http://localhost:3000/api/videos?limitCount=50&page=1');
    const checkApiPostGenJson = JSON.parse(checkApiPostGen.body);
    const inApiPostGen = checkApiPostGenJson.videos.some(v => v.id === candidateId || v.slug === candidateSlug);
    assert(!inApiPostGen, `Deleted video did NOT reappear in /api/videos after refresh`);

    const checkSlugPostGen = await request(`http://localhost:3000/api/video/${candidateSlug}`);
    assert(checkSlugPostGen.status === 404, `/api/video/${candidateSlug} remains 404 after refresh`);

    // 8. Verify disk snapshot files
    console.log("\n--- Step 8: Verify disk snapshots do not contain candidate ---");
    const rootSnap = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data-snapshot.json"), "utf8"));
    const inRootSnap = rootSnap.posts.some(p => p.id === candidateId || p.slug === candidateSlug);
    assert(!inRootSnap, `data-snapshot.json does NOT contain deleted video`);

    const distSnap = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "dist/data-snapshot.json"), "utf8"));
    const inDistSnap = distSnap.posts.some(p => p.id === candidateId || p.slug === candidateSlug);
    assert(!inDistSnap, `dist/data-snapshot.json does NOT contain deleted video`);

    console.log(`\n=== REGRESSION TEST RESULTS: ${passed}/${total} PASSED ===\n`);
    process.exit(passed === total ? 0 : 1);
  } catch (e) {
    console.error("Test error:", e);
    process.exit(1);
  }
}

run();
