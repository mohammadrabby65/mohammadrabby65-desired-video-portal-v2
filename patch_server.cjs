const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const anchor = `  app.get("/api/videos/adjacent", async (req, res) => {`;

const patch = `  app.get("/api/videos/random-slug", async (req, res) => {
    try {
      await ensureSnapshot();
      const posts = publicDataSnapshot.posts;
      if (posts.length === 0) {
        return res.status(404).json({ error: "No videos found" });
      }
      const randomVideo = posts[Math.floor(Math.random() * posts.length)];
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }).json({ slug: randomVideo.slug });
    } catch (err) {
      console.error("API /videos/random-slug error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/videos/adjacent", async (req, res) => {`;

if (code.includes(anchor)) {
  code = code.replace(anchor, patch);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts");
} else {
  console.log("Anchor not found in server.ts");
}
