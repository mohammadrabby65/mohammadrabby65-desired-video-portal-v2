import express from "express";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, deleteDoc, setDoc, getCountFromServer, increment, Timestamp, startAfter, setLogLevel } from "firebase/firestore";
import { SITE_URL } from "./src/config";
import fs from "fs";

setLogLevel("silent");

if (
  process.env.RENDER ||
  (typeof __filename !== "undefined" && __filename.endsWith(".cjs"))
) {
  process.env.NODE_ENV = "production";
}


const SECRET_KEY = process.env.VITE_STREAM_SECRET || "local-dev-secret-key-12345";

import { db } from "./src/lib/firebase";

export const app = express();


let publicDataSnapshot: {
  posts: any[];
  categories: any[];
  lastUpdated: number;
} = {
  posts: [],
  categories: [],
  lastUpdated: 0
};

const deletedPostIds = new Set<string>();

async function loadTombstones(): Promise<Set<string>> {
  try {
    const delSnap = await getDocs(query(collection(db, 'deleted_posts'), limit(1000)));
    for (const d of delSnap.docs) {
      deletedPostIds.add(d.id);
      const data = d.data();
      if (data && data.id) deletedPostIds.add(data.id);
    }
  } catch (err) {
    // If deleted_posts query fails, preserve existing in-memory deletedPostIds
  }
  return deletedPostIds;
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}



function tryLoadDiskSnapshot(): boolean {
  let dir = process.cwd();
  try {
    if (typeof __dirname !== "undefined") {
      dir = __dirname;
    } else if (typeof import.meta !== "undefined" && import.meta.url) {
      dir = path.dirname(new URL(import.meta.url).pathname);
    }
  } catch (e) {}

  const candidatePaths = [
    path.resolve(dir, "data-snapshot.json"),
    path.resolve(dir, "dist/data-snapshot.json"),
    path.resolve(dir, "../dist/data-snapshot.json"),
    path.resolve(process.cwd(), "dist/data-snapshot.json"),
    path.resolve(process.cwd(), "data-snapshot.json"),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Array.isArray(parsed.posts) &&
          parsed.posts.length > 0 &&
          Array.isArray(parsed.categories) &&
          parsed.categories.length > 0
        ) {
          const fileUpdated = parsed.lastUpdated || 0;
          if (fileUpdated > publicDataSnapshot.lastUpdated || publicDataSnapshot.posts.length === 0) {
            const posts = parsed.posts
              .filter((post: any) => post && post.id && !deletedPostIds.has(post.id) && post.isDeleted !== true && post.status !== 'deleted')
              .map((post: any) => {
                if (typeof post._publishedAtMs === 'number' && !isNaN(post._publishedAtMs)) {
                  return post;
                }
                let publishedAtMs = 0;
                if (post.publishedAt) {
                  if (typeof post.publishedAt.toDate === 'function') {
                    publishedAtMs = post.publishedAt.toDate().getTime();
                  } else if (post.publishedAt.seconds) {
                    publishedAtMs = post.publishedAt.seconds * 1000;
                  } else {
                    publishedAtMs = new Date(post.publishedAt).getTime();
                  }
                }
                return { ...post, _publishedAtMs: publishedAtMs || 0 };
              });

            publicDataSnapshot = {
              posts,
              categories: parsed.categories,
              lastUpdated: fileUpdated || Date.now(),
            };
            console.log(`Loaded fallback snapshot from ${p}: ${posts.length} posts, ${parsed.categories.length} categories.`);
            return true;
          }
        }
      }
    } catch (e) {
      // Continue to next candidate path
    }
  }
  return false;
}

// Initial cold-start disk snapshot load
tryLoadDiskSnapshot();

// Configurable snapshot TTL (default: 10 minutes)
const SNAPSHOT_TTL_MS = parseInt(process.env.SNAPSHOT_TTL_MS || "", 10) || 10 * 60 * 1000;

// Concurrency-safe single-flight refresh mechanism
let refreshPromise: Promise<boolean> | null = null;

function saveDiskSnapshotSafely(snapshot: { posts: any[]; categories: any[]; lastUpdated: number }) {
  try {
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const candidatePaths = [
      path.resolve(process.cwd(), "data-snapshot.json"),
      path.resolve(process.cwd(), "dist/data-snapshot.json")
    ];
    for (const p of candidatePaths) {
      try {
        const dir = path.dirname(p);
        if (fs.existsSync(dir)) {
          const tempPath = `${p}.tmp.${Date.now()}`;
          fs.writeFileSync(tempPath, jsonStr, "utf8");
          fs.renameSync(tempPath, p);
        }
      } catch (err: any) {
        // Read-only filesystem in serverless environments (e.g. Vercel EROFS) is expected; memory is authoritative.
      }
    }
  } catch (err) {
    // Non-fatal disk write error
  }
}

