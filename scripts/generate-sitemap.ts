import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import { SITE_URL } from '../src/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  projectId: "gen-lang-client-0637384010",
  appId: "1:15134264747:web:6041c9b4e3b309b476d6ee",
  apiKey: "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4",
  authDomain: "gen-lang-client-0637384010.firebaseapp.com",
  storageBucket: "gen-lang-client-0637384010.firebasestorage.app",
  messagingSenderId: "15134264747",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "ai-studio-4bafc186-e88d-4ed0-9fe5-bcbfd53ab7e2");

async function generateSitemap() {
  console.log('Generating sitemap...');
  try {
    // Query categories
    const catQuery = query(collection(db, "categories"), limit(100));
    const catSnap = await getDocs(catQuery);
    const categoriesList = catSnap.docs.map(doc => doc.data().slug).filter(Boolean);

    // Query tags
    const tagQuery = query(collection(db, "tags"), limit(100));
    const tagSnap = await getDocs(tagQuery);
    const tagsList = tagSnap.docs.map(doc => doc.data().slug).filter(Boolean);

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

    // Tags
    for (const slug of tagsList) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/tag/${slug}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
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

    const publicDir = path.resolve(__dirname, '../public');
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
    
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /api/*

Sitemap: ${SITE_URL}/sitemap.xml
`;
    fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);

    console.log('Sitemap and robots.txt generated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
