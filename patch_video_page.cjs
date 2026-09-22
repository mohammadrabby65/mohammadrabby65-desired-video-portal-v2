const fs = require('fs');
let code = fs.readFileSync('src/pages/Video.tsx', 'utf8');

const importRegex = /import \{\s*ThumbsUp,\s*Heart,\s*Share2,\s*Tag,\s*Flag,\s*Copy,\s*ChevronLeft,\s*ChevronRight,\s*Download,\s*\}\s*from "lucide-react";/;
code = code.replace(importRegex, `import {
  ThumbsUp,
  Share2,
  Flag,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Clock,
  Calendar,
  MoreVertical
} from "lucide-react";`);

// Main replacement
const startMain = '<div className="flex-1 max-w-[1400px] min-w-0">';
const endMain = '          {/* Sidebar / Related Videos */}';

const startIndex = code.indexOf(startMain);
const endIndex = code.indexOf(endMain);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `<div className="flex-1 max-w-[1400px] min-w-0">
            {/* Premium Player Container */}
            <div className="rounded-2xl lg:rounded-[24px] overflow-hidden bg-black shadow-[0_8px_30px_rgb(0,0,0,0.6)] border border-white/5 ring-1 ring-white/10 relative">
              <div className="relative w-full aspect-video bg-black">
                <VideoPlayer
                  videoId={video.id}
                  videoUrl={video.videoUrl}
                  thumbnailUrl={video.thumbnailUrl}
                />
              </div>
            </div>

            {/* Video Meta Info */}
            <div className="mt-5 sm:mt-6 flex flex-col min-w-0 w-full px-1 lg:px-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight break-words tracking-tight">
                {video.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[13px] sm:text-[14px] text-neutral-400 font-medium mt-3 pb-4 border-b border-white/10">
                {video.views !== undefined && (
                  <span className="flex items-center gap-1.5 text-neutral-300 font-semibold bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                    <Eye className="w-4 h-4 text-neutral-500" />
                    {video.views.toLocaleString()} views
                  </span>
                )}
                {video.duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {video.duration}
                  </span>
                )}
                {video.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatTimeAgo(video.publishedAt)}
                  </span>
                )}
                {video.quality && (
                  <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ml-auto sm:ml-0">
                    {video.quality}
                  </span>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-4">
                <button className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Like</span>
                </button>
                <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <a
                  href="https://predestineheadypleasure.com/wbunjk6rq?key=53693a97cb2d7fe1805610bc89cca2ab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-red-600 hover:bg-red-500 rounded-full text-[13px] sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-red-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  onClick={handleReport}
                  className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-500 hover:text-red-500 transition-colors ml-auto"
                  title="Report Video"
                >
                  <Flag className="w-4 h-4" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              </div>

              {/* Gallery (If exists) */}
              {video.gallery && video.gallery.length > 0 && (
                <div className="mt-2 mb-6">
                  <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-2">Video Gallery</h3>
                  <VideoGallery images={video.gallery} />
                </div>
              )}

              {/* Collapsible Description & Tags */}
              <div className="bg-neutral-900/40 backdrop-blur-md border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-inner mt-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {video.badges?.map((badge) => (
                    <span
                      key={badge}
                      className="bg-primary/20 border border-primary/30 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm uppercase"
                    >
                      {badge}
                    </span>
                  ))}
                  {(video.categories
                    ? video.categories
                    : (video as any).category
                      ? [(video as any).category]
                      : []
                  ).map((cat) => (
                    <Link
                      key={cat}
                      to={\`/category/\${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}\`}
                    >
                      <span className="bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors shadow-sm inline-flex">
                        {cat}
                      </span>
                    </Link>
                  ))}
                  {video.tags && (
                    <>
                      {(isTagsExpanded
                        ? video.tags
                        : video.tags.slice(0, 8)
                      ).map((tag) => (
                        <Link
                          to={\`/tag/\${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}\`}
                          key={tag}
                          className="text-neutral-500 hover:text-neutral-300 bg-transparent px-2 py-1 rounded-full text-[13px] font-medium transition-colors inline-flex"
                        >
                          #{tag}
                        </Link>
                      ))}
                      {!isTagsExpanded && video.tags.length > 8 && (
                        <button
                          onClick={() => setIsTagsExpanded(true)}
                          className="text-neutral-500 hover:text-white px-2 py-1 rounded-full text-[13px] font-medium transition-colors inline-flex"
                        >
                          +{video.tags.length - 8} More
                        </button>
                      )}
                    </>
                  )}
                </div>
                
                <div className="relative">
                  <p className={\`text-neutral-300 text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words \${!isTagsExpanded ? 'line-clamp-3' : ''}\`}>
                    {video.description}
                  </p>
                  {!isTagsExpanded && video.description && video.description.length > 150 && (
                    <button onClick={() => setIsTagsExpanded(true)} className="text-white font-semibold text-[14px] mt-1 hover:underline">
                      Show more
                    </button>
                  )}
                  {isTagsExpanded && video.description && video.description.length > 150 && (
                    <button onClick={() => setIsTagsExpanded(false)} className="text-white font-semibold text-[14px] mt-2 hover:underline">
                      Show less
                    </button>
                  )}
                </div>
              </div>

              {/* Prev / Next */}
              {adjacent && (adjacent.prev || adjacent.next) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {adjacent.next ? (
                    <Link
                      to={\`/video/\${adjacent.next.slug}\`}
                      className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/5 p-4 sm:p-5 rounded-2xl group transition-all shadow-sm"
                    >
                      <div className="bg-white/5 group-hover:bg-white/10 p-2 rounded-full shrink-0 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500 mb-1 tracking-wider uppercase">
                          Previous Video
                        </div>
                        <div className="text-[14px] sm:text-[15px] font-semibold text-neutral-200 group-hover:text-white truncate">
                          {adjacent.next.title}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div></div>
                  )}
                  {adjacent.prev ? (
                    <Link
                      to={\`/video/\${adjacent.prev.slug}\`}
                      className="flex items-center justify-end text-right gap-4 bg-white/5 hover:bg-white/10 border border-white/5 p-4 sm:p-5 rounded-2xl group transition-all shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500 mb-1 tracking-wider uppercase">
                          Next Video
                        </div>
                        <div className="text-[14px] sm:text-[15px] font-semibold text-neutral-200 group-hover:text-white truncate">
                          {adjacent.prev.title}
                        </div>
                      </div>
                      <div className="bg-white/5 group-hover:bg-white/10 p-2 rounded-full shrink-0 transition-colors">
                        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                      </div>
                    </Link>
                  ) : (
                    <div></div>
                  )}
                </div>
              )}
            </div>
          </div>\n`;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/pages/Video.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Failed to find boundaries");
}
