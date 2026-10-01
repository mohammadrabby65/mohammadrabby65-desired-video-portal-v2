const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// Inside /category/:slug (around line 860) and /video/:slug (around line 1070)
// Replace const currentUrl = escapeHtml(`${SITE_URL}/...`); with dynamic URL.
// But SITE_URL is also used for jsonLd breadcrumbs!

// Let's just find `app.get("/category/:slug"` and `app.get("/video/:slug"` and insert `DYNAMIC_SITE_URL` and replace `SITE_URL` with `DYNAMIC_SITE_URL` in those scopes.

// We will use regex replacement with a replacer function for app.get("/category/:slug"... and app.get("/video/:slug"...

serverCode = serverCode.replace(/app\.get\("\/category\/:slug", async \(req, res, next\) => \{([\s\S]*?)\}\);/g, (match, body) => {
  let newBody = body.replace(/SITE_URL/g, 'DYNAMIC_SITE_URL');
  return `app.get("/category/:slug", async (req, res, next) => {
    const host = req.headers.host || 'www.desiredhub.xyz';
    const DYNAMIC_SITE_URL = host === 'desiredhub.xyz' ? 'https://www.desiredhub.xyz' : \`https://\${host}\`;
${newBody}
  });`;
});

serverCode = serverCode.replace(/app\.get\("\/video\/:slug", async \(req, res, next\) => \{([\s\S]*?)\}\);/g, (match, body) => {
  let newBody = body.replace(/SITE_URL/g, 'DYNAMIC_SITE_URL');
  return `app.get("/video/:slug", async (req, res, next) => {
    const host = req.headers.host || 'www.desiredhub.xyz';
    const DYNAMIC_SITE_URL = host === 'desiredhub.xyz' ? 'https://www.desiredhub.xyz' : \`https://\${host}\`;
${newBody}
  });`;
});

// Also replace in formatSeo (around line 700)
// function formatSeo(title: string, description: string, currentPath: string) { ... }
serverCode = serverCode.replace(/function formatSeo\(title: string, description: string, currentPath: string\) \{([\s\S]*?)\}/, (match, body) => {
  // It has `const canonical = \`\${SITE_URL}\${currentPath}\`;`
  // We cannot easily inject req.headers.host there because formatSeo doesn't take req.
  // We'll change formatSeo signature to `function formatSeo(title: string, description: string, currentPath: string, req: any) {`
  return `function formatSeo(title: string, description: string, currentPath: string, req: any) {
    const host = req.headers.host || 'www.desiredhub.xyz';
    const DYNAMIC_SITE_URL = host === 'desiredhub.xyz' ? 'https://www.desiredhub.xyz' : \`https://\${host}\`;
    const fullTitle = \`\${title} | DesiredHub\`;
    const canonical = \`\${DYNAMIC_SITE_URL}\${currentPath}\`;
    return { title: fullTitle, description, canonical };
  }`;
});

serverCode = serverCode.replace(/const seo = formatSeo\(rawTitle, rawDesc, canonicalUrl\);/g, `const seo = formatSeo(rawTitle, rawDesc, canonicalUrl, req);`);


fs.writeFileSync('server.ts', serverCode);
console.log('Patched dynamic site url');
