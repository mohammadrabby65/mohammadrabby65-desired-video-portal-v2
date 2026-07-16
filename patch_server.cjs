const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`    fs.writeFileSync(path.join(process.cwd(), 'data-snapshot.json'), JSON.stringify(publicDataSnapshot));
    console.log(\`Snapshot generated. Posts: \${posts.length}, Categories: \${categories.length}\`);
  } catch (err) {
    console.error("Error generating snapshot:", err);
  }`,
`    fs.writeFileSync(path.join(process.cwd(), 'data-snapshot.json'), JSON.stringify(publicDataSnapshot));
    console.log(\`Snapshot generated. Posts: \${posts.length}, Categories: \${categories.length}\`);
  } catch (err) {
    console.error("Error generating snapshot:", err);
    throw err;
  }`
);

const statusEndpoint = `
  app.get("/api/admin/snapshot/status", (req, res) => {
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
  });

  app.post("/api/admin/snapshot/generate", async (req, res) => {
    try {
      await generateSnapshot();
      res.json({ success: true, lastUpdated: publicDataSnapshot.lastUpdated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to generate snapshot' });
    }
  });
`;

code = code.replace(
`  app.post("/api/admin/snapshot/generate", async (req, res) => {
    await generateSnapshot();
    res.json({ success: true, lastUpdated: publicDataSnapshot.lastUpdated });
  });`,
statusEndpoint
);

code = code.replace(
`setInterval(generateSnapshot, 60 * 60 * 1000);`,
`setInterval(() => generateSnapshot().catch(console.error), 60 * 60 * 1000);`
);

fs.writeFileSync('server.ts', code);
