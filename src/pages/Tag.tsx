import { useParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

export function Tag() {
  const { slug } = useParams<{ slug: string }>();

  // Tag slug to normal string (e.g., action-movies -> action movies)
  const tagTitle = slug ? slug.replace(/-/g, " ") : "Tag";

  const { data: totalCount } = useQuery({
    queryKey: ["tag-count", tagTitle],
    queryFn: async () => {
      const q = query(
        collection(db, "posts"),
        where("tags", "array-contains", tagTitle),
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!tagTitle,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["tag-videos", tagTitle],
      queryFn: async ({ pageParam = null }) => {
        let q = query(
          collection(db, "posts"),
          where("tags", "array-contains", tagTitle),
          orderBy("publishedAt", "desc"),
          limit(12),
        );

        if (pageParam) {
          q = query(q, startAfter(pageParam));
        }

        const snapshot = await getDocs(q);
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        const videos = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as VideoPost,
        );

        return {
          videos,
          lastVisible,
        };
      },
      initialPageParam: null as any,
      getNextPageParam: (lastPage) => lastPage.lastVisible || undefined,
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!tagTitle,
    });

  const videos = data?.pages.flatMap((page) => page.videos) || [];

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

  return (
    <div className="max-w-[2000px] mx-auto px-4 md:px-6 py-6 md:py-8 min-h-screen">
      <SEO
        title={`#${tagTitle} Videos`}
        description={`Watch the latest and best videos tagged with ${tagTitle}.`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          #{tagTitle}
        </h1>
        {totalCount !== undefined && (
          <p className="text-neutral-400">{totalCount} videos with this tag</p>
        )}
      </div>

      {status === "pending" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
          {Array.from({ length: 12 }).map((_, i) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="bg-neutral-800 hover:bg-neutral-700 text-white px-8 py-3 rounded-full font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
