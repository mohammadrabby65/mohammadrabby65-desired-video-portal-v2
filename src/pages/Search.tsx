import { useSearchParams } from 'react-router-dom';
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';
import { VideoCard } from '../components/ui/VideoCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { SEO } from '../components/seo/SEO';

export function Search() {
  const [searchParams] = useSearchParams();
  const queryText = searchParams.get('q') || '';

  const filter: PaginationFilter = {
    searchQuery: queryText,
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

  return (
    <div className="flex-1 pb-20 pt-8 sm:pt-10">
      <SEO 
        title={`Search results for "${queryText}" - DesiredHub`}
        description={`Search results for "${queryText}" on DesiredHub.`}
        robots="noindex,follow"
      />
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 tracking-tight">
            Search Results for "{queryText}"
          </h2>
        </div>

        {isError ? (
          <div className="text-center py-12">
            <p className="text-red-500">Error loading search results. Please try again later.</p>
          </div>
        ) : !isLoading && videos.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
            <p className="text-neutral-400 max-w-md mx-auto">
              We couldn't find any videos matching "{queryText}". Try using different keywords.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
              {isLoading ? (
                Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                videos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))
              )}
              {isFetchingNextPage && (
                Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={`fetching-${i}`} />)
              )}
            </div>

            {hasNextPage && (
              <div className="mt-10 sm:mt-12 flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-10 py-3.5 bg-primary/90 hover:bg-primary text-white font-medium tracking-wide rounded-full transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-[0_4px_14px_0_rgba(229,9,20,0.3)] hover:shadow-[0_6px_20px_rgba(229,9,20,0.4)] hover:-translate-y-0.5"
                >
                  {isFetchingNextPage ? (
                    <span className="flex items-center justify-center gap-2">
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
    </div>
  );
}
