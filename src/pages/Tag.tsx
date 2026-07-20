import { useParams } from "react-router-dom";
import { SEO } from "../components/seo/SEO";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { Helmet } from "react-helmet-async";
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';

export function Tag() {
  const { slug } = useParams<{ slug: string }>();

  // Tag slug to normal string (e.g., action-movies -> action movies)
  const tagTitle = slug ? slug.replace(/-/g, " ") : "Tag";

  const filter: PaginationFilter = {
    tag: tagTitle,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Videos tagged with ${tagTitle}`,
    description: `Browse the best videos tagged with ${tagTitle}.`,
    url: typeof window !== "undefined" ? window.location.href : "",
  };

  const formattedTagName = tagTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="flex-1 pb-20 pt-8 sm:pt-10">
      <SEO
        title={`${formattedTagName} Videos - DesiredHub`}
        description={`Watch the latest and best videos tagged with ${tagTitle}.`}
        exactTitle={true}
        jsonLd={jsonLd}
        breadcrumbs={[
          { name: "Home", item: "/" },
          { name: `#${tagTitle}`, item: `/tag/${slug}` }
        ]}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
          #{tagTitle}
        </h1>
      </div>

      {isError ? (
        <div className="text-center py-12">
          <p className="text-red-500">
            Error loading videos. Please try again later.
          </p>
        </div>
      ) : !isLoading && videos.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏷️</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No videos found
          </h2>
          <p className="text-neutral-400 max-w-md mx-auto">
            There are currently no videos with the tag "{tagTitle}".
          </p>
        </div>
      ) : (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {isLoading ? (
               Array.from({ length: 20 }).map((_, i) => (
                 <SkeletonCard key={i} />
               ))
            ) : videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
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
      </div>
    </div>
  );
}
