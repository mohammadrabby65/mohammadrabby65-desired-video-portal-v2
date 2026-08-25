const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

// Container padding and gap
content = content.replace(
  'px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between',
  'px-2 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2'
);

// Left side gap
content = content.replace(
  '<div className="flex items-center gap-4 min-w-0 shrink">',
  '<div className="flex items-center gap-1 sm:gap-4 min-w-0 shrink">'
);

// Right side gap
content = content.replace(
  '<div className="flex items-center gap-2 sm:gap-4">',
  '<div className="flex items-center gap-1 sm:gap-4 shrink-0">'
);

// Logo sizes - white
content = content.replace(
  'className="h-10 sm:h-12 md:h-[50px] w-auto max-w-[150px] sm:max-w-[200px] md:max-w-none object-contain dark:hidden  relative z-10"',
  'className="h-7 sm:h-12 md:h-[50px] w-auto max-w-[110px] sm:max-w-[200px] md:max-w-none object-contain dark:hidden relative z-10"'
);

// Logo sizes - black
content = content.replace(
  'className="h-10 sm:h-12 md:h-[50px] w-auto max-w-[150px] sm:max-w-[200px] md:max-w-none object-contain hidden dark:block  drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] relative z-10"',
  'className="h-7 sm:h-12 md:h-[50px] w-auto max-w-[110px] sm:max-w-[200px] md:max-w-none object-contain hidden dark:block drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] relative z-10"'
);

// Random Video button
content = content.replace(
  'className="p-2 rounded-full group relative overflow-hidden flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 transition-transform duration-200"',
  'className="p-1 sm:p-2 rounded-full group relative overflow-hidden flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 transition-transform duration-200"'
);
content = content.replace(
  'className="bg-neutral-900/80 backdrop-blur-md p-2 rounded-full relative z-10 border border-neutral-800 group-hover:border-primary/50 transition-colors duration-300"',
  'className="bg-neutral-900/80 backdrop-blur-md p-1.5 sm:p-2 rounded-full relative z-10 border border-neutral-800 group-hover:border-primary/50 transition-colors duration-300"'
);

fs.writeFileSync('src/components/layout/Layout.tsx', content);
console.log("Patched Layout.tsx");
