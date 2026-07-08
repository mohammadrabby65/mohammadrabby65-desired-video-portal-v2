import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, limit, orderBy } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Configuration
const SITE_URL = process.env.VITE_SITE_URL || 'https://desiredhub.xyz';

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
  messagingSenderId: "15134264747",
  measurementId: ""
};

const fbApp = initializeApp(firebaseConfig);
const db = initializeFirestore(fbApp, {}, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

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

async function generateSitemap() {
  try {
    console.log("Generating static sitemap...");

    // Query categories
    const catQuery = query(collection(db, "categories"), limit(100));
    const catSnap = await getDocs(catQuery);
    const categoriesList = catSnap.docs.map(doc => doc.data().slug).filter(Boolean);
        
    // Read sitemap-old.xml to preserve archive behavior
    const oldSitemapPath = path.join(process.cwd(), "public", "sitemap-old.xml");
    const archivedSlugs = new Set<string>();
    if (fs.existsSync(oldSitemapPath)) {
      const oldSitemap = fs.readFileSync(oldSitemapPath, "utf-8");
      // Extract locs
      const regex = /<loc>.*?\/video\/([^<]+)<\/loc>/g;
      let match;
      while ((match = regex.exec(oldSitemap)) !== null) {
        archivedSlugs.add(match[1]);
      }
      console.log(`Found ${archivedSlugs.size} archived videos in sitemap-old.xml`);
    }

    // Query posts
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

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
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
      xml += `    <loc>${escapeXml(`${SITE_URL}/category/${cat}`)}</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Categories
    for (const slug of categoriesList) {
      if (!defaultCats.includes(slug)) {
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(`${SITE_URL}/category/${slug}`)}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Posts
    for (const post of postsList) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${SITE_URL}/video/${post.slug}`)}</loc>\n`;
      if (post.lastmod) {
        xml += `    <lastmod>${post.lastmod}</lastmod>\n`;
      }
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }
    xml += `</urlset>\n`;

    const outputPath = path.join(process.cwd(), "public", "sitemap-main.xml");
    fs.writeFileSync(outputPath, xml, "utf-8");
    console.log(`Successfully generated sitemap-main.xml at ${outputPath}`);

    // Generate RSS Feed
    console.log("Generating RSS feed...");
        
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
            
      itemsXml += `
    <item>
      <title>${title}</title>
      <link>${videoUrl}</link>
      <description>${description}</description>
      <pubDate>${post.uploadDate}</pubDate>
      <guid isPermaLink="true">${videoUrl}</guid>
      ${categoryStr ? `<category>${categoryStr}</category>` : ""}
    </item>`;
    });

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DesiredHub</title>
    <description>DesiredHub - Free Desi Porn &amp; Hot Indian Sex Videos Online</description>
    <link>${SITE_URL}</link>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${itemsXml}
  </channel>
</rss>`;

    const rssPath = path.join(process.cwd(), "public", "feed.xml");
    fs.writeFileSync(rssPath, rssXml, "utf-8");
    console.log(`Successfully generated feed.xml at ${rssPath}`);

    process.exit(0);
  } catch (err) {
    console.error("Error generating sitemap:", err);
    process.exit(1);
  }
}

generateSitemap();
