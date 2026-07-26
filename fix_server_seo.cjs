const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `      const categoryNameForDesc = (video.categories && video.categories[0]) || video.category || "General";
      let optimalDesc = \`Watch \${video.title} in the \${categoryNameForDesc} category. \` + (video.description || "").replace(/\\s+/g, " ").trim();
      if (optimalDesc.length < 120) {
        optimalDesc += " Discover more exciting videos and enjoy high-quality streaming on DesiredHub. We provide the best entertainment experience for everyone.";
      }
      if (optimalDesc.length > 155) {
        optimalDesc = optimalDesc.substring(0, 152).trim() + "...";
      }
      const description = escapeHtml(optimalDesc);`;

const replacement = `      let optimalDesc = video.metaDescription || "";
      if (!optimalDesc) {
        let text = (video.description || "").replace(/\\s+/g, " ").trim();
        if (text.length > 155) {
          // Find the last space before or at index 152 to avoid breaking words
          let cutoff = text.substring(0, 153).lastIndexOf(" ");
          if (cutoff === -1) cutoff = 152; // Fallback if there are no spaces
          optimalDesc = text.substring(0, cutoff).trim() + "...";
        } else {
          optimalDesc = text;
        }
      }
      const description = escapeHtml(optimalDesc);`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
