const fs = require('fs');
let code = fs.readFileSync('src/components/video/VideoGallery.tsx', 'utf8');

const replacement = `<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-4 pt-2 px-1">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => openLightbox(idx)}
            className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer border border-neutral-800/50 hover:border-neutral-600 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.7)] bg-neutral-900 active:scale-[0.98] transition-all"
            aria-label={\`View image \${idx + 1} of \${images.length}\`}
          >
            <div className="absolute inset-0 bg-neutral-800/50" />
            <img
              src={img}
              alt={\`Gallery image \${idx + 1}\`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          </button>
        ))}
      </div>`;

const target = code.match(/<div className="flex overflow-x-auto gap-4 sm:gap-5 pb-4 pt-2 scrollbar-hide snap-x snap-mandatory scroll-smooth px-2 -mx-2">[\s\S]*?<\/div>/)[0];
code = code.replace(target, replacement);

fs.writeFileSync('src/components/video/VideoGallery.tsx', code);
