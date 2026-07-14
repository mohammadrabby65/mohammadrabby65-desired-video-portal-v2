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
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: typeof window !== "undefined" ? window.location.origin : "",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: `#${tagTitle}`,
          item: typeof window !== "undefined" ? window.location.href : "",
        },
      ],
    },
  };

  const formattedTagName = tagTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="max-w-[2000px] mx-auto px-4 md:px-6 py-6 md:py-8 min-h-screen">
      <SEO
        title={`${formattedTagName} Videos - DesiredHub`}
        description={`Watch the latest and best videos tagged with ${tagTitle}.`}
        exactTitle={true}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
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
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
