const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace the video description generation
const descRegex = /const title = escapeHtml\(`\$\{video\.title\} - DesiredHub`\);\n\s*const description = escapeHtml\(video\.description \|\| ""\);/;

const optimizedDescCode = `const title = escapeHtml(\`\${video.title} - DesiredHub\`);
      
      const categoryNameForDesc = (video.categories && video.categories[0]) || video.category || "General";
      let optimalDesc = \`Watch \${video.title} in the \${categoryNameForDesc} category. \` + (video.description || "").replace(/\\s+/g, " ").trim();
      if (optimalDesc.length < 120) {
        optimalDesc += " Discover more exciting videos and enjoy high-quality streaming on DesiredHub.";
      }
      if (optimalDesc.length > 155) {
        optimalDesc = optimalDesc.substring(0, 152).trim() + "...";
      }
      const description = escapeHtml(optimalDesc);`;

code = code.replace(descRegex, optimizedDescCode);

// Inject the H1 inside <div id="root">
const htmlRegex = /const html = template\.replace\("<title>DesiredHub<\/title>", seoTags\);/;
const optimizedHtmlCode = `let html = template.replace("<title>DesiredHub</title>", seoTags);
      html = html.replace('<div id="root"></div>', \`<div id="root"><h1 style="color:#0a0a0a;font-size:1px;position:absolute;z-index:-1;">\${escapeHtml(video.title)}</h1></div>\`);`;

code = code.replace(htmlRegex, optimizedHtmlCode);

fs.writeFileSync('server.ts', code);
