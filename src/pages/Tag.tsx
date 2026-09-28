import { Fragment } from "react";
import { PromoWidget } from "../components/widgets/PromoWidget";
import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { SEO } from "../components/seo/SEO";
import { VideoCard } from "../components/ui/VideoCard";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { Helmet } from "react-helmet-async";
import { usePaginationVideos, PaginationFilter } from "../hooks/useVideos";
import { Pagination } from "../components/ui/Pagination";

export function Tag() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Tag slug to normal string (e.g., action-movies -> action movies)
  const tagTitle = slug ? slug.replace(/-/g, " ") : "Tag";

  const filter: PaginationFilter = useMemo(
    () => ({
      tag: tagTitle,
    }),
    [tagTitle],
  );

  const { data, isLoading, isError } = usePaginationVideos(filter, 20, page);

  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Videos tagged with ${tagTitle}`,
      description: `Browse the best videos tagged with ${tagTitle}.`,
      url: typeof window !== "undefined" ? window.location.href : "",
    }),
    [tagTitle],
  );

  const formattedTagName = tagTitle
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="flex-1 pb-20 pt-8 sm:pt-10">
      <SEO
        title={`${formattedTagName} Videos - DesiredHub`}
        description={`Explore free desi porn and hot Indian sex videos tagged with ${tagTitle} on DesiredHub. Enjoy high quality streaming adult entertainment.`}
        exactTitle={true}
        jsonLd={jsonLd}
        breadcrumbs={[
          { name: "Home", item: "/" },
          { name: `#${tagTitle}`, item: `/tag/${slug}` },
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
              {isLoading
                ? Array.from({ length: 20 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                : videos.map((video, index) => (
                    <Fragment key={video.id}>
                      <VideoCard video={video} />
                      {index === 4 && <PromoWidget />}
                    </Fragment>
                  ))}
            </div>

            <Pagination currentPage={page} totalPages={totalPages} />
          </>
        )}
      </div>
    </div>
  );
}
