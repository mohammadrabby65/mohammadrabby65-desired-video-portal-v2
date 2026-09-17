const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// 1. In renderSeoPage (which is used for generic pages)
serverCode = serverCode.replace(
  /<link data-rh="true" rel="canonical" href="\$\{seo\.canonical\}" \/>/g,
  `<link data-rh="true" rel="canonical" href="\$\{seo.canonical\}" />
        <link data-rh="true" rel="alternate" hrefLang="en" href="\$\{seo.canonical.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://www.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="bn" href="\$\{seo.canonical.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://bd.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="hi" href="\$\{seo.canonical.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://hi.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="ar" href="\$\{seo.canonical.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://ar.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="x-default" href="\$\{seo.canonical.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://www.desiredhub.xyz/')\}" />`
);

// 2. In /category/:slug and /video/:slug which use currentUrl
serverCode = serverCode.replace(
  /<link data-rh="true" rel="canonical" href="\$\{currentUrl\}" \/>/g,
  `<link data-rh="true" rel="canonical" href="\$\{currentUrl\}" />
        <link data-rh="true" rel="alternate" hrefLang="en" href="\$\{currentUrl.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://www.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="bn" href="\$\{currentUrl.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://bd.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="hi" href="\$\{currentUrl.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://hi.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="ar" href="\$\{currentUrl.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://ar.desiredhub.xyz/')\}" />
        <link data-rh="true" rel="alternate" hrefLang="x-default" href="\$\{currentUrl.replace(/https:\\/\\/[a-z0-9.]+\\//, 'https://www.desiredhub.xyz/')\}" />`
);

// 3. Fix og:type in video route.
// Find the video route block, it has `const image = escapeHtml(video.thumbnailUrl || "");` and `og:type` is website.
// A simpler way is to replace `<meta data-rh="true" property="og:type" content="website" />` specifically around line 1124.
// Let's replace all `content="website"` with `content="${req.path.startsWith('/video/') ? 'video.other' : 'website'}"`
serverCode = serverCode.replace(
  /<meta data-rh="true" property="og:type" content="website" \/>/g,
  `<meta data-rh="true" property="og:type" content="\$\{req.originalUrl.startsWith('/video/') ? 'video.other' : 'website'\}" />`
);

fs.writeFileSync('server.ts', serverCode);
console.log('Patched server.ts SEO');
