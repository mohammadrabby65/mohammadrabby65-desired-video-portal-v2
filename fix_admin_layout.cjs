const fs = require('fs');
const file = 'src/components/admin/AdminLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<img 
              src="https://i.ibb.co.com/fV4JS3LH/20260701-143429.png" 
              alt="DESIRED" 
              className="h-6 w-auto object-contain"
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

// There are two instances in AdminLayout.tsx
// I should use the correct height (h-6 originally, but I'll update it to h-10 md:h-[52px] as requested, but wait! The AdminLayout header is "h-16 flex items-center px-6".
// A height of h-[52px] fits in h-16 (64px) with 6px padding on top and bottom, which is fine.
// But wait, the first one has a badge "Admin" next to it. Let's see how it looks if we just use h-8 md:h-[42px] or stick to h-6.
// The prompt says "Ensure the header logo scales correctly: Desktop height: approximately 52-56px, Mobile height: approximately 38-42px".
// That probably applies to all header logos. I will apply it here too.

content = content.replaceAll(target, replacement);

// Update title and description strings
content = content.replace(/Admin Dashboard - Desired/g, 'Admin Dashboard - DesiredHub');
content = content.replace(/Desired admin control panel/g, 'DesiredHub admin control panel');

fs.writeFileSync(file, content);
console.log('Fixed AdminLayout.tsx successfully');
