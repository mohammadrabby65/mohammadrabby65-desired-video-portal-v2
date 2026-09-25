import express from "express";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, getCountFromServer, increment, Timestamp, startAfter, setLogLevel } from "firebase/firestore";
import { SITE_URL } from "./src/config";
import fs from "fs";

setLogLevel("silent");


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

try {
  const localSnapshotPath = path.resolve(process.cwd(), "data-snapshot.json");
  if (fs.existsSync(localSnapshotPath)) {
    const raw = JSON.parse(fs.readFileSync(localSnapshotPath, "utf-8"));
    if (raw && Array.isArray(raw.posts) && raw.posts.length > 0) {
      publicDataSnapshot = {
        posts: raw.posts,
        categories: raw.categories || [],
        lastUpdated: raw.lastUpdated || Date.now()
      };
      console.log(`Loaded initial snapshot from data-snapshot.json: ${publicDataSnapshot.posts.length} posts, ${publicDataSnapshot.categories.length} categories`);
    }
  }
} catch (e) {
  // Ignore local snapshot load errors
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



let snapshotPromise: Promise<void> | null = null;

async function ensureSnapshot() {
  if (publicDataSnapshot.lastUpdated > 0 && publicDataSnapshot.posts.length > 0) return;
  if (!snapshotPromise) {
    snapshotPromise = generateSnapshot().finally(() => {
      snapshotPromise = null;
    });
  }
  await snapshotPromise;
}

async function generateSnapshot() {
  console.log("Generating data snapshot...");
  try {
    const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('name', 'asc'), limit(1000)));
    const categories = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const postSnap = await getDocs(query(collection(db, 'posts'), limit(1000)));
    const posts = postSnap.docs.map(doc => {
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

    posts.sort((a, b) => b._publishedAtMs - a._publishedAtMs);

    if (posts.length === 0) {
      console.warn("Validation failed: 0 posts fetched. Aborting update.");
      return;
    }

    publicDataSnapshot = {
      posts,
      categories,
      lastUpdated: Date.now()
    };
    try {
      fs.writeFileSync(path.resolve(process.cwd(), "data-snapshot.json"), JSON.stringify(publicDataSnapshot));
    } catch (e) {
      // Ignore write errors in read-only environments
    }
    
    console.log(`Snapshot generated. Posts: ${posts.length}, Categories: ${categories.length}`);
  } catch (err) {
    console.error("Error generating snapshot:", err);
    throw err;
  }
}

ensureSnapshot();

setInterval(() => generateSnapshot().catch(console.error), 60 * 60 * 1000);

async function startServer() {
  const PORT = 3000;
  
  app.use(express.json());

  // Normalize Vercel serverless request URL from headers
  app.use((req, res, next) => {
    const matched = (req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-invoke-path']) as string;
    if (matched && typeof matched === 'string') {
      if (req.url === '/api/server' || req.url.startsWith('/api/server?')) {
        const qIdx = req.url.indexOf('?');
        const queryString = qIdx !== -1 ? req.url.slice(qIdx) : '';
        req.url = matched + (matched.includes('?') ? '' : queryString);
      }
    } else if (req.url === '/api/server' || req.url === '/api/server/') {
      req.url = '/';
    }
    next();
  });


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
      await generateSnapshot();
      res.json({ success: true, lastUpdated: publicDataSnapshot.lastUpdated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to generate snapshot' });
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
      const activePosts = posts.filter((p: any) => p.isActive !== false && p.slug);
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
      const { category, tag, q: searchQuery, sortBy, limitCount = "20", lastId } = req.query;
      const limitNum = Math.min(parseInt(limitCount as string, 10) || 20, 100);

      if (publicDataSnapshot.posts.length === 0 && !searchQuery && !lastId) {
        let q = collection(db, 'posts');
        let constraints = [];
        if (category) constraints.push(where('categories', 'array-contains', category as string));
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
      fs.writeFileSync("/tmp/debug1.json", JSON.stringify({filtered: filtered.length}));

      fs.writeFileSync("/tmp/debug2.json", JSON.stringify({filtered: filtered.length}));
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
      } else if (category && category !== 'All') {
         filtered = filtered.filter(v => v.categories && v.categories.includes(category));
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

      fs.writeFileSync("/tmp/debug3.json", JSON.stringify({filtered: filtered.length}));
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
      console.log("filtered:", filtered.length, "start:", startIndex, "end:", end, "limit:", limitNum);
      fs.writeFileSync("/tmp/debug.json", JSON.stringify({filtered: filtered.length, start: startIndex, end, limit: limitNum}));

      const paginatedDocs = filtered.slice(startIndex, end);

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
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
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
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
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
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

  function getAdjacentVideos(pubAtMs: number) {
    let prev: any = null;
    let next: any = null;
    const active = publicDataSnapshot.posts.filter((v: any) => v.isActive !== false && v.slug && v._publishedAtMs);
    const older = active.filter((v: any) => v._publishedAtMs < pubAtMs);
    if (older.length > 0) prev = older[0];
    const newer = active.filter((v: any) => v._publishedAtMs > pubAtMs);
    if (newer.length > 0) next = newer[newer.length - 1];
    return { prev, next };
  }

  function getRelatedVideos(videoId: string, categories: string[] = [], tags: string[] = [], currentTitle: string = "", limitCount: number = 6) {
    const titleKeywords = currentTitle 
      ? currentTitle.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
      : [];

    let scoredVideos = publicDataSnapshot.posts
      .filter((v: any) => v.id !== videoId && v.isActive !== false && v.slug)
      .map((v: any) => {
        let score = 0;
        if (v.categories && categories.length > 0) {
          if (v.categories.some((c: string) => categories.includes(c))) score += 5;
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
        if (ageDays >= 0 && ageDays < 30) score += 1;
        return { video: v, score };
      });

    scoredVideos.sort((a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      const aPub = a.video._publishedAtMs || (a.video.publishedAt?.seconds || 0) * 1000;
      const bPub = b.video._publishedAtMs || (b.video.publishedAt?.seconds || 0) * 1000;
      return bPub - aPub;
    });

    return scoredVideos.slice(0, limitCount).map((s: any) => s.video);
  }

  function renderVideoCardHtml(post: any) {
    const categoryName = (post.categories && post.categories[0]) || post.category;
    const categorySlug = categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") : null;
    
    let postIsoDate = "";
    let formattedDate = "";
    if (post.publishedAt) {
      if (typeof post.publishedAt.toDate === "function") {
        postIsoDate = post.publishedAt.toDate().toISOString();
      } else if (post.publishedAt.seconds) {
        postIsoDate = new Date(post.publishedAt.seconds * 1000).toISOString();
      } else {
        postIsoDate = new Date(post.publishedAt).toISOString();
      }
      try {
        formattedDate = new Date(postIsoDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (e) {}
    }

    const thumbUrl = post.thumbnailUrl ? escapeHtml(post.thumbnailUrl) : "";
    const titleText = escapeHtml(post.title || "Video");

    return `
      <article style="background: #171717; border: 1px solid #262626; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
        ${thumbUrl ? `
          <figure style="margin: 0; aspect-ratio: 16/9; background: #0f0f0f; overflow: hidden; position: relative;">
            <a href="/video/${post.slug}" style="display: block; width: 100%; height: 100%;">
              <img src="${thumbUrl}" alt="${titleText}" width="320" height="180" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" />
            </a>
            ${post.duration ? `<span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.85); color: #ffffff; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${escapeHtml(post.duration)}</span>` : ''}
          </figure>
        ` : ''}
        <div style="padding: 12px 14px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500; line-height: 1.4;">
            <a href="/video/${post.slug}" style="color: #ffffff; text-decoration: none;">${titleText}</a>
          </h3>
          <div style="font-size: 12px; color: #737373; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            ${categoryName && categorySlug ? `<a href="/category/${categorySlug}" style="color: #ef4444; text-decoration: none; font-weight: 500;">${escapeHtml(categoryName)}</a>` : ''}
            ${post.views ? `<span>&bull; ${post.views} views</span>` : ''}
            ${formattedDate ? `<span>&bull; <time datetime="${postIsoDate}">${formattedDate}</time></span>` : ''}
            ${post.quality ? `<span style="background: #262626; color: #a3a3a3; padding: 1px 4px; border-radius: 4px; font-size: 11px;">${escapeHtml(post.quality)}</span>` : ''}
          </div>
        </div>
      </article>
    `.trim();
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

  function getTemplate() {
    if (process.env.NODE_ENV !== "production") {
      return fs.readFileSync(
        path.resolve(process.cwd(), "index.html"),
        "utf-8"
      );
    }

    const appHtmlPath = path.resolve(process.cwd(), "dist/app.html");

    if (fs.existsSync(appHtmlPath)) {
      return fs.readFileSync(appHtmlPath, "utf-8");
    }

    return fs.readFileSync(
      path.resolve(process.cwd(), "dist/index.html"),
      "utf-8"
    );
  }

  async function renderSeoPage(req: any, res: any, next: any, rawTitle: string, rawDesc: string, canonicalUrl: string, extraTags: string = "", extraHtmlReplace?: (html: string) => string) {
    try {
      let template = getTemplate();
      if (process.env.NODE_ENV !== "production") {
        template = await vite.transformIndexHtml(req.originalUrl, template);
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

  app.get(["/", "/api/server"], async (req, res, next) => {
    try {
      await ensureSnapshot();
      const activePosts = publicDataSnapshot.posts.filter((p: any) => p.isActive !== false && p.slug);
      const activeCats = publicDataSnapshot.categories.filter((c: any) => c.isActive !== false && c.slug);
      
      // Featured and Trending collections if existing flags exist
      const featuredVideos = activePosts.filter((p: any) => p.featured).slice(0, 6);
      const trendingVideos = activePosts.filter((p: any) => p.trending && !featuredVideos.some((f: any) => f.slug === p.slug)).slice(0, 6);

      // Latest 36 videos
      const latestVideos = activePosts.slice(0, 36);
      
      // Popular 12 videos (excluding ones already in latest to maximize unique crawlable internal links)
      const popularVideos = [...activePosts]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .filter((p: any) => !latestVideos.some((lv: any) => lv.slug === p.slug))
        .slice(0, 12);

      // Discovery routes
      const discoveryLinksHtml = `
        <nav aria-label="Quick Discovery" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 1.5rem;">
          <a href="/categories" style="color: #ffffff; background: #262626; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none;">All Categories</a>
          <a href="/category/trending" style="color: #ef4444; background: #1c1917; border: 1px solid #78350f; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none;">Trending Videos</a>
          <a href="/category/popular" style="color: #f59e0b; background: #1c1917; border: 1px solid #78350f; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none;">Popular Videos</a>
          <a href="/category/latest" style="color: #38bdf8; background: #082f49; border: 1px solid #0369a1; padding: 7px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-decoration: none;">Latest Releases</a>
        </nav>
      `.trim();

      // Categories pills with counts
      const categoryLinksHtml = activeCats.map((cat: any) => {
        const catCount = activePosts.filter((p: any) => 
          (p.categories && p.categories.includes(cat.slug)) || p.category === cat.slug
        ).length;
        return `<li style="display: inline-block; margin: 0 6px 6px 0;"><a href="/category/${cat.slug}" style="color: #d4d4d4; text-decoration: none; background: #1f1f1f; padding: 6px 14px; border-radius: 9999px; font-size: 13px; display: inline-block; border: 1px solid #2e2e2e;">${escapeHtml(cat.name)} (${catCount})</a></li>`;
      }).join("") + `<li style="display: inline-block; margin: 0 6px 6px 0;"><a href="/categories" style="color: #ef4444; text-decoration: none; background: #1f1f1f; padding: 6px 14px; border-radius: 9999px; font-size: 13px; display: inline-block; border: 1px solid #ef4444;">Browse All Categories &rarr;</a></li>`;

      // Popular tags in memory
      const tagCounts: Record<string, number> = {};
      activePosts.forEach((p: any) => {
        if (Array.isArray(p.tags)) {
          p.tags.forEach((t: string) => {
            const clean = t.trim();
            if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
          });
        }
      });
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([name, count]) => ({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          count
        }));

      const tagsLinksHtml = topTags.map(t => 
        `<li style="display: inline-block; margin: 0 6px 6px 0;"><a href="/tag/${t.slug}" style="color: #a3a3a3; text-decoration: none; background: #141414; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block; border: 1px solid #262626;">#${escapeHtml(t.name)} (${t.count})</a></li>`
      ).join("");

      const latestVideosHtml = latestVideos.map(renderVideoCardHtml).join("");
      const popularVideosHtml = popularVideos.map(renderVideoCardHtml).join("");
      const featuredVideosHtml = featuredVideos.map(renderVideoCardHtml).join("");
      const trendingVideosHtml = trendingVideos.map(renderVideoCardHtml).join("");

      const rootContent = `
        <div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem 1.5rem; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <header style="margin-bottom: 2rem;">
            <h1 style="color: #ffffff; font-size: 1.75rem; font-weight: 700; line-height: 1.2; margin: 0 0 1rem 0;">DesiredHub - Free Desi Porn &amp; Hot Indian Sex Videos Online</h1>
            ${discoveryLinksHtml}
            <nav aria-label="Categories" style="margin-bottom: 1.5rem;">
              <h2 style="font-size: 0.9rem; font-weight: 600; color: #737373; text-transform: uppercase; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">Categories</h2>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${categoryLinksHtml}
              </ul>
            </nav>
            ${topTags.length > 0 ? `
              <nav aria-label="Popular Tags" style="margin-bottom: 1.5rem;">
                <h2 style="font-size: 0.9rem; font-weight: 600; color: #737373; text-transform: uppercase; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">Popular Tags</h2>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${tagsLinksHtml}
                </ul>
              </nav>
            ` : ''}
          </header>
          <main>
            ${featuredVideos.length > 0 ? `
              <section style="margin-bottom: 2.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: #ffffff; margin: 0 0 1rem 0;">Featured Videos</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                  ${featuredVideosHtml}
                </div>
              </section>
            ` : ''}
            ${trendingVideos.length > 0 ? `
              <section style="margin-bottom: 2.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: #ffffff; margin: 0 0 1rem 0;">Trending Videos</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                  ${trendingVideosHtml}
                </div>
              </section>
            ` : ''}
            <section style="margin-bottom: 2.5rem;">
              <h2 style="font-size: 1.25rem; font-weight: 600; color: #ffffff; margin: 0 0 1rem 0;">Latest Videos</h2>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                ${latestVideosHtml}
              </div>
            </section>
            ${popularVideos.length > 0 ? `
              <section style="margin-bottom: 2.5rem;">
                <h2 style="font-size: 1.25rem; font-weight: 600; color: #ffffff; margin: 0 0 1rem 0;">Popular Videos</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                  ${popularVideosHtml}
                </div>
              </section>
            ` : ''}
          </main>
        </div>
      `.trim();

      const allHomepageVideos = [...featuredVideos, ...trendingVideos, ...latestVideos, ...popularVideos];
      // Deduplicate for schema
      const uniqueHomepageVideos = allHomepageVideos.filter((v, i, a) => a.findIndex(t => t.slug === v.slug) === i);

      const webSiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "DesiredHub",
        "url": SITE_URL,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };

      const orgJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "DesiredHub",
        "url": SITE_URL,
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/favicon-32x32.png`
        }
      };

      const itemListJsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Latest Indian Adult Videos",
        "numberOfItems": uniqueHomepageVideos.length,
        "itemListElement": uniqueHomepageVideos.map((post: any, idx: number) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": post.title,
          "url": `${SITE_URL}/video/${post.slug}`
        }))
      };

      const extraTags = `<script data-rh="true" type="application/ld+json">${JSON.stringify([webSiteJsonLd, orgJsonLd, itemListJsonLd])}</script>`;

      renderSeoPage(
        req, 
        res, 
        next, 
        "DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online", 
        "Watch free desi porn and hot Indian sex videos online at DesiredHub. Enjoy horny bhabhis, gorgeous desi girls, and raw adult entertainment in high quality.", 
        `${SITE_URL}/`,
        extraTags,
        (html) => html.replace('<div id="root"></div>', `<div id="root">${rootContent}</div>`)
      );
    } catch (e) {
      console.error("Home SEO error:", e);
      next();
    }
  });

  app.get("/categories", async (req, res, next) => {
    try {
      await ensureSnapshot();
      const activePosts = publicDataSnapshot.posts.filter((p: any) => p.isActive !== false && p.slug);
      const activeCats = publicDataSnapshot.categories.filter((c: any) => c.isActive !== false && c.slug);
      
      const catCardsHtml = activeCats.map((cat: any) => {
        const catVideos = activePosts.filter((p: any) => 
          (p.categories && p.categories.includes(cat.slug)) || p.category === cat.slug
        );
        const top3 = catVideos.slice(0, 3);
        return `
          <article style="background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                <h2 style="font-size: 1.15rem; font-weight: 600; margin: 0;">
                  <a href="/category/${cat.slug}" style="color: #ffffff; text-decoration: none;">${escapeHtml(cat.name)}</a>
                </h2>
                <span style="font-size: 13px; color: #ef4444; font-weight: 600;">${catVideos.length} videos</span>
              </div>
              ${cat.seoDescription ? `<p style="font-size: 13px; color: #a3a3a3; margin: 0 0 12px 0; line-height: 1.4;">${escapeHtml(cat.seoDescription)}</p>` : ''}
            </div>
            ${top3.length > 0 ? `
              <div style="border-top: 1px solid #262626; padding-top: 10px; margin-top: 10px;">
                <span style="font-size: 11px; text-transform: uppercase; color: #737373; font-weight: 600; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Featured in this category:</span>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${top3.map((v: any) => `
                    <li style="margin: 4px 0;">
                      <a href="/video/${v.slug}" style="color: #d4d4d4; text-decoration: none; font-size: 13px; display: block; line-height: 1.3;">&bull; ${escapeHtml(v.title)}</a>
                    </li>
                  `).join("")}
                </ul>
              </div>
            ` : ''}
          </article>
        `.trim();
      }).join("");

      const categoriesRootHtml = `
        <div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem 1.5rem; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <nav aria-label="Breadcrumb" style="margin-bottom: 1rem; font-size: 0.875rem; color: #737373;">
            <a href="/" style="color: #a3a3a3; text-decoration: none;">Home</a>
            <span> / Categories</span>
          </nav>
          <h1 style="color: #ffffff; font-size: 2rem; font-weight: 700; line-height: 1.2; margin: 0 0 0.5rem 0;">All Categories</h1>
          <p style="color: #a3a3a3; font-size: 0.95rem; margin: 0 0 1.5rem 0;">Browse our complete collection of ${activeCats.length} adult video categories.</p>
          <section>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
              ${catCardsHtml}
            </div>
          </section>
        </div>
      `.trim();

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
            "name": "Categories",
            "item": `${SITE_URL}/categories`
          }
        ]
      };

      const itemListJsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Adult Video Categories",
        "numberOfItems": activeCats.length,
        "itemListElement": activeCats.map((cat: any, idx: number) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": cat.name,
          "url": `${SITE_URL}/category/${cat.slug}`
        }))
      };

      const extraTags = `<script data-rh="true" type="application/ld+json">${JSON.stringify([breadcrumbsJsonLd, itemListJsonLd])}</script>`;

      renderSeoPage(
        req, 
        res, 
        next, 
        "All Categories - DesiredHub", 
        "Browse all video categories on DesiredHub. Find your favorite desi porn, horny bhabhis, Indian sex videos, and adult content streamed in high quality.", 
        `${SITE_URL}/categories`,
        extraTags,
        (html) => html.replace('<div id="root"></div>', `<div id="root">${categoriesRootHtml}</div>`)
      );
    } catch (e) {
      console.error("Categories SEO error:", e);
      next();
    }
  });

  app.get("/dmca", (req, res, next) => {
    renderSeoPage(req, res, next, "DMCA Policy - DesiredHub", "Read the DMCA copyright infringement policy for DesiredHub. Learn how to submit a takedown notice for unauthorized adult content securely.", `${SITE_URL}/dmca`);
  });

  app.get("/2257", (req, res, next) => {
    renderSeoPage(req, res, next, "18 U.S.C. § 2257 Compliance - DesiredHub", "View the 18 U.S.C. 2257 record-keeping compliance declaration for DesiredHub confirming all models depicted are of legal age.", `${SITE_URL}/2257`);
  });

  app.get("/privacy-policy", (req, res, next) => {
    renderSeoPage(req, res, next, "Privacy Policy - DesiredHub", "Read the privacy policy for DesiredHub to understand how we collect, use, and protect your personal information while browsing adult content.", `${SITE_URL}/privacy-policy`);
  });

  app.get("/tag/:slug", async (req, res, next) => {
    try {
      await ensureSnapshot();
      const slug = req.params.slug;
      const tagTitle = slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const tagSlugNormalized = slug.toLowerCase().replace(/-/g, ' ');

      const tagVideos = publicDataSnapshot.posts.filter((v: any) => {
        if (v.isActive === false || !v.slug) return false;
        return v.tags && v.tags.some((t: string) => 
          t.toLowerCase() === tagSlugNormalized || 
          t.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug
        );
      });

      // Render up to 100 tag videos so all matching videos are crawlable through normal HTML links
      const displayVideos = tagVideos.slice(0, 100);
      const tagVideosHtml = displayVideos.map(renderVideoCardHtml).join("");

      const tagRootHtml = `
        <div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem 1.5rem; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <nav aria-label="Breadcrumb" style="margin-bottom: 1rem; font-size: 0.875rem; color: #737373;">
            <a href="/" style="color: #a3a3a3; text-decoration: none;">Home</a>
            <span> / #${escapeHtml(tagTitle)}</span>
          </nav>
          <h1 style="color: #ffffff; font-size: 2rem; font-weight: 700; line-height: 1.2; margin: 0 0 0.5rem 0;">#${escapeHtml(tagTitle)} Videos</h1>
          <p style="color: #a3a3a3; margin: 0 0 1.5rem 0; font-size: 0.95rem;">${tagVideos.length} videos tagged with #${escapeHtml(tagTitle)}</p>
          <section>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
              ${tagVideosHtml}
            </div>
          </section>
        </div>
      `.trim();

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
            "name": `#${tagTitle}`,
            "item": `${SITE_URL}/tag/${slug}`
          }
        ]
      };

      const itemListJsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `#${tagTitle} Videos`,
        "numberOfItems": displayVideos.length,
        "itemListElement": displayVideos.map((post: any, idx: number) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": post.title,
          "url": `${SITE_URL}/video/${post.slug}`
        }))
      };

      const extraTags = `<script data-rh="true" type="application/ld+json">${JSON.stringify([breadcrumbsJsonLd, itemListJsonLd])}</script>`;

      renderSeoPage(
        req, 
        res, 
        next, 
        `${tagTitle} Videos - DesiredHub`, 
        `Explore free desi porn and hot Indian sex videos tagged with ${tagTitle} on DesiredHub. Enjoy high quality streaming adult entertainment.`, 
        `${SITE_URL}/tag/${slug}`,
        extraTags,
        (html) => html.replace('<div id="root"></div>', `<div id="root">${tagRootHtml}</div>`)
      );
    } catch (e) {
      console.error("Tag SEO error:", e);
      next();
    }
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
      let template = getTemplate();
      if (process.env.NODE_ENV !== "production") {
        template = await vite.transformIndexHtml(req.originalUrl, template);
      }
      
      const slug = req.params.slug;
      
      const defaultCats = ["trending", "latest", "popular"];
      let categoryName = "";
      let categoryDesc = "";
      
      if (defaultCats.includes(slug.toLowerCase())) {
        categoryName = slug.charAt(0).toUpperCase() + slug.slice(1) + " Videos";
        categoryDesc = `Watch the best ${categoryName.toLowerCase()} on DesiredHub.`;
      } else {
        const cat = publicDataSnapshot.categories.find((c: any) => c.slug === slug);
        if (cat) {
          categoryName = cat.name;
          categoryDesc = cat.seoDescription || `Watch the best ${categoryName} videos on DesiredHub.`;
        } else {
          categoryName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
          categoryDesc = `Watch the best ${categoryName} videos on DesiredHub.`;
        }
      }
      
      const title = escapeHtml(`${categoryName} - DesiredHub`);
      const description = escapeHtml(categoryDesc);
      const currentUrl = escapeHtml(`${SITE_URL}/category/${slug}`);
      
      let categoryVideos: any[] = [];
      if (slug === "trending") {
        categoryVideos = publicDataSnapshot.posts.filter((v: any) => v.isActive !== false && v.slug && v.trending);
        if (categoryVideos.length < 20) {
          categoryVideos = [...publicDataSnapshot.posts.filter((v: any) => v.isActive !== false && v.slug)].sort((a, b) => (b.views || 0) - (a.views || 0));
        }
      } else if (slug === "popular") {
        categoryVideos = [...publicDataSnapshot.posts.filter((v: any) => v.isActive !== false && v.slug)].sort((a, b) => (b.views || 0) - (a.views || 0));
      } else if (slug === "latest") {
        categoryVideos = publicDataSnapshot.posts.filter((v: any) => v.isActive !== false && v.slug);
      } else {
        categoryVideos = publicDataSnapshot.posts.filter((v: any) => {
          if (v.isActive === false || !v.slug) return false;
          return (v.categories && v.categories.includes(slug)) || v.category === slug;
        });
      }

      // Render up to 100 category videos so older videos are directly reachable through internal HTML links
      const displayVideos = categoryVideos.slice(0, 100);

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
            "name": "Categories",
            "item": `${SITE_URL}/categories`
          },
          {
            "@type": "ListItem",
            "position": 3,
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

      const itemListJsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `${categoryName} Videos`,
        "numberOfItems": displayVideos.length,
        "itemListElement": displayVideos.map((post: any, idx: number) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": post.title,
          "url": `${SITE_URL}/video/${post.slug}`
        }))
      };

      const jsonLdScript = `<script type="application/ld+json">${JSON.stringify([breadcrumbsJsonLd, collectionJsonLd, itemListJsonLd])}</script>`;
      
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

      const categoryVideosHtml = displayVideos.map(renderVideoCardHtml).join("");

      const categoryRootHtml = `
        <div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem 1.5rem; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <nav aria-label="Breadcrumb" style="margin-bottom: 1rem; font-size: 0.875rem; color: #737373;">
            <a href="/" style="color: #a3a3a3; text-decoration: none;">Home</a>
            <span> / </span>
            <a href="/categories" style="color: #a3a3a3; text-decoration: none;">Categories</a>
            <span> / ${escapeHtml(categoryName)}</span>
          </nav>
          <div style="margin-bottom: 1.5rem;">
            <h1 style="color: #ffffff; font-size: 2rem; font-weight: 700; line-height: 1.2; margin: 0 0 0.5rem 0;">${escapeHtml(categoryName)}</h1>
            <p style="color: #a3a3a3; margin: 0 0 0.75rem 0; font-size: 0.95rem;">${escapeHtml(categoryDesc)} (${categoryVideos.length} videos available)</p>
            <a href="/categories" style="color: #ef4444; font-size: 0.875rem; text-decoration: none;">&larr; Browse All Categories</a>
          </div>
          <section>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
              ${categoryVideosHtml}
            </div>
          </section>
        </div>
      `.trim();

      let html = template.replace("<title>DesiredHub</title>", seoTags);
      html = html.replace('<div id="root"></div>', `<div id="root">${categoryRootHtml}</div>`);
      res.status(200).set({ 
        'Content-Type': 'text/html',
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
      } else {
        res.status(404).set('Content-Type', 'text/html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 - Page Not Found | DesiredHub</title>
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
      <h2>Video Not Found</h2>
      <p>The video you are trying to watch does not exist, has been removed, or the link is broken.</p>
      <a href="/" class="btn">Back to Home</a>
    </div>
  </body>
</html>`);
        return;
      }
      
      let template = getTemplate();
      if (process.env.NODE_ENV !== "production") {
        template = await vite.transformIndexHtml(req.originalUrl, template);
      }
      
      const title = escapeHtml(`${video.title} - DesiredHub`);
      
      let optimalDesc = video.metaDescription || "";
      if (!optimalDesc) {
        let text = (video.description || "").replace(/\s+/g, " ").trim();
        if (text.length > 155) {
          let cutoff = text.substring(0, 153).lastIndexOf(" ");
          if (cutoff === -1) cutoff = 152;
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
      
      const jsonLd: any = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.title,
        description: video.description || video.title,
        uploadDate: uploadDate,
        mainEntityOfPage: currentUrl
      };

      if (video.thumbnailUrl) {
        jsonLd.thumbnailUrl = [video.thumbnailUrl];
      }
      if (video.duration) {
        const isoDur = formatIsoDuration(video.duration);
        if (isoDur) jsonLd.duration = isoDur;
      }
      if (video.videoUrl) {
        jsonLd.contentUrl = video.videoUrl;
      }
      jsonLd.publisher = {
        "@type": "Organization",
        name: "DesiredHub",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/favicon-32x32.png`
        }
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

      // Sanitize video object for public script payload - DO NOT expose admin/private fields
      const safeVideoData = {
        id: docId,
        title: video.title,
        slug: video.slug,
        description: video.description || "",
        thumbnailUrl: video.thumbnailUrl || "",
        videoUrl: video.videoUrl || "",
        duration: video.duration || "",
        quality: video.quality || "HD",
        views: video.views || 0,
        categories: video.categories || (video.category ? [video.category] : []),
        tags: video.tags || [],
        publishedAt: video.publishedAt || null,
        _publishedAtMs: video._publishedAtMs || 0,
        featured: !!video.featured,
        trending: !!video.trending,
        badges: video.badges || []
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
        <script>window.__INITIAL_VIDEO_DATA__ = ${JSON.stringify(safeVideoData).replace(/</g, '\\u003c')};</script>
      `;

      let html = template.replace("<title>DesiredHub</title>", seoTags);
      
      const pubAtMs = video._publishedAtMs || (video.publishedAt?.seconds ? video.publishedAt.seconds * 1000 : 0);
      const { prev, next: nextVideo } = getAdjacentVideos(pubAtMs);

      const videoCategories = video.categories || (video.category ? [video.category] : []);
      const videoTags = video.tags || [];
      const relatedVideos = getRelatedVideos(video.id, videoCategories, videoTags, video.title, 8);

      const adjacentHtml = (prev || nextVideo) ? `
        <nav aria-label="Adjacent videos" style="margin: 1.5rem 0; padding: 1rem; background: #171717; border: 1px solid #262626; border-radius: 8px;">
          <h2 style="font-size: 0.95rem; font-weight: 600; color: #a3a3a3; margin: 0 0 0.75rem 0; text-transform: uppercase; letter-spacing: 0.05em;">Adjacent Videos</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between;">
            ${prev ? `<div style="flex: 1; min-width: 200px;"><span style="font-size: 0.8rem; color: #737373;">&larr; Previous Video</span><br/><a href="/video/${prev.slug}" style="color: #ffffff; text-decoration: none; font-weight: 500; font-size: 0.95rem;">${escapeHtml(prev.title)}</a></div>` : ''}
            ${nextVideo ? `<div style="flex: 1; min-width: 200px; text-align: right;"><span style="font-size: 0.8rem; color: #737373;">Next Video &rarr;</span><br/><a href="/video/${nextVideo.slug}" style="color: #ffffff; text-decoration: none; font-weight: 500; font-size: 0.95rem;">${escapeHtml(nextVideo.title)}</a></div>` : ''}
          </div>
        </nav>
      `.trim() : '';

      const tagsHtml = (videoTags && videoTags.length > 0) ? `
        <nav aria-label="Tags" style="margin: 1.25rem 0;">
          <h3 style="font-size: 0.85rem; font-weight: 600; color: #737373; text-transform: uppercase; margin: 0 0 0.5rem 0; letter-spacing: 0.05em;">Tags</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${videoTags.map((tag: string) => {
              const tSlug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              return `<a href="/tag/${tSlug}" style="color: #d4d4d4; background: #1c1c1c; border: 1px solid #2e2e2e; padding: 4px 10px; border-radius: 4px; font-size: 13px; text-decoration: none;">#${escapeHtml(tag)}</a>`;
            }).join("")}
          </div>
        </nav>
      `.trim() : '';

      const relatedHtml = relatedVideos.length > 0 ? `
        <section aria-label="Related videos" style="margin-top: 2rem;">
          <h2 style="font-size: 1.25rem; font-weight: 600; color: #ffffff; margin: 0 0 1rem 0;">Related Videos</h2>
          <ul style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; list-style: none; padding: 0; margin: 0;">
            ${relatedVideos.map((rel: any) => 
              `<li style="background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 12px 14px;">
                <a href="/video/${rel.slug}" style="color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; display: block; line-height: 1.4;">${escapeHtml(rel.title)}</a>
                <div style="font-size: 12px; color: #737373; margin-top: 6px; display: flex; gap: 8px; align-items: center;">
                  ${rel.duration ? `<span>${escapeHtml(rel.duration)}</span>` : ''}
                  ${rel.views ? `<span>&bull; ${rel.views} views</span>` : ''}
                  ${rel.quality ? `<span style="background: #262626; color: #a3a3a3; padding: 1px 4px; border-radius: 4px; font-size: 11px;">${escapeHtml(rel.quality)}</span>` : ''}
                </div>
              </li>`
            ).join("")}
          </ul>
        </section>
      `.trim() : '';

      const breadcrumbsHtml = `
        <nav aria-label="Breadcrumb" style="margin-bottom: 1rem; font-size: 0.875rem; color: #737373;">
          <a href="/" style="color: #a3a3a3; text-decoration: none;">Home</a>
          ${categoryName && categorySlug ? ` / <a href="/category/${categorySlug}" style="color: #a3a3a3; text-decoration: none;">${escapeHtml(categoryName)}</a>` : ''}
          <span> / ${escapeHtml(video.title)}</span>
        </nav>
      `.trim();

      const formattedDate = uploadDate ? new Date(uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

      const videoMetaHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 1rem; font-size: 0.875rem; color: #a3a3a3;">
          ${categoryName && categorySlug ? `<span>Category: <a href="/category/${categorySlug}" style="color: #ef4444; text-decoration: none; font-weight: 500;">${escapeHtml(categoryName)}</a></span>` : ''}
          ${formattedDate ? `<span>&bull; Published: <time datetime="${uploadDate}">${formattedDate}</time></span>` : ''}
          ${video.duration ? `<span>&bull; Duration: ${escapeHtml(video.duration)}</span>` : ''}
          ${video.views ? `<span>&bull; ${video.views} views</span>` : ''}
          ${video.quality ? `<span style="background: #262626; color: #d4d4d4; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${escapeHtml(video.quality)}</span>` : ''}
        </div>
      `.trim();

      const videoRootHtml = `
        <div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem 1.5rem; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${breadcrumbsHtml}
          <h1 style="color: #ffffff; font-size: 2rem; font-weight: 700; line-height: 1.2; margin: 0 0 1rem 0;">${escapeHtml(video.title)}</h1>
          ${videoMetaHtml}
          ${image ? `
            <div style="margin-bottom: 1.5rem; max-width: 640px; aspect-ratio: 16/9; background: #171717; border-radius: 8px; overflow: hidden;">
              <img src="${image}" alt="${title}" width="640" height="360" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          ${video.description ? `<p style="color: #a3a3a3; font-size: 0.95rem; line-height: 1.6; margin: 0 0 1.5rem 0; max-width: 800px;">${escapeHtml(video.description)}</p>` : ''}
          ${tagsHtml}
          ${adjacentHtml}
          ${relatedHtml}
        </div>
      `.trim();

      html = html.replace('<div id="root"></div>', `<div id="root">${videoRootHtml}</div>`);
  
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
      res.sendFile(
        fs.existsSync(path.join(distPath, "app.html"))
          ? path.join(distPath, "app.html")
          : path.join(distPath, "index.html")
      );
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
