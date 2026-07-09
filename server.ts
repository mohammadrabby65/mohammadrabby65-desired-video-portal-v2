import express from "express";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, limit, where, orderBy } from "firebase/firestore";
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
        video = cached.data;
        docId = cached.id;
      } else {
        const q = query(collection(db, "posts"), where("slug", "==", slug), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
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
      
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
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
