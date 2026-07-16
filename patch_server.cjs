const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`    fs.writeFileSync(path.join(process.cwd(), 'data-snapshot.json'), JSON.stringify(publicDataSnapshot));
    console.log(\`Snapshot generated. Posts: \${posts.length}, Categories: \${categories.length}\`);`,
`    console.log(\`Snapshot generated. Posts: \${posts.length}, Categories: \${categories.length}\`);`
);

code = code.replace(
`try {
  const fileData = fs.readFileSync(path.join(process.cwd(), 'data-snapshot.json'), 'utf-8');
  publicDataSnapshot = JSON.parse(fileData);
  console.log(\`Loaded snapshot from disk. Posts: \${publicDataSnapshot.posts.length}, Categories: \${publicDataSnapshot.categories.length}\`);
} catch (e) {
  ensureSnapshot();
}`,
`ensureSnapshot();`
);

code = code.replace(
`  app.get("/api/admin/snapshot/status", (req, res) => {
    try {
      const stats = fs.statSync(path.join(process.cwd(), 'data-snapshot.json'));
      res.json({
        status: publicDataSnapshot.lastUpdated > 0 ? "Success" : "Never Generated",
        lastUpdated: publicDataSnapshot.lastUpdated,
        postsCount: publicDataSnapshot.posts.length,
        categoriesCount: publicDataSnapshot.categories.length,
        sizeKb: Math.round(stats.size / 1024)
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
  });`,
`  app.get("/api/admin/snapshot/status", (req, res) => {
    const sizeBytes = Buffer.byteLength(JSON.stringify(publicDataSnapshot));
    res.json({
      status: publicDataSnapshot.lastUpdated > 0 ? "Success" : "Never Generated",
      lastUpdated: publicDataSnapshot.lastUpdated,
      postsCount: publicDataSnapshot.posts.length,
      categoriesCount: publicDataSnapshot.categories.length,
      sizeKb: Math.round(sizeBytes / 1024)
    });
  });`
);

fs.writeFileSync('server.ts', code);
