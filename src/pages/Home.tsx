import { useState } from 'react';
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';
import { VideoCard } from '../components/ui/VideoCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { ChevronDown } from 'lucide-react';
import { usePublicCategories } from '../hooks/useCategories';
import { NavLink } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { TelegramWelcomeCard } from '../components/ui/TelegramWelcomeCard';

type SortOption = {
  label: string;
  value: PaginationFilter['sortBy'];
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest', value: 'publishedAt' },
  { label: 'Best', value: 'featured' },
  { label: 'Most Viewed', value: 'views' },
  { label: 'Longest', value: 'duration' },
  { label: 'Random', value: 'random' },
];

export function Home() {
  const [sortBy, setSortBy] = useState<PaginationFilter['sortBy']>('publishedAt');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filter: PaginationFilter = {
    sortBy,
  };

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = usePaginationVideos(filter, 20);

  const videos = data?.pages.flat() || [];

  const { data: rawCategories = [] } = usePublicCategories(false);
  const categories = [...rawCategories]
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .slice(0, 20);

  return (
    <div className="flex-1 pb-20 pt-8 sm:pt-12">
      <SEO 
        title="DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online"
        description="Watch the latest premium viral sex videos with fast streaming and daily updates."
        exactTitle={true}
        breadcrumbs={[
          { name: "Home", item: "/" }
        ]}
      />
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="mb-10 sm:mb-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                Newest
              </h2>
              <div className="h-1.5 w-12 bg-primary rounded-full mt-3 opacity-90 shadow-[0_0_12px_rgba(229,9,20,0.6)]" />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center justify-between w-full sm:w-auto gap-3 px-5 py-2.5 bg-neutral-900/60 backdrop-blur-md border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80 rounded-full text-sm font-medium text-neutral-300 hover:text-white transition-all duration-300 shadow-sm hover:shadow-md group"
              >
                <span>Sort by: <span className="text-white ml-1">{SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}</span></span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSortOpen ? 'rotate-180 text-white' : 'text-neutral-400 group-hover:text-white'}`} />
              </button>

              {isSortOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-full sm:w-56 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl z-20 py-2 origin-top-right transition-all duration-200">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value || 'none'}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                          sortBy === option.value
                            ? 'bg-neutral-800/80 text-primary'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white hover:pl-6'
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
          
          {categories.length > 0 && (
            <div className="flex overflow-x-auto gap-6 pb-4 pt-2 scrollbar-hide text-[15px] font-medium items-center mask-image-fade-edges">
              {categories.map((cat, index) => (
                <div key={cat.id} className="flex items-center gap-6 shrink-0">
                  <NavLink 
                    to={`/category/${cat.slug}`} 
                    className={({ isActive }) => 
                      `whitespace-nowrap transition-all duration-300 hover:scale-105 active:scale-95 ${isActive ? 'text-primary font-semibold drop-shadow-[0_0_12px_rgba(229,9,20,0.5)]' : 'text-neutral-400 hover:text-white'}`
                    }
                  >
                    {cat.name}
                  </NavLink>
                  {index < categories.length - 1 && (
                    <span className="text-neutral-800/80 select-none text-[10px]">●</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {isError ? (
          <div className="text-center py-20 bg-neutral-900/20 backdrop-blur-sm rounded-3xl border border-red-900/30">
            <p className="text-red-500 font-medium tracking-wide">Error loading videos. Please try again later.</p>
          </div>
        ) : !isLoading && videos.length === 0 ? (
          <div className="text-center py-28 bg-neutral-900/20 backdrop-blur-sm rounded-3xl border border-neutral-800/50 shadow-inner">
            <div className="w-20 h-20 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <span className="text-3xl opacity-50">🎬</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">No videos found</h2>
            <p className="text-neutral-400 max-w-md mx-auto text-[15px]">
              There are currently no videos for this selection. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
              {isLoading ? (
                Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                videos.map((video, index) => (
                  <VideoCard key={video.id} video={video} priority={index < 4} />
                ))
              )}
              {isFetchingNextPage && (
                Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={`fetching-${i}`} />)
              )}
            </div>

            {hasNextPage && (
              <div className="mt-14 sm:mt-20 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-10 py-3.5 bg-primary/90 hover:bg-primary text-white font-medium tracking-wide rounded-full transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-[0_4px_14px_0_rgba(229,9,20,0.3)] hover:shadow-[0_6px_20px_rgba(229,9,20,0.4)] hover:-translate-y-0.5"
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
      
      <TelegramWelcomeCard />
    </div>
  );
}
