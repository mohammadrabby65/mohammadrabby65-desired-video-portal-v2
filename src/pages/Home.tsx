import { useState, useMemo, useEffect } from "react";
import { usePaginationVideos, useTrendingVideos, PaginationFilter } from "../hooks/useVideos";
import { VideoCard, useCardPreview, VideoPreview } from "../components/ui/VideoCard";
import { SkeletonCard, HeroSpotlightSkeleton } from "../components/ui/SkeletonCard";
import { ChevronDown, Play, Flame, Clock, TrendingUp, ArrowRight, RotateCcw } from "lucide-react";
import { usePublicCategories } from "../hooks/useCategories";
import { NavLink, useSearchParams, Link } from "react-router-dom";
import { SEO } from "../components/seo/SEO";
import { Pagination } from "../components/ui/Pagination";
import { formatTimeAgo } from "../lib/utils";

type SortOption = {
  label: string;
  heading: string;
  value: PaginationFilter["sortBy"];
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Newest", heading: "Newest Videos", value: "publishedAt" },
  { label: "Best", heading: "Best Videos", value: "featured" },
  { label: "Most Viewed", heading: "Most Viewed Videos", value: "views" },
  { label: "Longest", heading: "Longest Videos", value: "duration" },
  { label: "Random", heading: "Random Videos", value: "random" },
];

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const [sortBy, setSortBy] = useState<PaginationFilter["sortBy"]>("publishedAt");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = usePaginationVideos({ sortBy }, 20, page);

  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total;

  const { data: rawCategories = [], isLoading: isCategoriesLoading } = usePublicCategories(false);

  const categories = useMemo(() => {
    return [...rawCategories]
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .slice(0, 20);
  }, [rawCategories]);

  const { data: trendingData, isLoading: isTrendingLoading } = useTrendingVideos(4);

  const trendingPosts = useMemo(() => {
    return (trendingData?.videos || []).filter((post) => post.trending === true);
  }, [trendingData?.videos]);

  // Only promote videos[0] to the hero spotlight on Page 1 when there are videos.
  // On Page 2+ (or when only 1 video exists), keep all returned videos in the catalog grid.
  const showHero = page === 1 && videos.length > 0;
  const heroVideo = showHero ? videos[0] : null;
  const gridVideos = page === 1 && videos.length > 1 ? videos.slice(1) : videos;

  const {
    containerRef: heroContainerRef,
    isPreviewing: isHeroPreviewing,
    handlePointerEnter: handleHeroPointerEnter,
    handlePointerLeave: handleHeroPointerLeave,
    handleStopPreview: handleHeroStopPreview,
    handleCycleComplete: handleHeroCycleComplete,
  } = useCardPreview(heroVideo?.videoUrl, Boolean(heroVideo));

  useEffect(() => {
    setHeroImgError(false);
  }, [heroVideo?.id, heroVideo?.thumbnailUrl]);

  const activeSortOption = SORT_OPTIONS.find((opt) => opt.value === sortBy) || SORT_OPTIONS[0];

  const handleSortChange = (nextSort: PaginationFilter["sortBy"]) => {
    setSortBy(nextSort);
    setIsSortOpen(false);
    if (page !== 1) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("page");
      setSearchParams(nextParams);
    }
  };

  const handleResetFilters = () => {
    setSortBy("publishedAt");
    setIsSortOpen(false);
    if (searchParams.has("page")) {
      setSearchParams({});
    }
  };

  return (
    <div className="flex-1 pb-10 sm:pb-16 pt-1.5 sm:pt-5 bg-neutral-950">
      <SEO
        title="DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online"
        description="Watch free desi porn and hot Indian sex videos online at DesiredHub. Enjoy horny bhabhis, gorgeous desi girls, and raw adult entertainment in high quality."
        exactTitle={true}
        breadcrumbs={[{ name: "Home", item: "/" }]}
      />

      {/* Category Horizontal Discovery Rail */}
      <nav aria-label="Categories" className="container mx-auto px-3 sm:px-6 lg:px-8 mb-2 sm:mb-7">
        <div className="relative flex items-center">
          <div className="flex overflow-x-auto gap-1.5 sm:gap-2 pb-0.5 sm:pb-1 scrollbar-hide text-[11px] sm:text-[13px] items-center w-full">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `whitespace-nowrap min-h-[30px] sm:min-h-[38px] px-2.5 sm:px-4 inline-flex items-center rounded-lg sm:rounded-xl font-semibold transition-colors shrink-0 ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-white/[0.08]"
                }`
              }
            >
              All Videos
            </NavLink>

            {isCategoriesLoading && categories.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[30px] sm:h-[38px] w-18 sm:w-24 rounded-lg sm:rounded-xl bg-neutral-900 border border-white/[0.06] animate-pulse shrink-0"
                  />
                ))
              : categories.map((cat) => (
                  <NavLink
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className={({ isActive }) =>
                      `whitespace-nowrap min-h-[30px] sm:min-h-[38px] px-2.5 sm:px-4 inline-flex items-center rounded-lg sm:rounded-xl font-medium transition-colors shrink-0 ${
                        isActive
                          ? "bg-primary text-white shadow-xs"
                          : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-white/[0.08]"
                      }`
                    }
                  >
                    {cat.name}
                  </NavLink>
                ))}

            <Link
              to="/categories"
              className="whitespace-nowrap min-h-[30px] sm:min-h-[38px] px-2.5 sm:px-4 inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl font-semibold text-neutral-300 hover:text-white bg-neutral-900/60 hover:bg-neutral-800 border border-white/[0.08] transition-colors shrink-0 ml-auto"
            >
              <span>All Categories</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Area - Completely Ad-Free */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        {isError ? (
          <div className="text-center py-16 sm:py-20 px-4 bg-neutral-900/50 rounded-2xl border border-red-900/30 max-w-xl mx-auto my-6">
            <p className="text-red-400 font-semibold text-base sm:text-lg mb-2">
              Unable to load videos right now
            </p>
            <p className="text-neutral-400 text-xs sm:text-sm mb-6">
              Please check your connection and try refreshing the catalog.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-primary hover:bg-accent text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        ) : !isLoading && videos.length === 0 ? (
          <div className="text-center py-20 sm:py-24 px-4 bg-neutral-900/50 rounded-2xl border border-white/[0.08] max-w-xl mx-auto my-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No videos found</h2>
            <p className="text-neutral-400 text-xs sm:text-sm mb-6">
              No videos matched the selected sort or page view.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors border border-white/10 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Newest</span>
            </button>
          </div>
        ) : (
          <>
            {/* Compact 16:9 Split Spotlight Hero (Page 1 Only) */}
            {page === 1 && (
              <section aria-label="Featured Video" className="mb-3 sm:mb-8 lg:mb-10">
                {isLoading ? (
                  <HeroSpotlightSkeleton />
                ) : (
                  heroVideo && (
                    <Link
                      to={`/video/${heroVideo.slug}`}
                      onPointerEnter={handleHeroPointerEnter}
                      onPointerLeave={handleHeroPointerLeave}
                      onClick={() => handleHeroStopPreview(false)}
                      className="group grid grid-cols-1 lg:grid-cols-12 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-900 border border-white/[0.08] hover:border-white/20 transition-all duration-300 isolate shadow-md sm:shadow-xl"
                    >
                      {/* Left 7 Columns on Desktop / Compact 154px 16:9 Crop Banner on Mobile */}
                      <div
                        ref={heroContainerRef}
                        className="lg:col-span-7 relative w-full h-[154px] sm:h-[190px] lg:h-auto lg:aspect-video bg-neutral-950 overflow-hidden"
                      >
                        {isHeroPreviewing && heroVideo.videoUrl && (
                          <VideoPreview
                            videoUrl={heroVideo.videoUrl}
                            onStop={handleHeroStopPreview}
                            onCycleComplete={handleHeroCycleComplete}
                          />
                        )}
                        {!heroImgError && heroVideo.thumbnailUrl ? (
                          <img
                            src={heroVideo.thumbnailUrl}
                            alt={heroVideo.title}
                            onError={() => setHeroImgError(true)}
                            className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                            loading="eager"
                            {...({ fetchPriority: "high" } as any)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
                            <Play className="w-9 h-9 sm:w-12 sm:h-12 text-neutral-600 fill-neutral-600" />
                          </div>
                        )}

                        {/* Subtle Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25 lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-neutral-900/90 pointer-events-none z-10" />

                        {/* Center Play Button on Thumbnail */}
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                          <div className="bg-black/60 group-hover:bg-primary/90 backdrop-blur-md border border-white/20 text-white rounded-full p-2 sm:p-4 transform group-hover:scale-105 transition-all duration-200 shadow-lg">
                            <Play className="w-4 h-4 sm:w-7 sm:h-7 fill-current translate-x-0.5" />
                          </div>
                        </div>

                        {/* Duration Pill inside frame */}
                        {heroVideo.duration && (
                          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-20 bg-black/85 backdrop-blur-xs border border-white/15 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-semibold text-white tabular-nums flex items-center gap-1 sm:gap-1.5 shadow-sm">
                            <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-neutral-300" />
                            <span>{heroVideo.duration}</span>
                          </div>
                        )}
                      </div>

                      {/* Right 5 Columns: Compact Mobile & Editorial Desktop Spotlight Metadata Panel */}
                      <div className="lg:col-span-5 px-3 py-2 sm:p-5 lg:p-8 flex flex-col justify-between gap-1.5 sm:gap-4 bg-gradient-to-b from-neutral-900 to-neutral-900/95">
                        <div className="space-y-1 sm:space-y-3 lg:space-y-4">
                          {/* Featured Label & Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="bg-primary px-1.5 sm:px-2.5 py-0.5 rounded text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-white leading-none sm:leading-normal">
                              Featured Spotlight
                            </span>
                            {heroVideo.quality && (
                              <span className="bg-white/[0.08] border border-white/10 text-white text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 rounded uppercase tracking-wider leading-none sm:leading-normal">
                                {heroVideo.quality}
                              </span>
                            )}
                            {heroVideo.categoryName && (
                              <span className="text-[10px] sm:text-xs font-medium text-neutral-400">
                                · {heroVideo.categoryName}
                              </span>
                            )}
                          </div>

                          {/* Featured Title (Limited to 2 lines on mobile) */}
                          <h2 className="text-[13.5px] sm:text-xl lg:text-[26px] font-bold text-white line-clamp-2 lg:line-clamp-3 leading-[1.25] sm:leading-snug tracking-tight group-hover:text-primary transition-colors">
                            {heroVideo.title}
                          </h2>

                          {/* Views, Published Time & Duration Metadata Row */}
                          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1.5 text-[11px] sm:text-[13px] text-neutral-400 font-medium tabular-nums">
                            <span>{formatTimeAgo(heroVideo.publishedAt)}</span>
                            {heroVideo.views !== undefined && (
                              <>
                                <span className="text-neutral-600" aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 text-neutral-300">
                                  <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                                  {heroVideo.views.toLocaleString()} views
                                </span>
                              </>
                            )}
                            {heroVideo.duration && (
                              <>
                                <span className="text-neutral-600" aria-hidden="true">·</span>
                                <span>{heroVideo.duration}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Compact Watch Video Button */}
                        <div className="pt-0.5 lg:pt-2">
                          <span className="h-7 sm:min-h-[44px] px-2.5 sm:px-5 py-1 sm:py-2.5 rounded-md sm:rounded-xl bg-primary group-hover:bg-accent text-white font-semibold text-[11px] sm:text-sm inline-flex items-center gap-1.5 sm:gap-2 transition-colors shadow-xs">
                            <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                            <span>Watch Video</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </section>
            )}

            {/* Trending Quick Row (Page 1 Only) */}
            {page === 1 && (isTrendingLoading || trendingPosts.length > 0) && (
              <section aria-label="Trending Videos" className="mb-4 sm:mb-10">
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-5">
                  <h2 className="text-[15px] sm:text-xl font-bold text-white flex items-center gap-1.5 sm:gap-2 tracking-tight min-w-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                    <span className="truncate">Trending Now</span>
                  </h2>
                  <Link
                    to="/category/trending"
                    className="text-[11px] sm:text-sm font-semibold text-neutral-300 hover:text-primary inline-flex items-center gap-1 transition-colors py-0.5 sm:py-1 shrink-0 whitespace-nowrap"
                  >
                    <span>Explore Trending</span>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                  {isTrendingLoading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`trending-skel-${i}`} />)
                    : trendingPosts.map((video) => (
                        <VideoCard key={`trending-${video.id}`} video={video} enablePreview={true} />
                      ))}
                </div>
              </section>
            )}

            {/* Main Video Catalog Grid */}
            <section aria-label="Video Catalog" className="mb-8">
              <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-6 border-b border-white/[0.08] pb-2.5 sm:pb-4">
                <div className="flex items-baseline gap-2.5 min-w-0">
                  <h2 className="text-[15px] sm:text-xl font-bold text-white tracking-tight truncate">
                    {page === 1 ? activeSortOption.heading : `Page ${page} Videos`}
                  </h2>
                  {!isLoading && totalCount !== undefined && totalCount > 0 && (
                    <span className="text-xs font-medium text-neutral-500 tabular-nums hidden sm:inline">
                      ({totalCount.toLocaleString()})
                    </span>
                  )}
                </div>

                {/* Desktop Inline Sort Tabs */}
                <div
                  role="tablist"
                  aria-label="Sort videos"
                  className="hidden md:flex items-center bg-neutral-900 p-1 rounded-xl border border-white/[0.08]"
                >
                  {SORT_OPTIONS.map((option) => {
                    const isSelected = sortBy === option.value;
                    return (
                      <button
                        key={option.value || "none"}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => handleSortChange(option.value)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white shadow-xs"
                            : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile Sort Dropdown */}
                <div className="relative md:hidden shrink-0">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isSortOpen}
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="min-h-[32px] sm:min-h-[40px] flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-2 bg-neutral-900 border border-white/[0.08] hover:bg-neutral-800 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                  >
                    <span>
                      Sort: <span className="text-white ml-0.5">{activeSortOption.label}</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180 text-white" : "text-neutral-400"}`} />
                  </button>
                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                      <div
                        role="listbox"
                        aria-label="Sort videos"
                        className="absolute right-0 mt-1.5 w-44 bg-neutral-900 border border-white/[0.1] rounded-xl shadow-2xl z-20 py-1 overflow-hidden"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value || "none"}
                            type="button"
                            role="option"
                            aria-selected={sortBy === option.value}
                            onClick={() => handleSortChange(option.value)}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${
                              sortBy === option.value
                                ? "bg-neutral-800 text-primary"
                                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-5">
                {isLoading
                  ? Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
                  : gridVideos.map((video, index) => (
                      <VideoCard key={video.id} video={video} priority={index < 4} enablePreview={true} />
                    ))}
              </div>
            </section>

            <Pagination currentPage={page} totalPages={totalPages} />
          </>
        )}
      </div>

      {/* Clean SEO Text Section */}
      {!isLoading && (
        <section aria-label="About DesiredHub" className="container mx-auto px-3 sm:px-6 lg:px-8 mt-8 sm:mt-14 mb-4 sm:mb-6">
          <div className="bg-neutral-900/40 border border-white/[0.07] rounded-xl sm:rounded-2xl p-4 sm:p-7">
            <h1 className="text-sm sm:text-lg font-bold text-white mb-1.5 sm:mb-2 tracking-tight">
              Premium Desi Porn & Hot Indian Videos
            </h1>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-4xl">
              DesiredHub features a collection of desi sex videos, adult entertainment, and trending clips.
              Watch high-quality Indian videos with smooth playback, clear thumbnails, and complete mobile optimization.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;
