import express from "express";
import path from "path";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, getDoc, query, limit, where, orderBy, doc, updateDoc, getCountFromServer, Timestamp, startAfter, setLogLevel } from "firebase/firestore";
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
      if (categories.length === 0) {
        return res.json({ videos: [], nextCursor: null });
      }

      let filtered = publicDataSnapshot.posts.filter(v => 
        v.id !== videoId && 
        v.categories && 
        v.categories.some((c: string) => categories.includes(c))
      );

      fs.writeFileSync("/tmp/debug3.json", JSON.stringify({filtered: filtered.length}));
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
        template = fs.readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf-8");
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

  app.get("/", (req, res, next) => {
    renderSeoPage(req, res, next, "DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online", "Watch free desi porn and hot Indian sex videos online at DesiredHub. Enjoy horny bhabhis, gorgeous desi girls, and raw adult entertainment in high quality.", `${SITE_URL}/`);
  });

  app.get("/categories", (req, res, next) => {
    renderSeoPage(req, res, next, "All Categories - DesiredHub", "Browse all video categories on DesiredHub. Find your favorite desi porn, horny bhabhis, Indian sex videos, and adult content streamed in high quality.", `${SITE_URL}/categories`);
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
        template = fs.readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf-8");
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
      
            const html = template.replace("<title>DesiredHub</title>", seoTags);
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
      
      let template = "";
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf-8");
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
