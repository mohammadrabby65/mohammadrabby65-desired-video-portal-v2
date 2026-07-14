import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { SEO } from "../components/seo/SEO";
import { ChevronDown } from "lucide-react";
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';
import { usePublicCategories } from "../hooks/useCategories";

type SortOption = 'publishedAt' | 'featured' | 'views' | 'duration' | 'random';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest', value: 'publishedAt' },
  { label: 'Best', value: 'featured' },
  { label: 'Most Viewed', value: 'views' },
  { label: 'Longest', value: 'duration' },
  { label: 'Random', value: 'random' },
];

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  
  const [sortBy, setSortBy] = useState<SortOption>('publishedAt');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Try to find the exact category name by slug from categories API
  const { data: categories = [], isPending: isCategoryPending } = usePublicCategories();
  const categoryData = categories.find((cat) => cat.slug === slug) || null;

  const categoryName =
    categoryData?.name ||
    (slug
      ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
      : "Category");

  const filter: PaginationFilter = {
    category: slug,
    sortBy
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
    name: `${categoryName} Videos`,
    description: `Browse the best ${categoryName} videos.`,
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
          name: categoryName,
          item: typeof window !== "undefined" ? window.location.href : "",
        },
      ],
    },
  };

  return (
    <div className="flex-1 pb-16 pt-8">
      <SEO
        title={`${categoryName} Porn Videos - DesiredHub`}
        description={`Watch the best ${categoryName} sex videos on DesiredHub. Premium free porn updated daily.`}
        jsonLd={jsonLd}
      />
      <section className="container mx-auto px-4 mb-16">
        <nav className="flex text-neutral-400 text-sm mb-4">
          <ol className="flex items-center space-x-2">
            <li>
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li className="text-neutral-200 truncate" aria-current="page">{categoryName}</li>
          </ol>
        </nav>
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">
                {categoryName} Videos
              </h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors w-full sm:w-auto justify-between"
              >
                Sort by: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {isSortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-full sm:w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-20 py-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          sortBy === option.value
                            ? "bg-neutral-800 text-white"
                            : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
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
          {categoryData?.description && (
            <p className="text-neutral-400 mt-2 max-w-3xl">
              {categoryData.description}
            </p>
          )}
        </div>

        {isError ? (
           <div className="text-center py-12">
             <p className="text-red-500">Error loading videos. Please try again later.</p>
           </div>
        ) : !isLoading && !isCategoryPending && videos.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📭</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No videos found
            </h2>
            <p className="text-neutral-400 max-w-md mx-auto">
              There are currently no videos in this category. Check back later!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
              {isLoading || isCategoryPending
                ? Array.from({ length: 20 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                : videos.map((video: any) => (
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
      </section>
    </div>
  );
}
