const fs = require('fs');
const p = 'server.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('// Tags')) {
  const insertCode = `
      // Query tags
      const tagsSet = new Set<string>();
      postsList.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      const tagsList = Array.from(tagsSet);
      
      // Tags
      for (const tag of tagsList) {
        xml += \`  <url>\\n\`;
        xml += \`    <loc>\${escapeXml(\`\${SITE_URL}/tag/\${encodeURIComponent(tag.replace(/\\s+/g, '-').toLowerCase())}\`)}</loc>\\n\`;
        xml += \`    <changefreq>weekly</changefreq>\\n\`;
        xml += \`    <priority>0.6</priority>\\n\`;
        xml += \`  </url>\\n\`;
      }
`;

  // We need to make sure postsList includes tags. Let's patch where postsList is created.
  c = c.replace(
    'slug: data.slug,',
    'slug: data.slug,\n          tags: data.tags || [],'
  );

  c = c.replace(
    '// Posts',
    insertCode + '\n      // Posts'
  );
  
  fs.writeFileSync(p, c);
  console.log('Added tags to sitemap');
} else {
  console.log('Tags already in sitemap');
}
