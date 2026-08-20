const fs = require('fs');
let content = fs.readFileSync('src/components/ui/VideoCard.tsx', 'utf8');

// Container
content = content.replace(/className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 isolate"/g, 'className="relative aspect-video rounded-lg overflow-hidden bg-neutral-900 shadow-sm isolate group-hover:shadow-md transition-shadow"');

// Title section
content = content.replace(/<div className="flex flex-col px-1 min-w-0 w-full gap-1\.5">/g, '<div className="flex flex-col mt-2 min-w-0 w-full gap-1">');

// Title text
content = content.replace(/text-\[15px\] sm:text-base font-semibold text-neutral-100 line-clamp-2 leading-snug group-hover:text-primary break-words tracking-tight/g, 'text-sm sm:text-[15px] font-semibold text-neutral-100 line-clamp-2 leading-tight group-hover:text-primary break-words');

// Views and date text
content = content.replace(/<div className="flex flex-wrap items-center text-\[13px\] text-neutral-400 font-medium">\s*<span>\{formatTimeAgo\(video.publishedAt\)\}<\/span>\s*<\/div>/g, `<div className="flex flex-wrap items-center text-xs sm:text-[13px] text-neutral-400 font-medium gap-1.5">
          <span>{formatTimeAgo(video.publishedAt)}</span>
          {video.views !== undefined && (
            <>
              <span className="text-neutral-600">•</span>
              <span>{video.views.toLocaleString()} views</span>
            </>
          )}
        </div>`);

// Duration Badge
content = content.replace(/absolute bottom-2\.5 right-2\.5 z-30 bg-black\/50 backdrop-blur-md border border-pure-white\/10 px-2 py-1 rounded-md text-\[11px\] font-semibold text-pure-white tracking-wide whitespace-nowrap/g, 'absolute bottom-2 right-2 z-30 bg-black/80 px-1.5 py-0.5 rounded text-[11px] font-medium text-pure-white whitespace-nowrap');

fs.writeFileSync('src/components/ui/VideoCard.tsx', content);
