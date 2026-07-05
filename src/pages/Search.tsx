import { useSearchParams } from 'react-router-dom';
import { usePaginationVideos, usePaginationCount, PaginationFilter } from '../hooks/useVideos';
import { VideoCard } from '../components/ui/VideoCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { SEO } from '../components/seo/SEO';
import { Pagination } from '../components/ui/Pagination';
import { getPageUrl } from '../lib/pagination';

export function Search() {
  const [searchParams] = useSearchParams();
  const queryText = searchParams.get('q') || '';
  const pageParam = searchParams.get('page');
  const currentPage = parseInt(pageParam || '1', 10);

  const filter: PaginationFilter = {
    searchQuery: queryText,
  };

  const { data: totalCount = 0 } = usePaginationCount(filter);
  const totalPages = Math.ceil(totalCount / 20);

  const {
    data: videos = [],
    isLoading,
    isError
  } = usePaginationVideos(filter, currentPage, 20);

  return (
    <div className="flex-1 pb-16 pt-8">
      <SEO 
        title={`Search results for "${queryText}"${currentPage > 1 ? ` - Page ${currentPage}` : ''} - DesiredHub`}
        description={`Search results for "${queryText}" on DesiredHub.`}
        prevUrl={currentPage > 1 ? getPageUrl('/search', currentPage - 1, searchParams) : undefined}
        nextUrl={currentPage < totalPages ? getPageUrl('/search', currentPage + 1, searchParams) : undefined}
      />
      <section className="container mx-auto px-4 mb-16">
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            Search Results for "{queryText}"
          </h2>
          <p className="text-neutral-400 mt-2">
            {totalCount} result{totalCount !== 1 ? 's' : ''} found
          </p>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
              {isLoading ? (
                Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                videos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))
              )}
            </div>

            {!isLoading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath="/search"
                searchParams={searchParams}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
