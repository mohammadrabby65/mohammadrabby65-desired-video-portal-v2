import express from "express";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, getCountFromServer, Timestamp, startAfter, setLogLevel } from "firebase/firestore";
import { SITE_URL } from "./src/config";
import fs from "fs";

setLogLevel("silent");


const SECRET_KEY = process.env.VITE_STREAM_SECRET || "local-dev-secret-key-12345";

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
  messagingSenderId: "15134264747",
  measurementId: ""
};

const fbApp = initializeApp(firebaseConfig, "server-app");
const db = initializeFirestore(fbApp, { experimentalForceLongPolling: true }, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

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
    const catQ = query(collection(db, 'categories'), orderBy('name', 'asc'), limit(1000));
    const catSnap = await getDocs(catQ);
    const categories = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const postQ = query(collection(db, 'posts'), limit(1000));
    const postSnap = await getDocs(postQ);
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
    
    fs.writeFileSync(path.join(process.cwd(), 'data-snapshot.json'), JSON.stringify(publicDataSnapshot));
    console.log(`Snapshot generated. Posts: ${posts.length}, Categories: ${categories.length}`);
  } catch (err) {
    console.error("Error generating snapshot:", err);
  }
}

try {
  const fileData = fs.readFileSync(path.join(process.cwd(), 'data-snapshot.json'), 'utf-8');
  publicDataSnapshot = JSON.parse(fileData);
  console.log(`Loaded snapshot from disk. Posts: ${publicDataSnapshot.posts.length}, Categories: ${publicDataSnapshot.categories.length}`);
} catch (e) {
  ensureSnapshot();
}

setInterval(generateSnapshot, 60 * 60 * 1000);

async function startServer() {
  const PORT = 3000;
  
  app.use(express.json());

  app.post("/api/admin/snapshot/generate", async (req, res) => {
    await generateSnapshot();
    res.json({ success: true, lastUpdated: publicDataSnapshot.lastUpdated });
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
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /api/*
Sitemap: ${SITE_URL}/sitemap-main.xml`);
  });

  app.get("/api/categories", async (req, res) => {
    try {
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
      await ensureSnapshot();
      const { category, tag, q: searchQuery, sortBy, limitCount = "20", lastId } = req.query;
      const limitNum = Math.min(parseInt(limitCount as string, 10) || 20, 100);

      let filtered = publicDataSnapshot.posts;

      if (searchQuery) {
        const queryStr = (searchQuery as string).trim().toLowerCase();
        if (queryStr) {
           filtered = filtered.filter(v => {
             const titleMatch = (v.title || '').toLowerCase().includes(queryStr);
             const descMatch = (v.description || '').toLowerCase().includes(queryStr);
             const tagMatch = (v.tags || []).some((t: string) => t.toLowerCase().includes(queryStr));
             const catMatch = (v.categories || []).some((c: string) => c.toLowerCase().includes(queryStr));
             return titleMatch || descMatch || tagMatch || catMatch;
           });
        }
      } else if (category && category !== 'All') {
         filtered = filtered.filter(v => v.categories && v.categories.includes(category));
      } else if (tag) {
         filtered = filtered.filter(v => v.tags && v.tags.includes(tag));
      }

      if (sortBy === 'random') {
         filtered = [...filtered].sort(() => Math.random() - 0.5);
      } else if (sortBy === 'oldest') {
         filtered = [...filtered].sort((a, b) => a._publishedAtMs - b._publishedAtMs);
      } else if (sortBy === 'popular') {
         filtered = [...filtered].sort((a, b) => (b.views || 0) - (a.views || 0));
      } else {
         filtered = [...filtered].sort((a, b) => b._publishedAtMs - a._publishedAtMs);
      }

      let startIndex = 0;
      if (lastId) {
        const lastIdx = filtered.findIndex(v => v.id === lastId);
        if (lastIdx !== -1) {
          startIndex = lastIdx + 1;
        }
      }

      const paginatedDocs = filtered.slice(startIndex, startIndex + limitNum);

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
      }).json(paginatedDocs);
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
      if (categories.length === 0) {
        return res.json({ videos: [], nextCursor: null });
      }

      let filtered = publicDataSnapshot.posts.filter(v => 
        v.id !== videoId && 
        v.categories && 
        v.categories.some((c: string) => categories.includes(c))
      );

      let startIndex = 0;
      if (lastId) {
        const lastIdx = filtered.findIndex(v => v.id === lastId);
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
        return next();
      }
      
      let template = "";
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf-8");
      }
      
      const title = escapeHtml(`${video.title} - DesiredHub`);
      const description = escapeHtml(video.description || "");
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
        <script>window.__INITIAL_VIDEO_DATA__ = ${JSON.stringify({ id: docId, ...video }).replace(/</g, '\\u003c')};</script>
      `;

      const html = template.replace("<title>DesiredHub</title>", seoTags);
      
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
      res.sendFile(path.join(distPath, 'index.html'));
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
