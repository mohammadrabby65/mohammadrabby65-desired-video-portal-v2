const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

// Replace description logic for video route ONLY
const descIndex = code.indexOf('const title = escapeHtml(`${video.title} - DesiredHub`);');
if (descIndex > -1) {
  const nextLine = code.indexOf('const description = escapeHtml(video.description || "");', descIndex);
  if (nextLine > -1) {
    code = code.substring(0, nextLine) + `const categoryNameForDesc = (video.categories && video.categories[0]) || video.category || "General";
      let optimalDesc = \`Watch \${video.title} in the \${categoryNameForDesc} category. \` + (video.description || "").replace(/\\s+/g, " ").trim();
      if (optimalDesc.length < 120) {
        optimalDesc += " Discover more exciting videos and enjoy high-quality streaming on DesiredHub.";
      }
      if (optimalDesc.length > 155) {
        optimalDesc = optimalDesc.substring(0, 152).trim() + "...";
      }
      const description = escapeHtml(optimalDesc);` + code.substring(nextLine + 'const description = escapeHtml(video.description || "");'.length);
  }
}

// Find the last html generation
const parts = code.split('const html = template.replace("<title>DesiredHub</title>", seoTags);');
if (parts.length > 3) {
  // We have 3 occurrences, parts[3] is everything after the 3rd one.
  const beforeThird = parts.slice(0, 3).join('const html = template.replace("<title>DesiredHub</title>", seoTags);');
  
  const modifiedThird = `
      let html = template.replace("<title>DesiredHub</title>", seoTags);
      
      // Inject H1 for SEO
      html = html.replace('<div id="root"></div>', \`<div id="root"><div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem;"><h1 style="color: #ffffff; font-family: sans-serif; font-size: 2.25rem; font-weight: 700; line-height: 1.2;">\${escapeHtml(video.title)}</h1></div></div>\`);
  ` + parts[3];
  
  code = beforeThird + modifiedThird;
}

fs.writeFileSync('server.ts', code);
