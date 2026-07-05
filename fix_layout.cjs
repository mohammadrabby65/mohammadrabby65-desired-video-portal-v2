const fs = require('fs');
const file = 'src/components/layout/Layout.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<img 
                src="https://i.ibb.co.com/fV4JS3LH/20260701-143429.png" 
                alt="DESIRED" 
                className="h-[58px] md:h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />`;

const replacement = `<img 
                src="https://i.ibb.co.com/ZzT2wvV0/Header-Logo-White-Version.png" 
                alt="DesiredHub" 
                className="h-10 md:h-[52px] w-auto object-contain dark:hidden"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://i.ibb.co.com/SwNGJTLW/Header-Logo-black-Version.png" 
                alt="DesiredHub" 
                className="h-10 md:h-[52px] w-auto object-contain hidden dark:block"
                referrerPolicy="no-referrer"
              />`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
} else {
  // Try regex in case of spacing issues
  content = content.replace(/<img[^>]*alt="DESIRED"[^>]*className="h-\[58px\] md:h-8 w-auto object-contain"[^>]*\/>/g, replacement);
}

// Update the footer text
content = content.replace(/DESIRED\. All rights reserved\./g, 'DesiredHub. All rights reserved.');

fs.writeFileSync(file, content);
console.log('Fixed Layout.tsx successfully');
