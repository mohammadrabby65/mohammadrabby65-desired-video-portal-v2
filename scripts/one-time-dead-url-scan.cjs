const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

console.log("=== DESIREDHUB ONE-TIME DEAD VIDEO URL SCANNER ===\n");

// Read current data snapshot
const snapshotPath = path.resolve(process.cwd(), "data-snapshot.json");
if (!fs.existsSync(snapshotPath)) {
  console.error("Error: data-snapshot.json not found.");
  process.exit(1);
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const posts = snapshot.posts || [];

console.log(`Loaded ${posts.length} video posts from snapshot.\n`);

async function checkUrl(url) {
  if (!url) return { status: 'inconclusive', statusCode: 0, reason: 'Missing URL' };

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const reqModule = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        method: 'HEAD',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      };

      const req = reqModule.request(url, options, (res) => {
        const code = res.statusCode || 0;
        if (code === 404 || code === 410) {
          resolve({ status: 'dead', statusCode: code });
        } else if (code >= 200 && code < 400) {
          resolve({ status: 'working', statusCode: code });
        } else {
          // 403, 429, 5xx, etc are inconclusive
          resolve({ status: 'inconclusive', statusCode: code, reason: `HTTP ${code}` });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'inconclusive', statusCode: 0, reason: 'Timeout (10s)' });
      });

      req.on('error', (err) => {
        resolve({ status: 'inconclusive', statusCode: 0, reason: err.message || 'Network error' });
      });

      req.end();
    } catch (e) {
      resolve({ status: 'inconclusive', statusCode: 0, reason: e.message });
    }
  });
}

async function runScan() {
  const confirmedDead = [];
  const inconclusive = [];
  const working = [];

  const CONCURRENCY = 5;
  let index = 0;

  async function worker() {
    while (index < posts.length) {
      const i = index++;
      const p = posts[i];
      const res = await checkUrl(p.videoUrl);

      if (res.status === 'dead') {
        confirmedDead.push({
          id: p.id,
          slug: p.slug,
          videoUrl: p.videoUrl,
          statusCode: res.statusCode
        });
        console.log(`[DEAD ${res.statusCode}] ID: ${p.id} | Slug: ${p.slug}`);
      } else if (res.status === 'working') {
        working.push(p.id);
      } else {
        inconclusive.push({
          id: p.id,
          slug: p.slug,
          statusCode: res.statusCode,
          reason: res.reason
        });
      }

      if ((i + 1) % 20 === 0 || i + 1 === posts.length) {
        console.log(`Progress: ${i + 1} / ${posts.length} checked... (Dead: ${confirmedDead.length}, Working: ${working.length}, Inconclusive: ${inconclusive.length})`);
      }
    }
  }

  const workers = [];
  for (let c = 0; c < CONCURRENCY; c++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  console.log("\n==================================================");
  console.log("             DEAD URL SCAN REPORT                 ");
  console.log("==================================================");
  console.log(`Total Videos Checked    : ${posts.length}`);
  console.log(`Working Source URLs     : ${working.length}`);
  console.log(`Inconclusive/Errors     : ${inconclusive.length} (403, 429, 5xx, timeouts, etc.)`);
  console.log(`Confirmed Dead URLs     : ${confirmedDead.length} (HTTP 404/410)`);
  console.log("==================================================\n");

  if (confirmedDead.length > 0) {
    console.log("CONFIRMED DEAD VIDEOS LIST:");
    console.table(confirmedDead);
  } else {
    console.log("No confirmed dead URLs (404/410) were found among existing live video records.");
  }

  // Save report to file for record
  const report = {
    scannedAt: new Date().toISOString(),
    totalChecked: posts.length,
    workingCount: working.length,
    inconclusiveCount: inconclusive.length,
    confirmedDeadCount: confirmedDead.length,
    confirmedDead,
    inconclusive
  };

  fs.writeFileSync(path.resolve(process.cwd(), "dead_url_scan_report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("\nScan report saved to: dead_url_scan_report.json");
}

runScan();
