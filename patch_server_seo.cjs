const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const hreflangHelper = `
  function generateHreflangTags(originalUrl) {
    const baseUrl = (host) => \`https://\${host}\${originalUrl}\`;
    
    // We assume the base host (e.g. desiredhub.xyz)
    // Actually we can just use SITE_URL and replace www. with the respective subdomain.
    const baseDomain = SITE_URL.replace('https://www.', '').replace('https://', '');
    
    return \`
      <link rel="alternate" hreflang="en" href="https://www.\${baseDomain}\${originalUrl}" />
      <link rel="alternate" hreflang="bn-BD" href="https://bd.\${baseDomain}\${originalUrl}" />
      <link rel="alternate" hreflang="hi" href="https://hi.\${baseDomain}\${originalUrl}" />
      <link rel="alternate" hreflang="ar" href="https://ar.\${baseDomain}\${originalUrl}" />
      <link rel="alternate" hreflang="x-default" href="https://www.\${baseDomain}\${originalUrl}" />
    \`;
  }
`;

// Insert the helper before renderSeoPage
server = server.replace('async function renderSeoPage', hreflangHelper + '\n  async function renderSeoPage');

// Modify renderSeoPage to inject hreflang tags
server = server.replace(
  'const seo = formatSeo(rawTitle, rawDesc, canonicalUrl);',
  'const seo = formatSeo(rawTitle, rawDesc, canonicalUrl);\n      const hreflangTags = generateHreflangTags(req.originalUrl);'
);

server = server.replace(
  '${extraTags}',
  '${extraTags}\n        ${hreflangTags}'
);

fs.writeFileSync('server.ts', server);
console.log('Patched server.ts with hreflang tags.');
