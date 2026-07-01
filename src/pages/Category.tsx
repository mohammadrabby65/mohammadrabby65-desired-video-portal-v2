import { useParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { VideoPost } from "../types";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { SEO } from "../components/seo/SEO";
import { Loader2, ChevronDown } from "lucide-react";
import { Helmet } from "react-helmet-async";

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

  const { data: totalCount } = useQuery({
    queryKey: ["category-count", categoryName],
    queryFn: async () => {
      let q;
      if (categoryName === "Trending") {
        q = query(collection(db, "posts"), where("trending", "==", true));
      } else if (categoryName === "Latest" || categoryName === "New") {
        return undefined; // We don't need a total count for Latest
      } else if (categoryName === "Popular") {
        return undefined; // Don't need total count for Popular
      } else {
        q = query(collection(db, "posts"), where("category", "==", slug));
      }
      
      if (!q) return undefined;
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!categoryName,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["category-videos", categoryName, sortBy],
      queryFn: async ({ pageParam = null }) => {
        let constraints: any[] = [];
        
        if (categoryName === "Trending") {
          constraints.push(where("trending", "==", true));
        } else if (categoryName === "Latest" || categoryName === "New") {
          // No where clause needed
        } else if (categoryName === "Popular") {
           // We will just order by views if popularity is needed, but we apply sort below anyway.
           // However, if the page itself is "Popular", we might override sortBy, but let's just let sortBy handle it
           // If categoryName is Popular, perhaps default to views if random is not selected
           if (sortBy === 'publishedAt') constraints.push(orderBy("views", "desc"));
        } else {
          constraints.push(where("category", "==", slug));
        }

        if (sortBy !== 'random') {
           // Ensure we don't duplicate order by views if it was added by "Popular" category
           if (!(categoryName === "Popular" && sortBy === 'publishedAt')) {
             constraints.push(orderBy(sortBy, "desc"));
           }
        } else {
           // For random, we don't have a specific order in firestore, so we fallback to something else or just don't order
           // Firestore requires order matching inequality, since there are none, we can just omit or order by ID.
           constraints.push(orderBy("publishedAt", "desc")); // We'll shuffle client-side
        }

        constraints.push(limit(20));

        let q: any = query(collection(db, "posts"), ...constraints);

        if (pageParam) {
          q = query(q, startAfter(pageParam));
        }

        const snapshot = await getDocs(q);
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        let videos = snapshot.docs.map(
          (doc: any) => ({ id: doc.id, ...(doc.data() as object) }) as VideoPost,
        );

        if (sortBy === 'random') {
           videos = videos.sort(() => Math.random() - 0.5);
        }

        return {
          videos,
          lastVisible,
        };
      },
      initialPageParam: null as any,
      getNextPageParam: (lastPage) => lastPage.lastVisible || undefined,
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!categoryName && !isCategoryPending,
    });

  const videos = data?.pages.flatMap((page) => page.videos) || [];

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
    <div className="max-w-[2000px] mx-auto px-4 md:px-6 py-6 md:py-8 min-h-screen">
      <SEO
        title={categoryData?.seoTitle || `${categoryName} Videos`}
        description={categoryData?.seoDescription || `Watch the latest and best ${categoryName} videos.`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Category Banner */}
      {categoryData?.thumbnailUrl && (
        <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-2xl overflow-hidden mb-8">
          <img 
            src={categoryData.thumbnailUrl} 
            alt={categoryName} 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 shadow-sm">
              {categoryName} Videos
            </h1>
            {totalCount !== undefined && (
              <p className="text-neutral-300 font-medium">
                {totalCount} videos
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header if no banner */}
      {!categoryData?.thumbnailUrl && (
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {categoryName} Videos
          </h1>
          {totalCount !== undefined && (
            <p className="text-neutral-400">
              {totalCount} videos in this category
            </p>
          )}
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Browse</h2>
        
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
                    key={option.value}
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

      {status === "pending" || isCategoryPending ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : status === "error" ? (
        <div className="text-center py-12">
          <p className="text-red-500">
            Error loading videos. Please try again later.
          </p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-neutral-800/50">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎬</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No videos found
          </h2>
          <p className="text-neutral-400 max-w-md mx-auto">
            There are currently no videos in the {categoryName} category.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-8 py-3 rounded-full border border-neutral-800 text-neutral-300 text-sm font-medium hover:bg-neutral-900 transition-colors disabled:opacity-50"
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
