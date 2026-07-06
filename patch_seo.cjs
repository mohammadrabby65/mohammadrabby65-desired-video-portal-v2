const fs = require('fs');
const p = 'src/components/seo/SEO.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  `let currentPath = '';
  if (typeof window !== 'undefined') {
    currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    if (currentPath === '/search' && searchParams.has('q')) {
      currentPath += \`?q=\${encodeURIComponent(searchParams.get('q'))}\`;
    }
  }`,
  `let currentPath = '';
  if (typeof window !== 'undefined') {
    currentPath = window.location.pathname;
    if (currentPath === '/search') {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q');
      if (q) {
        const canonicalParams = new URLSearchParams();
        canonicalParams.set('q', q);
        currentPath += \`?\${canonicalParams.toString()}\`;
      }
    }
  }`
);

fs.writeFileSync(p, c);
