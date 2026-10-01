const fs = require('fs');
let content = fs.readFileSync('src/components/ads/AdsterraNativeBanner.tsx', 'utf8');

content = content.replace(
  '<div className="w-full col-span-full flex justify-center items-center my-4 overflow-hidden min-h-[100px]">',
  '<div className="w-full col-span-full flex justify-center items-center my-4 overflow-hidden min-h-[100px] bg-neutral-900/40 rounded-2xl border border-neutral-800/50">'
);
fs.writeFileSync('src/components/ads/AdsterraNativeBanner.tsx', content);
