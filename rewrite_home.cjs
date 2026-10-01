const fs = require('fs');

const homeContent = `import { useState, useMemo, useEffect, Fragment } from "react";
import { PromoWidget } from "../components/widgets/PromoWidget";
import { usePaginationVideos, PaginationFilter } from "../hooks/useVideos";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { ChevronDown, Play, Flame, Clock, TrendingUp } from "lucide-react";
import { usePublicCategories } from "../hooks/useCategories";
import { NavLink, useSearchParams, Link } from "react-router-dom";
import { SEO } from "../components/seo/SEO";
import { Pagination } from "../components/ui/Pagination";

type SortOption = {
  label: string;
  value: PaginationFilter["sortBy"];
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest", value: "publishedAt" },
  { label: "Best", value: "featured" },
  { label: "Most Viewed", value: "views" },
  { label: "Longest", value: "duration" },
  { label: "Random", value: "random" },
];

export function Home() {
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const [sortBy, setSortBy] = useState<PaginationFilter["sortBy"]>("publishedAt");
  const [isSortOpen, setIsSortOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
  } = usePaginationVideos(page, 20, { sortBy });

  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;

  const { data: rawCategories = [] } = usePublicCategories(false);

  const categories = useMemo(() => {
    return [...rawCategories]
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .slice(0, 20);
  }, [rawCategories]);

  const [randomVideos, setRandomVideos] = useState<any[]>([]);

  useEffect(() => {
    if (videos.length > 0 && randomVideos.length === 0) {
      const shuffled = [...videos].sort(() => 0.5 - Math.random());
      setRandomVideos(shuffled.slice(0, 4));
    }
  }, [videos, randomVideos.length]);

  const heroVideo = videos.length > 0 ? videos[0] : null;
  const gridVideos = videos.length > 1 ? videos.slice(1) : [];

  return (
    <div className="flex-1 pb-20 pt-2 sm:pt-6 bg-neutral-950">
      <SEO
        title="DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online"
        description="Watch free desi porn and hot Indian sex videos online at DesiredHub. Enjoy horny bhabhis, gorgeous desi girls, and raw adult entertainment in high quality."
        exactTitle={true}
        breadcrumbs={[{ name: "Home", item: "/" }]}
      />

      {/* Category Horizontal Navigation */}
      {categories.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide text-sm items-center">
            {categories.map((cat) => (
              <NavLink
                key={cat.id}
                to={\`/category/\${cat.slug}\`}
                className={({ isActive }) =>
                  \`whitespace-nowrap px-4 py-1.5 rounded-full font-medium transition-colors \${
                    isActive 
                      ? "bg-primary text-white" 
                      : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800"
                  }\`
                }
              >
                {cat.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {isError ? (
          <div className="text-center py-20 bg-neutral-900/50 rounded-xl border border-red-900/30">
            <p className="text-red-500 font-medium">
              Error loading videos. Please try again later.
            </p>
          </div>
        ) : !isLoading && videos.length === 0 ? (
          <div className="text-center py-28 bg-neutral-900/50 rounded-xl border border-neutral-800">
            <h2 className="text-2xl font-bold text-white mb-2">No videos found</h2>
            <p className="text-neutral-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* Premium Featured / Hero Video */}
            {!isLoading && heroVideo && page === 1 && (
              <div className="mb-10 sm:mb-12">
                <Link to={\`/video/\${heroVideo.slug}\`} className="group relative block aspect-video sm:aspect-[21/9] lg:aspect-[2.5/1] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 isolate">
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent z-10" />
                  <img 
                    src={heroVideo.thumbnailUrl} 
                    alt={heroVideo.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    loading="eager"
                  />
                  <div className="absolute bottom-0 left-0 p-4 sm:p-8 md:p-12 z-20 w-full max-w-4xl">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="bg-primary/90 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        Featured
                      </span>
                      {heroVideo.quality && (
                        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {heroVideo.quality}
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-3xl md:text-5xl font-bold text-white mb-2 sm:mb-4 line-clamp-2 leading-tight tracking-tight drop-shadow-md">
                      {heroVideo.title}
                    </h1>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-neutral-300 font-medium">
                      <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{heroVideo.duration}</span>
                      </div>
                      {heroVideo.views !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-primary" />
                          <span>{heroVideo.views.toLocaleString()} views</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 z-30 transition-opacity duration-300">
                    <div className="bg-primary text-white rounded-full p-5 shadow-[0_0_30px_rgba(229,9,20,0.5)] transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-8 h-8 fill-current translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Trending/Random Quick Row */}
            {!isLoading && randomVideos.length > 0 && page === 1 && (
              <div className="mb-10 sm:mb-12">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    Trending Now
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {randomVideos.map((video) => (
                    <VideoCard key={\`trending-\${video.id}\`} video={video} enablePreview={true} />
                  ))}
                </div>
              </div>
            )}

            {/* Main Video Grid */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-800 pb-4">
                <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                  {page === 1 ? "Newest Videos" : \`Page \${page} Videos\`}
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center justify-between w-full sm:w-auto gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                  >
                    <span>
                      Sort by: <span className="text-white ml-1">{SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}</span>
                    </span>
                    <ChevronDown className={\`w-4 h-4 \${isSortOpen ? "rotate-180 text-white" : "text-neutral-400"}\`} />
                  </button>
                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                      <div className="absolute right-0 mt-2 w-full sm:w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-20 py-1">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value || "none"}
                            onClick={() => {
                              setSortBy(option.value);
                              setIsSortOpen(false);
                            }}
                            className={\`w-full text-left px-4 py-2 text-sm font-medium transition-colors \${
                              sortBy === option.value
                                ? "bg-neutral-800 text-primary"
                                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                            }\`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {isLoading
                  ? Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
                  : gridVideos.map((video, index) => (
                      <Fragment key={video.id}>
                        <VideoCard video={video} priority={index < 4} enablePreview={true} />
                        {index === 3 && <PromoWidget />}
                      </Fragment>
                    ))}
              </div>
            </div>

            <Pagination currentPage={page} totalPages={totalPages} />
          </>
        )}
      </div>

      {/* SEO Text Block */}
      {!isLoading && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-8">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 sm:p-8">
            <h1 className="text-lg sm:text-xl font-bold text-white mb-3 tracking-tight">
              Premium Desi Porn & Hot Indian Videos
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-4xl">
              DesiredHub features a massive collection of the hottest desi sex videos, raw xxx porn, and premium adult entertainment. 
              Watch gorgeous Indian girls, horny bhabhis, and mature aunties in high quality. Videos play with smooth performance, 
              titles are displayed directly on clean thumbnails, and the entire platform is optimized for mobile viewing.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Home.tsx', homeContent);
