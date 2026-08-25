const fs = require('fs');
let content = fs.readFileSync('src/components/layout/LiveSearch.tsx', 'utf8');

content = content.replace(
  'className="p-2.5 rounded-full transition-all duration-200 group relative"',
  'className="p-1.5 sm:p-2.5 rounded-full transition-all duration-200 group relative"'
);

content = content.replace(
  '<SearchIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white relative z-10 transition-colors" />',
  '<SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white relative z-10 transition-colors" />'
);

fs.writeFileSync('src/components/layout/LiveSearch.tsx', content);
console.log("Patched LiveSearch.tsx");
