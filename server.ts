import express from "express";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, getCountFromServer, Timestamp, startAfter } from "firebase/firestore";
import { SITE_URL } from "./src/config";
import fs from "fs";


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
const db = initializeFirestore(fbApp, {}, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

export const app = express();

async function startServer() {
  const PORT = 3000;
  
  app.use(express.json());

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

  let cachedCategories: any = null;
  let categoriesCacheTime = 0;
  
  app.get("/api/categories", async (req, res) => {
    try {
      const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
      if (cachedCategories && (Date.now() - categoriesCacheTime < CACHE_DURATION)) {
        res.status(200).set({
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
        }).json(cachedCategories);
        return;
      }

      const q = query(
        collection(db, 'categories'),
        orderBy('name', 'asc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const cats = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      cachedCategories = cats.filter((c: any) => c.isActive !== false);
      categoriesCacheTime = Date.now();

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
      }).json(cachedCategories);
    } catch (e) {
      console.error("Categories fetch error:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const videosCache = new Map<string, { data: any, timestamp: number }>();
  const relatedVideosCache = new Map<string, { data: any, timestamp: number }>();
  const adjacentVideosCache = new Map<string, { data: any, timestamp: number }>();
  const VIDEOS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  app.get("/api/videos", async (req, res) => {
    try {
      const { category, tag, q: searchQuery, sortBy, limitCount = "20", lastId } = req.query;
      
      const limitNum = Math.min(parseInt(limitCount as string, 10) || 20, 20);

      const constraints: any[] = [];
      if (searchQuery) {
        const searchWord = (searchQuery as string).trim().toLowerCase().split(' ')[0];
        if (searchWord) constraints.push(where('searchTerms', 'array-contains', searchWord));
      } else if (category && category !== 'All') {
        constraints.push(where('categories', 'array-contains', category));
        constraints.push(orderBy((sortBy as string) && sortBy !== 'random' ? sortBy as string : 'publishedAt', 'desc'));
      } else if (tag) {
        constraints.push(where('tags', 'array-contains', tag));
        constraints.push(orderBy((sortBy as string) && sortBy !== 'random' ? sortBy as string : 'publishedAt', 'desc'));
      } else {
        if (sortBy && sortBy !== 'random') {
          constraints.push(orderBy(sortBy as string, 'desc'));
        } else if (!sortBy) {
          constraints.push(orderBy('publishedAt', 'desc'));
        }
      }

      if (lastId) {
        // Fetch the cursor doc
        const cursorDocSnap = await getDoc(doc(db, 'posts', lastId as string));
        if (cursorDocSnap.exists()) {
          constraints.push(startAfter(cursorDocSnap));
        }
      }

      const videosQ = query(collection(db, 'posts'), ...constraints, limit(limitNum));
      const videosSnap = await getDocs(videosQ);
      
      let videos = videosSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      
      if (sortBy === 'random') {
        videos = videos.sort(() => Math.random() - 0.5);
      }

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
      }).json(videos);
    } catch (err) {
      console.error("API /videos error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Removed /api/videos/count endpoint as it was very expensive

  app.get("/api/videos/related", async (req, res) => {
    try {
      const { videoId, categories: categoriesStr, tags: tagsStr, limitCount = "4", lastId } = req.query;
      
      const limitNum = Math.min(parseInt(limitCount as string, 10) || 4, 20);

      if (!videoId) {
        return res.status(400).json({ error: "videoId is required" });
      }

      const categories = categoriesStr ? (categoriesStr as string).split(',').filter(Boolean) : [];
      if (categories.length === 0) {
        return res.json({ videos: [], nextCursor: null });
      }

      const constraints: any[] = [
        where('categories', 'array-contains-any', categories.slice(0, 10)),
        orderBy('publishedAt', 'desc')
      ];

      if (lastId) {
        const cursorDocSnap = await getDoc(doc(db, 'posts', lastId as string));
        if (cursorDocSnap.exists()) {
          constraints.push(startAfter(cursorDocSnap));
        }
      }

      // We read limitNum + 1 because we need to filter out the current videoId if it appears
      const maxLimit = Math.min(limitNum + 1, 20);
      constraints.push(limit(maxLimit));

      const q = query(collection(db, 'posts'), ...constraints);
      const snapshot = await getDocs(q);

      const fetchedDocs = snapshot.docs;
      const filteredDocs = fetchedDocs.filter(doc => doc.id !== videoId);

      const paginatedDocs = filteredDocs.slice(0, limitNum);

      let nextCursor: string | null = null;
      if (filteredDocs.length > limitNum) {
        nextCursor = paginatedDocs[paginatedDocs.length - 1].id;
      }

      const videos = paginatedDocs.map(doc => ({ id: doc.id, ...doc.data() }));

      const result = { videos, nextCursor };

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
      }).json(result);
    } catch (err) {
      console.error("API /videos/related error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos/adjacent", async (req, res) => {
    try {
      const { currentSlug, seconds: secondsStr, nanoseconds: nanosecondsStr } = req.query;

      if (!currentSlug) {
        return res.status(400).json({ error: "currentSlug is required" });
      }

      const seconds = parseInt(secondsStr as string, 10);
      const nanoseconds = parseInt(nanosecondsStr as string, 10);

      const cacheKey = JSON.stringify({ currentSlug, seconds, nanoseconds });
      const cached = adjacentVideosCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp < VIDEOS_CACHE_TTL)) {
        res.status(200).set({
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
        }).json(cached.data);
        return;
      }

      let pubAt: any = null;
      if (isNaN(seconds) || isNaN(nanoseconds)) {
        const videoQ = query(collection(db, 'posts'), where('slug', '==', currentSlug), limit(1));
        const videoSnap = await getDocs(videoQ);
        if (videoSnap.empty) {
          return res.status(404).json({ prev: null, next: null });
        }
        pubAt = videoSnap.docs[0].data().publishedAt;
      } else {
        pubAt = new Timestamp(seconds, nanoseconds);
      }

      if (!pubAt) {
        return res.status(404).json({ prev: null, next: null });
      }

      const prevQ = query(
        collection(db, 'posts'),
        orderBy('publishedAt', 'desc'),
        startAfter(pubAt),
        limit(1)
      );

      const nextQ = query(
        collection(db, 'posts'),
        orderBy('publishedAt', 'asc'),
        startAfter(pubAt),
        limit(1)
      );

      const [prevSnap, nextSnap] = await Promise.all([getDocs(prevQ), getDocs(nextQ)]);

      const prev = prevSnap.empty ? null : { id: prevSnap.docs[0].id, ...prevSnap.docs[0].data() };
      const next = nextSnap.empty ? null : { id: nextSnap.docs[0].id, ...nextSnap.docs[0].data() };

      const result = { prev, next };
      adjacentVideosCache.set(cacheKey, { data: result, timestamp: Date.now() });

      res.status(200).set({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600'
      }).json(result);
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


  const videoCache = new Map<string, { data: any, id: string, timestamp: number }>();
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  app.get("/video/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug;
      
      let video: any;
      let docId = "";
      
      const cached = videoCache.get(slug);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        if (cached.data === null) {
          return next();
        }
        video = cached.data;
        docId = cached.id;
      } else {
        const q = query(collection(db, "posts"), where("slug", "==", slug), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          videoCache.set(slug, { data: null, id: "", timestamp: Date.now() });
          return next();
        }
        
        video = snap.docs[0].data();
        docId = snap.docs[0].id;
        
        videoCache.set(slug, { data: video, id: docId, timestamp: Date.now() });
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
