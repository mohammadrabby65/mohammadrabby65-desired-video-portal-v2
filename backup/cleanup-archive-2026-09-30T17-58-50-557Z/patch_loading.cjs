const fs = require('fs');
let code = fs.readFileSync('src/components/video/VideoPlayer.tsx', 'utf8');

const oldLoading = `{loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="w-10 h-10 text-red-500 " />
        </div>
      )}`;

const newLoading = `{loading && !playError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 backdrop-blur-sm transition-opacity duration-300" aria-label="Loading video">
          <div className="relative flex items-center justify-center w-20 h-20 mb-6">
            {/* Expanding Pulse Rings */}
            <div className="absolute inset-0 rounded-full border border-primary/60 animate-desired-ring-1"></div>
            <div className="absolute inset-0 rounded-full border border-primary/40 animate-desired-ring-2"></div>
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-desired-ring-3"></div>
            
            {/* Rotating Progress Ring */}
            <div className="absolute -inset-2 rounded-full border border-transparent border-t-primary/80 border-l-primary/30 animate-desired-spin"></div>
            
            {/* Center Play Emblem */}
            <div className="relative w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.6)] animate-desired-glow">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-white/90 text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase">
              Loading Video
            </span>
            <div className="flex gap-1 text-primary text-sm sm:text-base leading-none">
              <span className="animate-desired-dot-1">•</span>
              <span className="animate-desired-dot-2">•</span>
              <span className="animate-desired-dot-3">•</span>
            </div>
          </div>
        </div>
      )}`;

if (code.includes(oldLoading)) {
  code = code.replace(oldLoading, newLoading);
  fs.writeFileSync('src/components/video/VideoPlayer.tsx', code);
  console.log("Patched successfully");
} else {
  // Try regex in case of formatting differences
  const regex = /\{loading && \(\s*<div className="absolute inset-0 flex items-center justify-center bg-black\/50 z-10">\s*<Loader2 className="w-10 h-10 text-red-500 " \/>\s*<\/div>\s*\)\}/m;
  if (regex.test(code)) {
    code = code.replace(regex, newLoading);
    fs.writeFileSync('src/components/video/VideoPlayer.tsx', code);
    console.log("Patched successfully via regex");
  } else {
    console.log("Could not find the target string.");
  }
}
