const fs = require('fs');
let serverStr = fs.readFileSync('server.ts', 'utf-8');

if (!serverStr.includes('function injectRandomVideos')) {
  const injectFn = `
function injectRandomVideos(template: string) {
  if (typeof publicDataSnapshot === 'undefined' || !publicDataSnapshot || !publicDataSnapshot.posts || publicDataSnapshot.posts.length === 0) {
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

  serverStr = serverStr.replace('app.get("/api/admin/snapshot/status",', injectFn + '\napp.get("/api/admin/snapshot/status",');
  fs.writeFileSync('server.ts', serverStr);
}
