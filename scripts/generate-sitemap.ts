import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, query, limit } from "firebase/firestore";
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

    // Query posts
    const postQuery = query(collection(db, "posts"), limit(1000));
    const postSnap = await getDocs(postQuery);
    
    const postsList = postSnap.docs.map(doc => {
      const data = doc.data();
      let lastmod = "";
      if (data.publishedAt) {
        let dateObj;
        if (typeof data.publishedAt.toDate === "function") {
          dateObj = data.publishedAt.toDate();
        } else if (data.publishedAt.seconds) {
          dateObj = new Date(data.publishedAt.seconds * 1000);
        } else {
          dateObj = new Date(data.publishedAt);
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
        lastmod
      };
    }).filter(p => p.slug);

    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
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

    /*
    // Query tags
    const tagsSet = new Set<string>();
    postsList.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });
    const tagsList = Array.from(tagsSet);
    
    // Tags
    for (const tag of tagsList) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${SITE_URL}/tag/${encodeURIComponent(tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))}`)}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    }
    */

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
    process.exit(0);
  } catch (err) {
    console.error("Error generating sitemap:", err);
    process.exit(1);
  }
}

generateSitemap();
