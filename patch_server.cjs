const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes(' increment,')) {
  code = code.replace(
    'updateDoc, getCountFromServer',
    'updateDoc, getCountFromServer, increment'
  );
}

const endpoint = `

  app.post("/api/video/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      
      const videoIndex = publicDataSnapshot.posts.findIndex(v => v.id === id);
      if (videoIndex === -1) {
        return res.status(404).json({ error: "Not found" });
      }
      
      const video = publicDataSnapshot.posts[videoIndex];
      const currentViews = video.views || 0;
      
      publicDataSnapshot.posts[videoIndex].views = currentViews + 1;
      
      let p = 1.0;
      let inc = 1;
      
      if (currentViews > 10000) {
        p = 0.01;
        inc = 100;
      } else if (currentViews > 1000) {
        p = 0.02;
        inc = 50;
      } else if (currentViews > 100) {
        p = 0.1;
        inc = 10;
      }
      
      if (Math.random() < p) {
        const docRef = doc(db, 'posts', id);
        await updateDoc(docRef, { views: increment(inc) });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("View API Error");
      res.status(500).json({ success: false });
    }
  });
`;

if (!code.includes('app.post("/api/video/:id/view"')) {
  code = code.replace(
    'app.get("/", (req, res, next) => {',
    endpoint + '\\n  app.get("/", (req, res, next) => {'
  );
}

fs.writeFileSync('server.ts', code);
