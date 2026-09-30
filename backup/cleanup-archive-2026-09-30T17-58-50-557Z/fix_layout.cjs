const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

content = content.replace(/<div className="absolute inset-0 rounded-full bg-white\/5 opacity-0 group-hover:opacity-100\s*" \/>/g, '');
content = content.replace(/<div className="absolute -inset-2 bg-gradient-to-r from-primary\/20 to-accent\/20 rounded-full blur-xl opacity-0 group-hover:opacity-100\s*" \/>/g, '');
content = content.replace(/group-hover:brightness-110 transition-all/g, '');
content = content.replace(/group-hover:brightness-110 transition-all drop-shadow-\[0_0_8px_rgba\(255,255,255,0\.1\)\] group-hover:drop-shadow-\[0_0_12px_rgba\(255,255,255,0\.2\)\]/g, '');
content = content.replace(/group-hover:bg-transparent\s*border border-neutral-700\/50 group-hover:border-transparent shadow-sm/g, '');

fs.writeFileSync('src/components/layout/Layout.tsx', content);
