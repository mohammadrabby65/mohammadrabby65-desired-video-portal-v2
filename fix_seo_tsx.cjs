const fs = require('fs');
const file = 'src/components/seo/SEO.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      <meta name="theme-color" content="#000000" />
      <meta name="robots" content={noIndex ? "noindex,nofollow" : "index,follow"} />
      
      {/* Favicons & Icons */}
      <link rel="icon" type="image/png" sizes="16x16" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="32x32" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="48x48" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="192x192" href={faviconUrl} />
      <link rel="icon" type="image/png" sizes="512x512" href={faviconUrl} />
      <link rel="apple-touch-icon" sizes="180x180" href={faviconUrl} />
      <link rel="manifest" href="/manifest.json" />`;

const replacement = `      <meta name="robots" content={noIndex ? "noindex,nofollow" : "index,follow"} />`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Fixed SEO.tsx successfully');
} else {
  console.log('Target not found in SEO.tsx');
}
