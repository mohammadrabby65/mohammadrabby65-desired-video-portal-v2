import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { SEO } from "../components/seo/SEO";
import { ChevronDown } from "lucide-react";
import { Pagination } from "../components/ui/Pagination";
import { usePaginationVideos, usePaginationCount, PaginationFilter } from '../hooks/useVideos';
import { getPageUrl } from '../lib/pagination';

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
  const [searchParams] = useSearchParams();
  const pageParam = searchParams.get('page');
  const currentPage = parseInt(pageParam || '1', 10);
  
  const [sortBy, setSortBy] = useState<SortOption>('publishedAt');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Try to find the exact category name by slug from categories
  const { data: categoryData, isPending: isCategoryPending } = useQuery({
    queryKey: ["category-details", slug],
    queryFn: async () => {
      if (!slug) return null;
      const q = query(
        collection(db, "categories"),
        where("slug", "==", slug),
        limit(1),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
      }
      return null;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!slug,
  });

  const categoryName =
    categoryData?.name ||
    (slug
      ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
      : "Category");

  const filter: PaginationFilter = {
    category: slug,
    sortBy
  };

  const { data: totalCount = 0 } = usePaginationCount(filter);
  const totalPages = Math.ceil(totalCount / 20);

  const {
    data: videos = [],
    isLoading,
    isError
  } = usePaginationVideos(filter, currentPage, 20);

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
        title={`${categoryName} Porn Videos${currentPage > 1 ? ` - Page ${currentPage}` : ''} - Desired`}
        description={`Watch the best ${categoryName} sex videos on Desired. Premium free porn updated daily.`}
        jsonLd={jsonLd}
        prevUrl={currentPage > 1 ? getPageUrl(`/category/${slug}`, currentPage - 1, searchParams) : undefined}
        nextUrl={currentPage < totalPages ? getPageUrl(`/category/${slug}`, currentPage + 1, searchParams) : undefined}
      />
      <section className="container mx-auto px-4 mb-16">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white capitalize">
                {categoryName} Videos
              </h1>
              {totalCount > 0 && (
                <p className="text-neutral-400 mt-2">
                  {totalCount} video{totalCount !== 1 ? 's' : ''} available
                </p>
              )}
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
            </div>

            {!isLoading && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/category/${slug}`}
                searchParams={searchParams}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
