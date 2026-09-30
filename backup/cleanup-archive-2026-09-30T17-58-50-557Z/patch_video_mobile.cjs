const fs = require('fs');
let code = fs.readFileSync('src/pages/Video.tsx', 'utf8');

// Change outer padding to be full width on mobile
code = code.replace(
  /<div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-\[1920px\] mx-auto pb-20 w-full overflow-x-hidden">/,
  '<div className="flex-1 min-w-0 sm:p-6 lg:p-8 max-w-[1920px] mx-auto pb-20 w-full overflow-x-hidden">'
);

// Add padding to the nav breadcrumbs on mobile
code = code.replace(
  /<nav className="flex text-neutral-400 text-\[13px\] font-medium mb-6 min-w-0 w-full overflow-hidden">/,
  '<nav className="flex text-neutral-400 text-[13px] font-medium mb-4 sm:mb-6 px-4 sm:px-0 min-w-0 w-full overflow-hidden">'
);

// Make the layout container not have padding on mobile
code = code.replace(
  /<div className=" flex flex-col lg:flex-row gap-6 min-w-0 w-full">/,
  '<div className="flex flex-col lg:flex-row gap-0 sm:gap-6 min-w-0 w-full">'
);

// Give the player square corners on mobile, rounded on sm+
code = code.replace(
  /<div className="rounded-2xl lg:rounded-\[24px\] overflow-hidden bg-black shadow-\[0_8px_30px_rgb\(0,0,0,0\.6\)\] border border-white\/5 ring-1 ring-white\/10 relative">/,
  '<div className="sm:rounded-2xl lg:rounded-[24px] overflow-hidden bg-black shadow-[0_8px_30px_rgb(0,0,0,0.6)] sm:border border-white/5 sm:ring-1 ring-white/10 relative w-full">'
);

// Add px-4 to Meta Info on mobile
code = code.replace(
  /<div className="mt-5 sm:mt-6 flex flex-col min-w-0 w-full px-1 lg:px-2">/,
  '<div className="mt-5 sm:mt-6 flex flex-col min-w-0 w-full px-4 sm:px-0 lg:px-2">'
);

// Add px-4 to Sidebar / Related Videos on mobile
code = code.replace(
  /<div className="w-full lg:w-\[400px\] xl:w-\[450px\]">/,
  '<div className="w-full lg:w-[400px] xl:w-[450px] px-4 sm:px-0 mt-6 lg:mt-0">'
);

fs.writeFileSync('src/pages/Video.tsx', code);
