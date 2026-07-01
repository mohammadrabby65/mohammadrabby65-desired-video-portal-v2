import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, limit } from "firebase/firestore";
import { SITE_URL } from "./src/config";

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

async function startServer() {
  const app = express();
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

Sitemap: ${SITE_URL}/sitemap.xml
`);
  });

  // Dynamic Sitemap.xml
  app.get("/sitemap.xml", async (req, res) => {
    try {
      // Query categories
      const catQuery = query(collection(db, "categories"), limit(100));
      const catSnap = await getDocs(catQuery);
      const categoriesList = catSnap.docs.map(doc => doc.data().slug).filter(Boolean);

      // Query posts
      const postQuery = query(collection(db, "posts"), limit(1000));
      const postSnap = await getDocs(postQuery);
      const postsList = postSnap.docs.map(doc => {
        const data = doc.data();
        let lastmod = "";
        if (data.publishedAt) {
          if (typeof data.publishedAt.toDate === "function") {
            lastmod = data.publishedAt.toDate().toISOString();
          } else if (data.publishedAt.seconds) {
            lastmod = new Date(data.publishedAt.seconds * 1000).toISOString();
          } else {
            lastmod = new Date(data.publishedAt).toISOString();
          }
        }
        return {
          slug: data.slug,
          lastmod
        };
      }).filter(p => p.slug);

      // Build XML
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Home Page
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;

      // Add default virtual categories
      const defaultCats = ["trending", "latest", "popular"];
      for (const cat of defaultCats) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/category/${cat}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }

      // Categories
      for (const slug of categoriesList) {
        if (!defaultCats.includes(slug)) {
          xml += `  <url>\n`;
          xml += `    <loc>${SITE_URL}/category/${slug}</loc>\n`;
          xml += `    <changefreq>daily</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }
      }

      // Posts
      for (const post of postsList) {
        xml += `  <url>\n`;
        xml += `    <loc>${SITE_URL}/video/${post.slug}</loc>\n`;
        if (post.lastmod) {
          xml += `    <lastmod>${post.lastmod}</lastmod>\n`;
        }
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }

      xml += `</urlset>\n`;

      res.type("application/xml");
      res.send(xml);
    } catch (err) {
      console.error("Error generating sitemap:", err);
      // Fallback sitemap
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;
      xml += `</urlset>\n`;
      res.type("application/xml");
      res.send(xml);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