async function refreshSnapshot(force = false): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async (): Promise<boolean> => {
    console.log("Generating data snapshot from Firestore...");
    try {
      await loadTombstones();

      const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('name', 'asc'), limit(1000)));
      const categories = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const postSnap = await getDocs(query(collection(db, 'posts'), limit(1000)));
      if (postSnap.empty && categories.length === 0) {
        console.warn("Validation failed: Firestore returned 0 posts and 0 categories. Preserving previous snapshot.");
        return false;
      }

      // Build unified posts preserving existing disk records and merging fresh Firestore records
      const postMap = new Map<string, any>();

      // 1. Seed with existing snapshot posts to preserve all existing records and metadata
      for (const p of publicDataSnapshot.posts) {
        if (p && p.id && !deletedPostIds.has(p.id) && p.isDeleted !== true && p.status !== 'deleted') {
          postMap.set(p.id, p);
        }
      }

      // 2. If in-memory was empty, also seed from disk snapshot
      if (postMap.size === 0) {
        try {
          const diskSnapPath = path.resolve(process.cwd(), "data-snapshot.json");
          if (fs.existsSync(diskSnapPath)) {
            const parsed = JSON.parse(fs.readFileSync(diskSnapPath, "utf8"));
            if (Array.isArray(parsed.posts)) {
              for (const p of parsed.posts) {
                if (p && p.id && !deletedPostIds.has(p.id) && p.isDeleted !== true && p.status !== 'deleted') {
                  postMap.set(p.id, p);
                }
              }
            }
          }
        } catch (_) {}
      }

      // 3. Upsert fresh documents from Firestore
      for (const doc of postSnap.docs) {
        const data = doc.data();
        if (deletedPostIds.has(doc.id) || data.isDeleted === true || data.status === 'deleted') {
          postMap.delete(doc.id);
          continue;
        }

        let publishedAtMs = 0;
        if (data.publishedAt) {
          if (typeof data.publishedAt.toDate === 'function') {
            publishedAtMs = data.publishedAt.toDate().getTime();
          } else if (data.publishedAt.seconds) {
            publishedAtMs = data.publishedAt.seconds * 1000;
          } else {
            publishedAtMs = new Date(data.publishedAt).getTime();
          }
        }
        postMap.set(doc.id, { id: doc.id, ...data, _publishedAtMs: publishedAtMs });
      }

      const posts = Array.from(postMap.values()).filter(p => p && p.id && !deletedPostIds.has(p.id) && p.isDeleted !== true && p.status !== 'deleted');
      posts.sort((a, b) => (b._publishedAtMs || 0) - (a._publishedAtMs || 0));

      if (posts.length === 0) {
        console.warn("Validation failed: 0 combined posts. Preserving previous snapshot.");
        return false;
      }

      // Use fresh categories if returned, otherwise preserve previous categories
      const finalCategories = categories.length > 0 ? categories : publicDataSnapshot.categories;

      // Atomically replace in-memory snapshot
      publicDataSnapshot = {
        posts,
        categories: finalCategories,
        lastUpdated: Date.now()
      };

      console.log(`Snapshot refreshed successfully. Posts: ${posts.length}, Categories: ${finalCategories.length}`);

      // Persist to disk files when writable
      saveDiskSnapshotSafely(publicDataSnapshot);

      return true;
    } catch (err) {
      console.error("Error refreshing snapshot from Firestore, preserving previous snapshot:", err);
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// Alias for backwards compatibility with any internal callers
const generateSnapshot = refreshSnapshot;

async function ensureSnapshot(): Promise<void> {
  const isColdOrEmpty = publicDataSnapshot.posts.length === 0 || publicDataSnapshot.categories.length === 0;

  if (isColdOrEmpty) {
    tryLoadDiskSnapshot();
  }

  // If still completely empty (cold start without disk or disk was empty),
  // we MUST await fresh fetch so the initial request has data.
  if (publicDataSnapshot.posts.length === 0 || publicDataSnapshot.categories.length === 0) {
    try {
      await refreshSnapshot(true);
    } catch (err) {
      console.warn("ensureSnapshot: cold-start refresh failed:", err);
    }
    return;
  }

  // Stale-While-Revalidate:
  // If data exists but age exceeds SNAPSHOT_TTL_MS, trigger non-blocking background refresh
  const age = Date.now() - publicDataSnapshot.lastUpdated;
  if (age > SNAPSHOT_TTL_MS && !refreshPromise) {
    refreshSnapshot().catch(err => {
      console.warn("ensureSnapshot: background SWR refresh failed:", err);
    });
  }
}

// Initial warm-up
ensureSnapshot();

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  
  app.use(express.json());


  app.get("/api/admin/snapshot/status", (req, res) => {
    try {
      const sizeKb = Buffer.byteLength(JSON.stringify(publicDataSnapshot), 'utf8') / 1024;
      res.json({
        status: publicDataSnapshot.lastUpdated > 0 ? "Success" : "Never Generated",
        lastUpdated: publicDataSnapshot.lastUpdated,
        postsCount: publicDataSnapshot.posts.length,
        categoriesCount: publicDataSnapshot.categories.length,
        sizeKb: Math.round(sizeKb)
      });
    } catch (e) {
      res.json({
        status: publicDataSnapshot.lastUpdated > 0 ? "Failed" : "Never Generated",
        lastUpdated: publicDataSnapshot.lastUpdated,
        postsCount: publicDataSnapshot.posts.length,
        categoriesCount: publicDataSnapshot.categories.length,
        sizeKb: 0
      });
    }
  });

  app.post("/api/admin/snapshot/generate", async (req, res) => {
    try {
      const success = await refreshSnapshot(true);
      if (!success && publicDataSnapshot.posts.length === 0) {
        return res.status(500).json({ success: false, error: 'Failed to generate snapshot from Firestore' });
      }
      res.json({
        success: true,
        lastUpdated: publicDataSnapshot.lastUpdated,
        postsCount: publicDataSnapshot.posts.length,
        categoriesCount: publicDataSnapshot.categories.length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to generate snapshot' });
    }
  });

  app.delete("/api/admin/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Missing post ID" });
      }

      console.log(`[Admin Delete API] Request received to delete post "${id}"`);

      // 1. Delete from Firestore posts collection
      try {
        await deleteDoc(doc(db, "posts", id));
      } catch (err: any) {
        console.warn(`Firestore deleteDoc warning for post ${id}:`, err?.message || err);
      }

      // 2. Add tombstone to Firestore deleted_posts collection
      try {
        await setDoc(doc(db, "deleted_posts", id), {
          id,
          deletedAt: Timestamp.now(),
          deletedBy: "admin"
        });
      } catch (err: any) {
        console.warn(`Firestore setDoc tombstone warning for post ${id}:`, err?.message || err);
      }

      // 3. Mark in-memory tombstone set
      deletedPostIds.add(id);

      // 4. Immediately purge from in-memory snapshot
      publicDataSnapshot = {
        ...publicDataSnapshot,
        posts: publicDataSnapshot.posts.filter(p => p && p.id !== id && !deletedPostIds.has(p.id)),
        lastUpdated: Date.now()
      };

      // 5. Trigger snapshot refresh to persist clean snapshot to disk
      await refreshSnapshot(true);

      // 6. Respond with no-cache headers
      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }).json({
        success: true,
        id,
        message: `Post "${id}" deleted successfully.`
      });
    } catch (err: any) {
      console.error("Error deleting post:", err);
      res.status(500).json({ error: err.message || "Failed to delete post" });
    }
  });


  // Basic anti-hotlinking middleware for stream endpoints
  app.use("/api/stream", (req, res, next) => {
    const referer = req.get("referer");
    // Allow local development or requests that don't specify referer (e.g. initial fetch)
    // But since it's an API, we can check for an auth token or signature.
    next();
  });

  // Get a signed playback URL
  app.post("/api/stream/get-url", (req, res) => {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: "Missing videoUrl" });
    }

    // Generate a short-lived token (valid for 2 hours)
    const expires = Date.now() + 2 * 60 * 60 * 1000;
    
    // Create a signature to verify on the proxy endpoint
    const payload = `${videoUrl}:${expires}`;
    const signature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");

    // We obfuscate the video URL by encoding it in base64
    const encodedUrl = encodeURIComponent(Buffer.from(videoUrl).toString('base64'));
    
    const playbackUrl = `/api/stream/play?t=${encodedUrl}&e=${expires}&s=${signature}`;

    res.json({
      success: true,
      data: Buffer.from(JSON.stringify({ url: playbackUrl })).toString('base64')
    });
  });

  app.post("/api/admin/check-url", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let response = await fetch(url, { method: 'HEAD', signal: controller.signal }).catch(() => null);
      if (!response) {
        response = await fetch(url, { method: 'GET', signal: controller.signal }).catch(() => null);
      }
      clearTimeout(timeoutId);
      if (!response) {
         return res.json({ status: 'error', statusCode: 0 });
      }
      const statusCode = response.status;
      let statusStr = 'error';
      if (statusCode >= 200 && statusCode < 300) statusStr = 'working';
      else if (statusCode >= 300 && statusCode < 400) statusStr = 'redirect';
      else if (statusCode === 404 || statusCode === 410) statusStr = 'dead';
      return res.json({ status: statusStr, statusCode });
    } catch (err: any) {
      return res.json({ status: 'error', statusCode: 0, error: err.message });
    }
  });

  // Direct streaming proxy with range request support
  app.get("/api/stream/proxy", async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) return res.status(400).send("Missing url parameter");

    let targetUrl: string;
    try {
      targetUrl = rawUrl.startsWith("http") ? rawUrl : Buffer.from(rawUrl, "base64").toString("utf-8");
      const parsed = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).send("Invalid protocol");
      }
    } catch {
      return res.status(400).send("Invalid URL");
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
      };
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      const response = await fetch(targetUrl, {
        headers,
        redirect: 'follow',
      });

      if (!response.ok && response.status !== 206) {
        return res.status(response.status).send(`Upstream returned ${response.status}`);
      }

      res.status(response.status);
      const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
      for (const h of headersToForward) {
        const val = response.headers.get(h);
        if (val) res.setHeader(h, val);
      }
      res.setHeader("Cache-Control", "public, max-age=3600");

      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (res.writableEnded || res.closed) break;
              res.write(value);
            }
          } catch (streamErr) {
            // Client disconnect or stream ended
          } finally {
            res.end();
          }
        };
        pump();
      } else {
        res.end();
      }
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(502).send(`Proxy streaming error: ${err.message}`);
      }
    }
  });

  // Proxy the video playback
  app.get("/api/stream/play", async (req, res) => {
    const { t, e, s } = req.query;
    
    if (!t || !e || !s) {
      return res.status(403).send("Forbidden");
    }

    const expires = parseInt(e as string, 10);
    if (Date.now() > expires) {
      return res.status(403).send("URL expired");
    }

    // Decode URL
    let videoUrl = "";
    try {
      videoUrl = Buffer.from(t as string, 'base64').toString('utf-8');
    } catch (err) {
      return res.status(400).send("Invalid token");
    }

    const payload = `${videoUrl}:${expires}`;
    const expectedSignature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");

    if (s !== expectedSignature) {
      return res.status(403).send("Invalid signature");
    }

    try {
      res.redirect(302, videoUrl);
    } catch (error) {
      console.error("Redirect error:", error);
      res.status(500).send("Server error");
    }
  });

  // Dynamic Robots.txt
  // Dynamic sitemap.xml and sitemap-main.xml Route
  app.get("/robots.txt", (req, res) => {
    const host = req.headers.host || 'www.desiredhub.xyz';
    const DYNAMIC_SITE_URL = host.startsWith('www.') ? `https://${host}` : `https://www.${host}`;
    
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${DYNAMIC_SITE_URL}/sitemap-main.xml`;
    res.header("Content-Type", "text/plain");
    return res.status(200).send(robotsTxt);
  });

  app.get(["/sitemap.xml", "/sitemap-main.xml"], async (req, res) => {
    try {
      const host = req.headers.host || 'www.desiredhub.xyz';
      const DYNAMIC_SITE_URL = host.startsWith('www.') ? `https://${host}` : `https://www.${host}`;

      const [categoriesSnapshot, postsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'categories'), limit(1000))),
        getDocs(query(collection(db, 'posts'), limit(1000)))
      ]);

      const categories = categoriesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const posts = postsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Home Page
      xml += `  <url>\n    <loc>${DYNAMIC_SITE_URL}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
      
      // Add default virtual categories
      const defaultCats = ["trending", "latest", "popular"];
      for (const cat of defaultCats) {
        xml += `  <url>\n    <loc>${escapeXml(`${DYNAMIC_SITE_URL}/category/${cat}`)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
      
      // Categories from snapshot
      const activeCategories = categories.filter((c: any) => c.isActive !== false && c.slug);
      for (const cat of activeCategories) {
        if (!defaultCats.includes(cat.slug)) {
          xml += `  <url>\n    <loc>${escapeXml(`${DYNAMIC_SITE_URL}/category/${cat.slug}`)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        }
      }
      
      // Posts/Videos from snapshot
      const activePosts = posts.filter((p: any) => p.isActive !== false && p.slug && !deletedPostIds.has(p.id) && p.isDeleted !== true && p.status !== 'deleted');
      for (const post of activePosts) {
        xml += `  <url>\n    <loc>${escapeXml(`${DYNAMIC_SITE_URL}/video/${post.slug}`)}</loc>\n`;
        let lastmod = "";
        if (post.publishedAt) {
          let dateObj;
          if (typeof post.publishedAt.toDate === "function") {
            dateObj = post.publishedAt.toDate();
          } else if (post.publishedAt.seconds) {
            dateObj = new Date(post.publishedAt.seconds * 1000);
          } else {
            dateObj = new Date(post.publishedAt);
          }
          if (dateObj && !isNaN(dateObj.getTime())) {
            if (dateObj > new Date()) dateObj = new Date();
            lastmod = dateObj.toISOString();
          }
        }
        if (lastmod) {
          xml += `    <lastmod>${lastmod}</lastmod>\n`;
        }
        xml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      }
      xml += `</urlset>\n`;
      
      res.header("Content-Type", "application/xml");
      return res.status(200).send(xml);
    } catch (err: any) {
      console.error("Sitemap Error:", err);
      res.status(500).send("Error rendering sitemap: " + err.message);
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      if (publicDataSnapshot.categories.length === 0) {
        const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('name', 'asc'), limit(100)));
        const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).set({
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
        }).json(cats.filter((c: any) => c.isActive !== false));
      }

      await ensureSnapshot();
      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
      }).json(publicDataSnapshot.categories.filter((c: any) => c.isActive !== false));
    } catch (e) {
      console.error("Categories fetch error:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos", async (req, res) => {
    try {
      const { category, tag, q: searchQuery, sortBy, limitCount = "20", lastId, trending } = req.query;
      const limitNum = Math.min(parseInt(limitCount as string, 10) || 20, 100);

      const isTrendingQuery = trending === 'true' || (typeof category === 'string' && category.toLowerCase() === 'trending');

      if (publicDataSnapshot.posts.length === 0 && !searchQuery && !lastId) {
        let q = collection(db, 'posts');
        let constraints = [];
        if (isTrendingQuery) {
          constraints.push(where('trending', '==', true));
        } else if (category && category !== 'All' && !['latest', 'popular'].includes((category as string).toLowerCase())) {
          constraints.push(where('categories', 'array-contains', category as string));
        }
        if (tag) constraints.push(where('tags', 'array-contains', tag as string));
        constraints.push(orderBy('publishedAt', 'desc'));
        constraints.push(limit(limitNum + 1));
        
        try {
          const snap = await getDocs(query(q, ...constraints));
          const posts = snap.docs.map(doc => {
            const data = doc.data();
            let publishedAtMs = 0;
            if (data.publishedAt) {
              if (typeof data.publishedAt.toDate === 'function') {
                publishedAtMs = data.publishedAt.toDate().getTime();
              } else if (data.publishedAt.seconds) {
                publishedAtMs = data.publishedAt.seconds * 1000;
              } else {
                publishedAtMs = new Date(data.publishedAt).getTime();
              }
            }
            return { id: doc.id, ...data, _publishedAtMs: publishedAtMs };
          });
          
          const hasMore = posts.length > limitNum;
          const slice = posts.slice(0, limitNum);
          
          return res.json({
            videos: slice,
            total: slice.length + (hasMore ? 1 : 0),
            page: 1,
            totalPages: hasMore ? 2 : 1
          });
        } catch (fbErr) {
          console.error("Fallback query failed, waiting for snapshot:", fbErr);
        }
      }

      await ensureSnapshot();

      let filtered = publicDataSnapshot.posts;
      if (searchQuery) {
        const queryStr = (searchQuery as string).trim().toLowerCase();
        if (queryStr) {
           const keywords = queryStr.split(/\s+/);
           filtered = filtered.filter(v => {
             return keywords.every(kw => {
               const titleMatch = (v.title || '').toLowerCase().includes(kw);
               const descMatch = (v.description || '').toLowerCase().includes(kw);
               const tagMatch = (v.tags || []).some((t: string) => t.toLowerCase().includes(kw));
               const catMatch = (v.categories || []).some((c: string) => c.toLowerCase().includes(kw));
               return titleMatch || descMatch || tagMatch || catMatch;
             });
           });
        }
      } else if (isTrendingQuery) {
         filtered = filtered.filter(v => v.trending === true);
      } else if (category && (category as string).toLowerCase() === 'latest') {
         filtered = [...filtered].sort((a, b) => b._publishedAtMs - a._publishedAtMs);
      } else if (category && (category as string).toLowerCase() === 'popular') {
         filtered = [...filtered].sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (category && category !== 'All') {
         filtered = filtered.filter(v => postMatchesCategory(v.categories, category as string, publicDataSnapshot.categories));
      } else if (tag) {
         filtered = filtered.filter(v => v.tags && v.tags.includes(tag));
      }

      if (sortBy === 'random') {
         // Create a simple seeded RNG for pagination stability
         let seed = 1;
         if (req.query.seed) {
             const parsed = parseInt(req.query.seed as string, 10);
             if (!isNaN(parsed)) seed = parsed;
             else seed = (req.query.seed as string).split('').reduce((a,b)=>(((a<<5)-a)+b.charCodeAt(0))|0,0);
         } else {
             seed = Math.floor(Date.now() / (1000 * 60 * 5)); // fallback to 5 min window
         }
         const random = () => {
             const x = Math.sin(seed++) * 10000;
             return x - Math.floor(x);
         };
         filtered = [...filtered].sort(() => random() - 0.5);
      } else if (sortBy === 'featured') {
         filtered = [...filtered].sort((a, b) => {
            if (a.featured === b.featured) return b._publishedAtMs - a._publishedAtMs;
            return a.featured ? -1 : 1;
         });
      } else if (sortBy === 'views') {
         filtered = [...filtered].sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (sortBy === 'duration') {
         filtered = [...filtered].sort((a, b) => {
            const getSecs = (d: string) => {
               if (!d) return 0;
               const parts = d.split(':').map(Number);
               if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
               if (parts.length === 2) return parts[0]*60 + parts[1];
               return 0;
            };
            return getSecs(b.duration) - getSecs(a.duration);
         });
      } else {
         filtered = [...filtered].sort((a, b) => b._publishedAtMs - a._publishedAtMs);
      }

      let page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) page = 1;
      
      let startIndex = (page - 1) * limitNum;
      
      // Fallback for legacy lastId support if needed
      if (lastId && !req.query.page) {
        const lastIdx = filtered.findIndex(v => v.id === lastId);
        if (lastIdx !== -1) {
          startIndex = lastIdx + 1;
        }
      }
      
      const end = startIndex + limitNum;
      const paginatedDocs = filtered.slice(startIndex, end);

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
      }).json({
        videos: paginatedDocs,
        total: filtered.length,
        page: page,
        totalPages: Math.ceil(filtered.length / limitNum)
      });
    } catch (err) {
      console.error("API /videos error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos/related", async (req, res) => {
    try {
      await ensureSnapshot();
      const { videoId, categories: categoriesStr, tags: tagsStr, limitCount = "4", lastId } = req.query;
      
      const limitNum = Math.min(parseInt(limitCount as string, 10) || 4, 20);

      if (!videoId) {
        return res.status(400).json({ error: "videoId is required" });
      }

      const categories = categoriesStr ? (categoriesStr as string).split(',').filter(Boolean) : [];
      const tags = tagsStr ? (tagsStr as string).split(',').filter(Boolean) : [];

      const currentVideo = publicDataSnapshot.posts.find((v: any) => v.id === videoId);
      const titleKeywords = currentVideo?.title 
        ? currentVideo.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
        : [];

      let scoredVideos = publicDataSnapshot.posts
        .filter((v: any) => v.id !== videoId)
        .map((v: any) => {
          let score = 0;
          
          if (v.categories && categories.length > 0) {
            const hasCommonCategory = v.categories.some((c: string) => categories.includes(c));
            if (hasCommonCategory) score += 5;
          } else if (v.category && categories.includes(v.category)) {
            score += 5;
          }

          if (v.tags && tags.length > 0) {
            v.tags.forEach((t: string) => {
              if (tags.includes(t)) score += 3;
            });
          }

          if (v.title && titleKeywords.length > 0) {
            const vTitle = v.title.toLowerCase();
            titleKeywords.forEach((kw: string) => {
              if (vTitle.includes(kw)) score += 2;
            });
          }

          const publishedAtMs = v._publishedAtMs || (v.publishedAt?.seconds ? v.publishedAt.seconds * 1000 : 0);
          const ageDays = (Date.now() - publishedAtMs) / (1000 * 60 * 60 * 24);
          if (ageDays >= 0 && ageDays < 30) score += 1; // +1 for recent videos

          return { video: v, score };
        });

      scoredVideos.sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score;
        const aPub = a.video._publishedAtMs || (a.video.publishedAt?.seconds || 0) * 1000;
        const bPub = b.video._publishedAtMs || (b.video.publishedAt?.seconds || 0) * 1000;
        return bPub - aPub;
      });

      const filtered = scoredVideos.map((s: any) => s.video);

      let startIndex = 0;
      if (lastId) {
        const lastIdx = filtered.findIndex((v: any) => v.id === lastId);
        if (lastIdx !== -1) {
          startIndex = lastIdx + 1;
        }
      }

      const paginatedDocs = filtered.slice(startIndex, startIndex + limitNum);

      let nextCursor: string | null = null;
      if (startIndex + limitNum < filtered.length) {
        nextCursor = paginatedDocs[paginatedDocs.length - 1]?.id || null;
      }

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
      }).json({ videos: paginatedDocs, nextCursor });
    } catch (err) {
      console.error("API /videos/related error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos/random-slug", async (req, res) => {
    try {
      await ensureSnapshot();
      const posts = publicDataSnapshot.posts;
      if (posts.length === 0) {
        return res.status(404).json({ error: "No videos found" });
      }
      const randomVideo = posts[Math.floor(Math.random() * posts.length)];
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }).json({ slug: randomVideo.slug });
    } catch (err) {
      console.error("API /videos/random-slug error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos/adjacent", async (req, res) => {
    try {
      await ensureSnapshot();
      const { currentSlug, seconds: secondsStr, nanoseconds: nanosecondsStr } = req.query;

      if (!currentSlug) {
        return res.status(400).json({ error: "currentSlug is required" });
      }

      const seconds = parseInt(secondsStr as string, 10);
      const nanoseconds = parseInt(nanosecondsStr as string, 10);

      let pubAtMs: number | null = null;
      if (isNaN(seconds) || isNaN(nanoseconds)) {
        const video = publicDataSnapshot.posts.find(v => v.slug === currentSlug);
        if (!video) {
          return res.status(404).json({ prev: null, next: null });
        }
        pubAtMs = video._publishedAtMs;
      } else {
        pubAtMs = (seconds * 1000) + Math.floor(nanoseconds / 1000000);
      }

      if (!pubAtMs) {
        return res.status(404).json({ prev: null, next: null });
      }

      let prev = null;
      let next = null;

      const older = publicDataSnapshot.posts.filter(v => v._publishedAtMs < pubAtMs!);
      if (older.length > 0) prev = older[0];
      
      const newer = publicDataSnapshot.posts.filter(v => v._publishedAtMs > pubAtMs!);
      if (newer.length > 0) next = newer[newer.length - 1];

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
      }).json({ prev, next });
    } catch (err) {
      console.error("API /videos/adjacent error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  function escapeHtml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  function formatIsoDuration(duration: string) {
    if (!duration) return "";
    const parts = duration.split(':');
    if (parts.length === 2) {
      return `PT${parts[0]}M${parts[1]}S`;
    } else if (parts.length === 3) {
      return `PT${parts[0]}H${parts[1]}M${parts[2]}S`;
    }
    return duration;
  }


  app.get("/api/video/:slug", async (req, res) => {
    try {
      await ensureSnapshot();
      const slug = req.params.slug;
      const video = publicDataSnapshot.posts.find(v => v.slug === slug);
      if (!video) {
        return res.status(404).json({ error: "Not found" });
      }
      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600'
      }).json(video);
    } catch (e) {
      res.status(500).json({ error: "Internal error" });
    }
  });

  function normalizeCat(s: any): string {
    return String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
  }

  function postMatchesCategory(postCats: any[], targetCat: string, allCategories: any[]): boolean {
    if (!Array.isArray(postCats) || !targetCat) return false;
    const targetNorm = normalizeCat(targetCat);
    const targetLower = String(targetCat).trim().toLowerCase();
    
    const matchedDoc = (allCategories || []).find((c: any) => 
      normalizeCat(c.slug) === targetNorm || normalizeCat(c.name) === targetNorm
    );
    const docSlugNorm = matchedDoc ? normalizeCat(matchedDoc.slug) : null;
    const docNameNorm = matchedDoc ? normalizeCat(matchedDoc.name) : null;
    const docNameLower = matchedDoc ? String(matchedDoc.name).trim().toLowerCase() : null;

    return postCats.some((c: any) => {
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

  function safeJsonForScript(obj: any): string {
    return JSON.stringify(obj)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  function render404(res: any, pageTitle = "404 - Page Not Found | DesiredHub", heading = "Page Not Found", message = "The page you are looking for does not exist, has been removed, or the link is broken.") {
    res.status(404).set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="robots" content="noindex, follow" />
    <style>
      :root {
        --bg-color: #0a0a0a;
        --text-primary: #ffffff;
        --text-secondary: #a3a3a3;
        --accent: #ef4444;
        --accent-hover: #dc2626;
        --card-bg: #171717;
        --border: #262626;
      }
      body {
        margin: 0;
        padding: 0;
        background-color: var(--bg-color);
        color: var(--text-primary);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        text-align: center;
      }
      .container {
        max-width: 480px;
        padding: 40px 24px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        animation: fadeIn 0.6s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .logo {
        font-size: 24px;
        font-weight: 700;
        color: var(--accent);
        text-decoration: none;
        letter-spacing: -0.05em;
        display: inline-block;
        margin-bottom: 24px;
      }
      h1 {
        font-size: 72px;
        font-weight: 800;
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
        line-height: 1;
        color: var(--accent);
      }
      h2 {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 16px 0;
        color: var(--text-primary);
      }
      p {
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-secondary);
        margin: 0 0 32px 0;
      }
      .btn {
        display: inline-block;
        background-color: var(--accent);
        color: #ffffff;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        transition: background-color 0.15s ease, transform 0.1s ease;
      }
      .btn:hover {
        background-color: var(--accent-hover);
      }
      .btn:active {
        transform: scale(0.98);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <a href="/" class="logo">DesiredHub</a>
      <h1>404</h1>
      <h2>${escapeHtml(heading)}</h2>
      <p>${escapeHtml(message)}</p>
      <a href="/" class="btn">Back to Home</a>
    </div>
  </body>
</html>`);
  }

  function formatSeo(titleInput: string, descInput: string, currentUrl: string) {
    let title = titleInput.trim();
    if (title.length > 69) {
      if (title.includes(" - DesiredHub")) {
        const prefix = title.replace(" - DesiredHub", "");
        const maxPrefixLen = 69 - " - DesiredHub".length;
        title = prefix.substring(0, maxPrefixLen).trim() + " - DesiredHub";
      } else {
        title = title.substring(0, 69).trim();
      }
    }

    let desc = descInput.replace(/\s+/g, " ").trim();
    if (desc.length < 120) {
      desc += " Discover more exciting Indian sex videos and enjoy high quality streaming on DesiredHub.";
      if (desc.length > 160) {
        desc = desc.substring(0, 157).trim() + "...";
      }
    }
    if (desc.length > 160) {
      let cutoff = desc.substring(0, 153).lastIndexOf(" ");
      if (cutoff === -1) cutoff = 152;
      desc = desc.substring(0, cutoff).trim() + "...";
    }

    return {
      title: escapeHtml(title),
      description: escapeHtml(desc),
      canonical: escapeHtml(currentUrl)
    };
  }

  async function renderSeoPage(req: any, res: any, next: any, rawTitle: string, rawDesc: string, canonicalUrl: string, extraTags: string = "", extraHtmlReplace?: (html: string) => string) {
    try {
      let template = "";
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        const appHtmlPath = path.resolve(process.cwd(), "dist/app.html");
        const indexHtmlPath = path.resolve(process.cwd(), "dist/index.html");
        if (fs.existsSync(appHtmlPath)) {
          template = fs.readFileSync(appHtmlPath, "utf-8");
        } else {
          template = fs.readFileSync(indexHtmlPath, "utf-8");
        }
      }

      const seo = formatSeo(rawTitle, rawDesc, canonicalUrl);

      const seoTags = `
        <title data-rh="true">${seo.title}</title>
        <meta data-rh="true" name="description" content="${seo.description}" />
        <link data-rh="true" rel="canonical" href="${seo.canonical}" />
        <meta data-rh="true" property="og:site_name" content="DesiredHub" />
        <meta data-rh="true" property="og:locale" content="en_US" />
        <meta data-rh="true" property="og:type" content="website" />
        <meta data-rh="true" property="og:url" content="${seo.canonical}" />
        <meta data-rh="true" property="og:title" content="${seo.title}" />
        <meta data-rh="true" property="og:description" content="${seo.description}" />
        <meta data-rh="true" name="twitter:card" content="summary_large_image" />
        <meta data-rh="true" name="twitter:url" content="${seo.canonical}" />
        <meta data-rh="true" name="twitter:title" content="${seo.title}" />
        <meta data-rh="true" name="twitter:description" content="${seo.description}" />
        ${extraTags}
      `;

      let html = template;
      if (html.includes("<title>DesiredHub</title>")) {
        html = html.replace("<title>DesiredHub</title>", seoTags);
      } else if (html.includes("<title>")) {
        html = html.replace(/<title>[\s\S]*?<\/title>/, seoTags);
      } else {
        html = html.replace("</head>", `${seoTags}\n</head>`);
      }

      if (extraHtmlReplace) {
        html = extraHtmlReplace(html);
      }

      res.status(200).set({
        'Content-Type': 'text/html',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60'
      }).end(html);
    } catch (e) {
      console.error("SEO Injection Error:", e);
      next();
    }
  }

  

  app.post("/api/video/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      
      const videoIndex = publicDataSnapshot.posts.findIndex(v => v.id === id);
      if (videoIndex === -1) {
        return res.status(404).json({ error: "Not found" });
      }
      
      const video = publicDataSnapshot.posts[videoIndex];
      const currentViews = video.views || 0;
      
      publicDataSnapshot.posts[videoIndex].views = currentViews + 1;
      
      let p = 1.0;
      let inc = 1;
      
      if (currentViews > 10000) {
        p = 0.01;
        inc = 100;
      } else if (currentViews > 1000) {
        p = 0.02;
        inc = 50;
      } else if (currentViews > 100) {
        p = 0.1;
        inc = 10;
      }
      
      if (Math.random() < p) {
        const docRef = doc(db, 'posts', id);
        await updateDoc(docRef, { views: increment(inc) });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("View API Error", err);
      res.status(500).json({ success: false });
    }
  });

  app.get("/", (req, res, next) => {
    renderSeoPage(req, res, next, "DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online", "Watch free desi porn and hot Indian sex videos online at DesiredHub. Enjoy horny bhabhis, gorgeous desi girls, and raw adult entertainment in high quality.", `${SITE_URL}/`);
  });

  app.get("/categories", (req, res, next) => {
    renderSeoPage(req, res, next, "All Categories - DesiredHub", "Browse all video categories on DesiredHub. Find your favorite desi porn, horny bhabhis, Indian sex videos, and adult content streamed in high quality.", `${SITE_URL}/categories`);
  });

  app.get("/dmca", (req, res, next) => {
    renderSeoPage(req, res, next, "DMCA / Copyright Policy | DesiredHub", "Learn how to submit DMCA copyright infringement notices, counter-notifications, and content-related copyright requests to DesiredHub.", `${SITE_URL}/dmca`);
  });

  app.get("/2257", (req, res, next) => {
    renderSeoPage(req, res, next, "18 U.S.C. § 2257 Compliance - DesiredHub", "View the 18 U.S.C. 2257 record-keeping compliance declaration for DesiredHub confirming all models depicted are of legal age.", `${SITE_URL}/2257`);
  });

  app.get("/privacy-policy", (req, res, next) => {
    renderSeoPage(req, res, next, "Privacy Policy - DesiredHub", "Read the privacy policy for DesiredHub to understand how we collect, use, and protect your personal information while browsing adult content.", `${SITE_URL}/privacy-policy`);
  });

  app.get("/tag/:slug", (req, res, next) => {
    const slug = req.params.slug;
    const tagTitle = slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    renderSeoPage(req, res, next, `${tagTitle} Videos - DesiredHub`, `Explore free desi porn and hot Indian sex videos tagged with ${tagTitle} on DesiredHub. Enjoy high quality streaming adult entertainment.`, `${SITE_URL}/tag/${slug}`);
  });

  app.get("/search", (req, res, next) => {
    const queryText = (req.query.q as string) || '';
    const title = queryText ? `Search results for "${queryText}" - DesiredHub` : "Search - DesiredHub";
    const description = queryText ? `Browse search results for ${queryText} on DesiredHub. Watch free desi porn and hot Indian sex videos with high quality streaming.` : "Browse search results on DesiredHub. Watch free desi porn and hot Indian sex videos with high quality streaming.";
    renderSeoPage(req, res, next, title, description, `${SITE_URL}/search${queryText ? `?q=${encodeURIComponent(queryText)}` : ""}`, `<meta data-rh="true" name="robots" content="noindex,follow" />`);
  });

  app.get("/category/:slug", async (req, res, next) => {
    try {
      await ensureSnapshot();
      let template = "";
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        const appHtmlPath = path.resolve(process.cwd(), "dist/app.html");
        const indexHtmlPath = path.resolve(process.cwd(), "dist/index.html");
        if (fs.existsSync(appHtmlPath)) {
          template = fs.readFileSync(appHtmlPath, "utf-8");
        } else {
          template = fs.readFileSync(indexHtmlPath, "utf-8");
        }
      }
      
      const slug = req.params.slug;
      
      const defaultCats = ["trending", "latest", "popular"];
      const isDefaultCat = defaultCats.includes(slug.toLowerCase());

      const cat = publicDataSnapshot.categories.find((c: any) => 
        normalizeCat(c.slug) === normalizeCat(slug) || normalizeCat(c.name) === normalizeCat(slug)
      );

      // Return 404 for genuinely nonexistent category ONLY when categories are confirmed loaded and authoritative
      if (!isDefaultCat && !cat) {
        if (publicDataSnapshot.categories.length > 0) {
          return render404(res, "404 - Category Not Found | DesiredHub", "Category Not Found", "The category you are looking for does not exist or has been removed.");
        }
        // If category snapshot is not yet loaded or temporarily unavailable,
        // do NOT falsely classify valid categories as 404!
        // Safely render fallback SEO page with HTTP 200 rather than 404
        const fallbackName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
        return renderSeoPage(
          req,
          res,
          next,
          `${fallbackName} Videos - DesiredHub`,
          `Watch the best ${fallbackName.toLowerCase()} videos on DesiredHub.`,
          `${SITE_URL}/category/${slug}`
        );
      }
      
      let categoryName = "";
      let categoryDesc = "";
      
      if (isDefaultCat) {
        categoryName = slug.charAt(0).toUpperCase() + slug.slice(1) + " Videos";
        categoryDesc = `Watch the best ${categoryName.toLowerCase()} on DesiredHub.`;
      } else if (cat) {
        categoryName = cat.name;
        categoryDesc = cat.seoDescription || cat.description || `Watch the best ${categoryName} videos on DesiredHub.`;
      }

      // Filter matching videos deterministically from snapshot
      let matchedVideos: any[] = [];
      if (slug.toLowerCase() === "trending") {
        matchedVideos = publicDataSnapshot.posts.filter((v: any) => v.trending === true);
      } else if (slug.toLowerCase() === "latest") {
        matchedVideos = [...publicDataSnapshot.posts].sort((a: any, b: any) => b._publishedAtMs - a._publishedAtMs);
      } else if (slug.toLowerCase() === "popular") {
        matchedVideos = [...publicDataSnapshot.posts].sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
      } else {
        matchedVideos = publicDataSnapshot.posts.filter((v: any) => 
          postMatchesCategory(v.categories, slug, publicDataSnapshot.categories)
        );
      }

      const totalMatching = matchedVideos.length;
      const page1Videos = matchedVideos.slice(0, 20);
      const totalPages = Math.max(1, Math.ceil(totalMatching / 20));

      const initialCategoryData = {
        slug: slug,
        name: categoryName,
        description: categoryDesc,
        videos: page1Videos,
        total: totalMatching,
        totalPages: totalPages
      };

      const title = escapeHtml(`${categoryName} - DesiredHub`);
      const description = escapeHtml(categoryDesc);
      const currentUrl = escapeHtml(`${SITE_URL}/category/${slug}`);
      
      const breadcrumbsJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_URL
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": categoryName,
            "item": currentUrl
          }
        ]
      };
      
      const collectionJsonLd = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": categoryName,
        "description": description,
        "url": currentUrl
      };

      const jsonLdScript = `<script type="application/ld+json">${JSON.stringify([breadcrumbsJsonLd, collectionJsonLd])}</script>`;
      
      const seoTags = `
        <title data-rh="true">${title}</title>
        <meta data-rh="true" name="description" content="${description}" />
        <link data-rh="true" rel="canonical" href="${currentUrl}" />
        <meta data-rh="true" property="og:title" content="${title}" />
        <meta data-rh="true" property="og:description" content="${description}" />
        <meta data-rh="true" property="og:url" content="${currentUrl}" />
        <meta data-rh="true" property="og:type" content="website" />
        <meta data-rh="true" name="twitter:title" content="${title}" />
        <meta data-rh="true" name="twitter:description" content="${description}" />
        ${jsonLdScript}
      `;
      
      // Build crawlable semantic initial HTML for Googlebot and early rendering
      let prerenderedCards = "";
      if (page1Videos.length > 0) {
        prerenderedCards = page1Videos.map((v: any) => `
            <article class="flex flex-col group">
              <a href="/video/${escapeHtml(v.slug)}" class="block relative aspect-video bg-neutral-900 rounded-xl overflow-hidden mb-3">
                <img src="${escapeHtml(v.thumbnailUrl)}" alt="${escapeHtml(v.title)}" class="w-full h-full object-cover" loading="lazy" />
                ${v.duration ? `<span class="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-semibold bg-black/80 text-white rounded">${escapeHtml(v.duration)}</span>` : ''}
              </a>
              <h2 class="text-sm font-semibold text-neutral-200 line-clamp-2">
                <a href="/video/${escapeHtml(v.slug)}" class="hover:text-primary transition-colors">${escapeHtml(v.title)}</a>
              </h2>
              ${v.views !== undefined ? `<span class="text-xs text-neutral-400 mt-1">${escapeHtml(Number(v.views).toLocaleString())} views</span>` : ''}
            </article>
        `).join("");
      } else {
        prerenderedCards = `
          <div class="col-span-full text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
            <h2 class="text-xl font-semibold text-white mb-2">No videos found</h2>
            <p class="text-neutral-400 max-w-md mx-auto">There are currently no videos in this category. Check back later!</p>
          </div>
        `;
      }

      const prerenderedBody = `
        <div class="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col">
          <main class="flex-1 pb-20 pt-8 sm:pt-10">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8 mb-16">
              <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">${escapeHtml(categoryName)} Videos</h1>
              ${categoryDesc ? `<p class="text-neutral-400 text-[15px] max-w-3xl leading-relaxed mb-8">${escapeHtml(categoryDesc)}</p>` : ''}
              <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
                ${prerenderedCards}
              </div>
            </div>
          </main>
        </div>
      `;

      const initialDataScript = `<script>window.__INITIAL_CATEGORY_DATA__ = ${safeJsonForScript(initialCategoryData)};</script>`;

      let html = template.replace("<title>DesiredHub</title>", seoTags);
      html = html.replace('<div id="root"></div>', `<div id="root">${prerenderedBody}</div>${initialDataScript}`);

      res.status(200).set({ 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
      }).end(html);
    } catch (e) {
      console.error("Category SEO Injection Error:", e);
      next();
    }
  });

  app.get("/video/:slug", async (req, res, next) => {
    try {
      await ensureSnapshot();
      const slug = req.params.slug;
      
      let video: any;
      let docId = "";
      
      const cachedVideo = publicDataSnapshot.posts.find(v => v.slug === slug);
      if (cachedVideo) {
        video = cachedVideo;
        docId = cachedVideo.id;
      } else if (publicDataSnapshot.posts.length > 0) {
        return render404(res, "404 - Video Not Found | DesiredHub", "Video Not Found", "The video you are trying to watch does not exist, has been removed, or the link is broken.");
      } else {
        // Fallback when snapshot is temporarily unavailable
        try {
          const qSnap = await getDocs(query(collection(db, 'posts'), where('slug', '==', slug), limit(1)));
          if (!qSnap.empty) {
            video = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
            docId = video.id;
          } else {
            return render404(res, "404 - Video Not Found | DesiredHub", "Video Not Found", "The video you are trying to watch does not exist, has been removed, or the link is broken.");
          }
        } catch (fbErr) {
          return next();
        }
      }
      
      let template = "";
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        const appHtmlPath = path.resolve(process.cwd(), "dist/app.html");
        const indexHtmlPath = path.resolve(process.cwd(), "dist/index.html");
        if (fs.existsSync(appHtmlPath)) {
          template = fs.readFileSync(appHtmlPath, "utf-8");
        } else {
          template = fs.readFileSync(indexHtmlPath, "utf-8");
        }
      }
      
      const title = escapeHtml(`${video.title} - DesiredHub`);
      
      let optimalDesc = video.metaDescription || "";
      if (!optimalDesc) {
        let text = (video.description || "").replace(/\s+/g, " ").trim();
        if (text.length > 155) {
          // Find the last space before or at index 152 to avoid breaking words
          let cutoff = text.substring(0, 153).lastIndexOf(" ");
          if (cutoff === -1) cutoff = 152; // Fallback if there are no spaces
          optimalDesc = text.substring(0, cutoff).trim() + "...";
        } else {
          optimalDesc = text;
        }
      }
      const description = escapeHtml(optimalDesc);
      const image = escapeHtml(video.thumbnailUrl || "");
      const currentUrl = escapeHtml(`${SITE_URL}/video/${slug}`);
      
      let uploadDate = new Date().toISOString();
      if (video.publishedAt) {
        if (typeof video.publishedAt.toDate === "function") {
          uploadDate = video.publishedAt.toDate().toISOString();
        } else if (video.publishedAt.seconds) {
          uploadDate = new Date(video.publishedAt.seconds * 1000).toISOString();
        } else {
          uploadDate = new Date(video.publishedAt).toISOString();
        }
      }
      
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.title,
        description: video.description,
        thumbnailUrl: [video.thumbnailUrl],
        uploadDate: uploadDate,
        ...(video.duration && { duration: formatIsoDuration(video.duration) }),
        contentUrl: video.videoUrl,
      };

      const categoryName = (video.categories && video.categories[0]) || video.category;
      const categorySlug = categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") : null;

      const breadcrumbsJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_URL
          },
          ...(categoryName && categorySlug ? [{
            "@type": "ListItem",
            "position": 2,
            "name": categoryName,
            "item": `${SITE_URL}/category/${categorySlug}`
          }] : []),
          {
            "@type": "ListItem",
            "position": categoryName && categorySlug ? 3 : 2,
            "name": video.title,
            "item": `${SITE_URL}/video/${slug}`
          }
        ]
      };

      const seoTags = `
        <title data-rh="true">${title}</title>
        <meta data-rh="true" name="description" content="${description}" />
        <link data-rh="true" rel="canonical" href="${currentUrl}" />
        <meta data-rh="true" property="og:site_name" content="DesiredHub" />
        <meta data-rh="true" property="og:locale" content="en_US" />
        <meta data-rh="true" property="og:type" content="website" />
        <meta data-rh="true" property="og:url" content="${currentUrl}" />
        <meta data-rh="true" property="og:title" content="${title}" />
        <meta data-rh="true" property="og:description" content="${description}" />
        <meta data-rh="true" property="og:image" content="${image}" />
        <meta data-rh="true" property="og:image:width" content="1200" />
        <meta data-rh="true" property="og:image:height" content="630" />
        <meta data-rh="true" name="twitter:card" content="summary_large_image" />
        <meta data-rh="true" name="twitter:url" content="${currentUrl}" />
        <meta data-rh="true" name="twitter:title" content="${title}" />
        <meta data-rh="true" name="twitter:description" content="${description}" />
        <meta data-rh="true" name="twitter:image" content="${image}" />
        <script data-rh="true" type="application/ld+json">${JSON.stringify(jsonLd)}</script>
        <script data-rh="true" type="application/ld+json">${JSON.stringify(breadcrumbsJsonLd)}</script>
        <script>window.__INITIAL_VIDEO_DATA__ = ${JSON.stringify({ id: docId, ...video }).replace(/</g, '\\u003c')};</script>
      `;

            
      let html = template.replace("<title>DesiredHub</title>", seoTags);
      
      // Inject H1 for SEO
      html = html.replace('<div id="root"></div>', `<div id="root"><div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem;"><h1 style="color: #ffffff; font-family: sans-serif; font-size: 2.25rem; font-weight: 700; line-height: 1.2;">${escapeHtml(video.title)}</h1></div></div>`);
  
      res.status(200).set({ 
        'Content-Type': 'text/html',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60'
      }).end(html);
    } catch (e) {
      console.error("SEO Injection Error:", e);
      next();
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const appHtmlPath = path.join(distPath, 'app.html');
      const indexHtmlPath = path.join(distPath, 'index.html');
      if (fs.existsSync(appHtmlPath)) {
        res.sendFile(appHtmlPath);
      } else {
        res.sendFile(indexHtmlPath);
      }
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
