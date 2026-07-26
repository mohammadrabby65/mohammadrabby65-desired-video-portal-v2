const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Fix search route
code = code.replace(
  /let html = template\.replace\("<title>DesiredHub<\/title>", seoTags\);\n\s*html = html\.replace\('<div id="root"><\/div>', `<div id="root"><h1 style="color:#0a0a0a;font-size:1px;position:absolute;z-index:-1;">\$\{escapeHtml\(video\.title\)\}<\/h1><\/div>`\);/,
  `const html = template.replace("<title>DesiredHub</title>", seoTags);`
);

// Inject into the video route
const videoHtmlInjection = `      const html = template.replace("<title>DesiredHub</title>", seoTags);
      
      const finalHtml = html.replace('<div id="root"></div>', \`<div id="root"><div style="background-color: #0a0a0a; min-height: 100vh; padding: 2rem;"><h1 style="color: #ffffff; font-family: sans-serif; font-size: 2.25rem; font-weight: 700; line-height: 1.2;">\${escapeHtml(video.title)}</h1></div></div>\`);`;

code = code.replace(
  /const html = template\.replace\("<title>DesiredHub<\/title>", seoTags\);\n\s*res\.status\(200\)\.set/g,
  (match, offset, string) => {
    // Only replace the one in the video route (which is the last one)
    if (offset > string.length / 2) {
      return videoHtmlInjection + `\n      res.status(200).set`;
    }
    return match;
  }
);

code = code.replace(
  /const html = template\.replace\("<title>DesiredHub<\/title>", seoTags\);\n\s*res\.status\(200\)\.set/g,
  (match, offset, string) => {
    // wait, I used /g, let's just do it cleanly
    return match;
  }
);

fs.writeFileSync('server.ts', code);
