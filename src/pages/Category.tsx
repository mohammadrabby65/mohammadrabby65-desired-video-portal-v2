import { Fragment } from 'react';
import { AdsterraNativeBanner } from '../components/ads/AdsterraNativeBanner';
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { SEO } from "../components/seo/SEO";
import { ChevronDown } from "lucide-react";
import { usePaginationVideos, PaginationFilter } from '../hooks/useVideos';
import { usePublicCategories } from "../hooks/useCategories";
import { Pagination } from '../components/ui/Pagination';

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
  const page = parseInt(searchParams.get('page') || '1', 10);
  
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

  const filter: PaginationFilter = useMemo(() => ({
    category: slug,
    sortBy
  }), [slug, sortBy]);

  const {
    data,
    isLoading,
    isError,
  } = usePaginationVideos(filter, 20, page);

  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${categoryName} Videos`,
    description: `Browse the best ${categoryName} videos.`,
    url: typeof window !== "undefined" ? window.location.href : "",
  }), [categoryName]);

  return (
    <div className="flex-1 pb-20 pt-8 sm:pt-10">
      <SEO
        title={`${categoryName} Porn Videos - DesiredHub`}
        description={`Watch the best desi porn and hot Indian sex videos in the ${categoryName} category on DesiredHub. Stream high quality adult content for free.`}
        jsonLd={jsonLd}
        breadcrumbs={[
          { name: "Home", item: "/" },
          { name: categoryName, item: `/category/${slug}` }
        ]}
      />
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <nav className="flex text-neutral-400 text-[13px] font-medium mb-6">
          <ol className="flex items-center space-x-2.5">
            <li>
              <Link to="/" className="hover:text-white">Home</Link>
            </li>
            <li className="text-neutral-600">/</li>
            <li className="text-neutral-200 truncate" aria-current="page">{categoryName}</li>
          </ol>
        </nav>
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white capitalize tracking-tight">
                {categoryName} Videos
              </h1>
            </div>

            <div className="relative z-10">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 rounded-full text-[13px] font-semibold text-neutral-300 hover:text-white shadow-sm hover:shadow-md w-full sm:w-auto justify-between group"
              >
                Sort by: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-white" />
              </button>

              {isSortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-full sm:w-56 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/50 rounded-2xl shadow-2xl z-20 p-2 origin-top-right">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl ${
                          sortBy === option.value
                            ? "bg-primary/20 text-primary"
                            : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
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
          <p className="text-neutral-400 text-[15px] max-w-3xl leading-relaxed">
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
              {isLoading || isCategoryPending
                ? Array.from({ length: 20 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                : videos.map((video: any, index: number) => (
                    <Fragment key={video.id}>
                      <VideoCard video={video} priority={index < 4} />
                      {(index === 4) && <AdsterraNativeBanner />}
                    </Fragment>
                  ))}
            </div>

            <Pagination currentPage={page} totalPages={totalPages} />
          </>
        )}
      </section>
    </div>
  );
}
