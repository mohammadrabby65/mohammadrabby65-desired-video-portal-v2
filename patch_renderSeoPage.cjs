const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

serverCode = serverCode.replace(
  /async function renderSeoPage\(req: any, res: any, next: any, rawTitle: string, rawDesc: string, canonicalUrl: string, extraTags: string = "", extraHtmlReplace\?: \(html: string\) => string\) \{([\s\S]*?)let template = "";/,
  `async function renderSeoPage(req: any, res: any, next: any, rawTitle: string, rawDesc: string, canonicalUrl: string, extraTags: string = "", extraHtmlReplace?: (html: string) => string) {
    try {
      const host = req.headers.host || 'www.desiredhub.xyz';
      const DYNAMIC_SITE_URL = host === 'desiredhub.xyz' ? 'https://www.desiredhub.xyz' : \`https://\${host}\`;
      canonicalUrl = canonicalUrl.replace(SITE_URL, DYNAMIC_SITE_URL);
      let template = "";`
);

// We should also replace the canonical logic inside formatSeo
// Wait, we don't need to replace in formatSeo, formatSeo receives canonicalUrl directly.

// What about category and video routes?
// Let's replace SITE_URL with DYNAMIC_SITE_URL in those routes, which we did partially, but some instances might be remaining.
serverCode = serverCode.replace(/const currentUrl = escapeHtml\(`\$\{SITE_URL\}\/video\/\$\{slug\}`\);/g, `const currentUrl = escapeHtml(\`\${DYNAMIC_SITE_URL}/video/\${slug}\`);`);
serverCode = serverCode.replace(/const currentUrl = escapeHtml\(`\$\{SITE_URL\}\/category\/\$\{slug\}`\);/g, `const currentUrl = escapeHtml(\`\${DYNAMIC_SITE_URL}/category/\${slug}\`);`);

fs.writeFileSync('server.ts', serverCode);
console.log('Patched renderSeoPage');
