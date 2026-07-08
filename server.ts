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

  let cachedSitemap: { xml: string, expires: number } | null = null;
  let cachedFeed: { xml: string, expires: number } | null = null;

  function escapeXml(unsafe: string) {
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

  async function fetchDynamicXml() {
    const now = Date.now();
    if (cachedSitemap && cachedFeed && cachedSitemap.expires > now && cachedFeed.expires > now) {
      return { sitemap: cachedSitemap.xml, feed: cachedFeed.xml };
    }

    const catQuery = query(collection(db, "categories"), limit(100));
    const catSnap = await getDocs(catQuery);
    const categoriesList = catSnap.docs.map(doc => doc.data().slug).filter(Boolean);
    
    const oldSitemapPath = path.join(process.cwd(), "public", "sitemap-old.xml");
    const archivedSlugs = new Set<string>();
    if (fs.existsSync(oldSitemapPath)) {
      const oldSitemap = fs.readFileSync(oldSitemapPath, "utf-8");
      const regex = /<loc>.*?\/video\/([^<]+)<\/loc>/g;
      let match;
      while ((match = regex.exec(oldSitemap)) !== null) {
        archivedSlugs.add(match[1]);
      }
    }

    const postQuery = query(collection(db, "posts"), orderBy("publishedAt", "desc"), limit(2000));
    const postSnap = await getDocs(postQuery);
    
    const activePosts = postSnap.docs.map(doc => {
      const data = doc.data();
      let lastmod = "";
      let uploadDate = new Date().toUTCString();
      if (data.publishedAt) {
        let dateObj;
        if (typeof data.publishedAt.toDate === "function") {
          dateObj = data.publishedAt.toDate();
          uploadDate = dateObj.toUTCString();
        } else if (data.publishedAt.seconds) {
          dateObj = new Date(data.publishedAt.seconds * 1000);
          uploadDate = dateObj.toUTCString();
        } else {
          dateObj = new Date(data.publishedAt);
          uploadDate = dateObj.toUTCString();
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          if (dateObj > new Date()) {
            dateObj = new Date();
          }
          lastmod = dateObj.toISOString();
        }
      }
      return {
        slug: data.slug,
        tags: data.tags || [],
        categories: data.categories || [],
        category: data.category || "",
        title: data.title || "",
        description: data.description || "",
        isActive: data.isActive,
        lastmod,
        uploadDate
      };
    }).filter(p => p.isActive !== false && p.slug);
    
    const postsList = activePosts.filter(p => !archivedSlugs.has(p.slug));

    let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    sitemapXml += `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    const defaultCats = ["trending", "latest", "popular"];
    for (const cat of defaultCats) {
      sitemapXml += `  <url>\n    <loc>${escapeXml(`${SITE_URL}/category/${cat}`)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }
    for (const slug of categoriesList) {
      if (!defaultCats.includes(slug)) {
        sitemapXml += `  <url>\n    <loc>${escapeXml(`${SITE_URL}/category/${slug}`)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
    }
    for (const post of postsList) {
      sitemapXml += `  <url>\n    <loc>${escapeXml(`${SITE_URL}/video/${post.slug}`)}</loc>\n`;
      if (post.lastmod) {
        sitemapXml += `    <lastmod>${post.lastmod}</lastmod>\n`;
      }
      sitemapXml += `    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    sitemapXml += `</urlset>\n`;

    let itemsXml = "";
    postsList.slice(0, 100).forEach(post => {
      const videoUrl = `${SITE_URL}/video/${post.slug}`;
      const title = escapeXml(post.title || "");
      const description = escapeXml(post.description || "");
      let categoryStr = "";
      if (post.categories && post.categories.length > 0) {
        categoryStr = escapeXml(post.categories[0]);
      } else if (post.category) {
        categoryStr = escapeXml(post.category);
      }
      itemsXml += `    <item>\n      <title>${title}</title>\n      <link>${videoUrl}</link>\n      <description>${description}</description>\n      <pubDate>${post.uploadDate}</pubDate>\n      <guid isPermaLink="true">${videoUrl}</guid>\n      ${categoryStr ? `<category>${categoryStr}</category>\n` : ""}    </item>\n`;
    });
    
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n  <channel>\n    <title>DesiredHub</title>\n    <description>DesiredHub - Free Desi Porn &amp; Hot Indian Sex Videos Online</description>\n    <link>${SITE_URL}</link>\n    <language>en-US</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n${itemsXml}  </channel>\n</rss>`;

    const cacheExpiration = now + 60 * 1000;
    cachedSitemap = { xml: sitemapXml, expires: cacheExpiration };
    cachedFeed = { xml: rssXml, expires: cacheExpiration };

    return { sitemap: sitemapXml, feed: rssXml };
  }

  app.get("/sitemap-main.xml", async (req, res) => {
    try {
      const data = await fetchDynamicXml();
      res.type("application/xml");
      res.send(data.sitemap);
    } catch (e) {
      console.error("Error generating sitemap:", e);
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/feed.xml", async (req, res) => {
    try {
      const data = await fetchDynamicXml();
      res.type("application/rss+xml; charset=utf-8");
      res.send(data.feed);
    } catch (e) {
      console.error("Error generating feed:", e);
      res.status(500).send("Error generating feed");
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


  app.get("/video/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug;
      
      const q = query(collection(db, "posts"), where("slug", "==", slug), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return next();
      }
      
      const video = snap.docs[0].data();
      
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
