import { useState } from 'react';
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';
import { VideoCard } from '../components/ui/VideoCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { ChevronDown } from 'lucide-react';
import { SEO } from '../components/seo/SEO';
import { TelegramPopup } from '../components/ui/TelegramPopup';

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
    data: videos = [],
    isLoading,
    isError
  } = usePaginationVideos(filter, 1, 20);

  return (
    <div className="flex-1 pb-16 pt-8">
      <SEO 
        title="DesiredHub - Free Desi Porn & Hot Indian Sex Videos Online"
        description="Watch the latest premium viral sex videos with fast streaming and daily updates."
        exactTitle={true}
      />
      <TelegramPopup />
      <section className="container mx-auto px-4 mb-16">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Newest
            </h2>
            
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                Sort by: {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {isSortOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-20 py-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value || 'none'}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
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
        </div>

        {isError ? (
          <div className="text-center py-12">
            <p className="text-red-500">Error loading videos. Please try again later.</p>
          </div>
        ) : !isLoading && videos.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎬</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No videos found</h2>
            <p className="text-neutral-400 max-w-md mx-auto">
              There are currently no videos for this selection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
            {isLoading ? (
              Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              videos.map(video => (
                <VideoCard key={video.id} video={video} />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
