const fs = require('fs');

let serverStr = fs.readFileSync('server.ts', 'utf-8');

if (!serverStr.includes('function injectRandomVideos')) {
  const injectFn = `
function injectRandomVideos(template: string) {
  if (!publicDataSnapshot || !publicDataSnapshot.posts || publicDataSnapshot.posts.length === 0) {
    return template;
  }
  const clientPool = [...publicDataSnapshot.posts].sort(() => 0.5 - Math.random()).slice(0, 50);
  const initial12 = clientPool.slice(0, 12);
  
  const ssrHtml = \`
    <div id="seo-random-videos" class="sr-only">
      <h2>Random Videos</h2>
      \${initial12.map((v: any) => \`<a href="/video/\${v.slug}">\${escapeHtml(v.title)}</a>\`).join('\\n')}
    </div>
  \`;
  
  const scriptTag = \`<script>window.__RANDOM_VIDEOS_POOL__ = \${JSON.stringify(clientPool).replace(/</g, '\\\\u003c')};</script>\`;
  
  return template.replace('</body>', \`\${ssrHtml}\\n\${scriptTag}\\n</body>\`);
}
`;

  serverStr = serverStr.replace('// Helper to format ISO 8601 duration', injectFn + '\n// Helper to format ISO 8601 duration');
}

serverStr = serverStr.replace(/let html = template\.replace\("<title>DesiredHub<\/title>", seoTags\);\n\s*res\.status/g, 'let html = template.replace("<title>DesiredHub</title>", seoTags);\n      html = injectRandomVideos(html);\n\n      res.status');

serverStr = serverStr.replace(/res\.sendFile\(path\.join\(distPath, 'index\.html'\)\);/g, `let template = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      let html = injectRandomVideos(template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);`);
      
// Ensure fs is imported
if (!serverStr.includes('import fs from')) {
  serverStr = serverStr.replace('import path from "path";', 'import path from "path";\nimport fs from "fs";');
}

fs.writeFileSync('server.ts', serverStr);
