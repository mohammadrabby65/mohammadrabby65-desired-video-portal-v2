import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useVideoBySlug, useAdjacentVideos } from "../hooks/useVideos";
import { VideoPlayer } from "../components/video/VideoPlayer";
import { RelatedVideos } from "../components/video/RelatedVideos";
import { SEO } from "../components/seo/SEO";
import { formatTimeAgo, formatViews } from "../lib/utils";
import {
  ThumbsUp,
  Heart,
  Share2,
  Tag,
  Flag,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function Video() {
  const { slug } = useParams<{ slug: string }>();
  const { data: video, isLoading, isError } = useVideoBySlug(slug);
  const { data: adjacent } = useAdjacentVideos(video?.publishedAt, video?.slug);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  const handleReport = () => {
    alert("Thank you for your report. Our team will review this content.");
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 container mx-auto">
        <div className="animate-pulse flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="w-full aspect-video bg-neutral-900 rounded-xl mb-4" />
            <div className="h-8 bg-neutral-900 rounded w-3/4 mb-2" />
            <div className="h-4 bg-neutral-900 rounded w-1/4 mb-6" />
            <div className="h-20 bg-neutral-900 rounded w-full" />
          </div>
          <div className="w-full lg:w-[400px]">
            <div className="h-6 bg-neutral-900 rounded w-1/2 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-40 aspect-video bg-neutral-900 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-900 rounded w-full" />
                    <div className="h-3 bg-neutral-900 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="flex-1 p-4 container mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-neutral-300">
            Video not found
          </h2>
          <p className="text-neutral-500">
            The video you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${video.title} - Desired`}
        description={video.description}
        image={video.thumbnailUrl}
        exactTitle={true}
      />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: video.title,
          description: video.description,
          thumbnailUrl: [video.thumbnailUrl],
          uploadDate: video.publishedAt?.toDate
            ? video.publishedAt.toDate().toISOString()
            : new Date().toISOString(),
          duration: `PT${video.duration.replace(":", "M")}S`,
          contentUrl: video.videoUrl,
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: video.views,
          },
        })}
      </script>
      <div className="flex-1 p-4 container mx-auto pb-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Video Section */}
          <div className="flex-1 max-w-[1200px]">
            <VideoPlayer videoUrl={video.videoUrl} />

            <div className="mt-4 flex flex-col gap-4">
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <span className="font-medium text-neutral-300">
                    {formatViews(video.views)} views
                  </span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                  <span>{formatTimeAgo(video.publishedAt)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full text-sm font-medium transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Like</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full text-sm font-medium transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full text-sm font-medium transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={handleReport}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-full text-sm font-medium text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900/50 rounded-xl p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {video.quality && (
                    <span className="bg-red-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-sm">
                      {video.quality}
                    </span>
                  )}
                  {video.badges?.map(badge => (
                    <span key={badge} className="bg-red-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-sm">
                      {badge}
                    </span>
                  ))}
                  {(video.categories ? video.categories : ((video as any).category ? [(video as any).category] : [])).map(cat => (
                    <Link
                      key={cat}
                      to={`/category/${cat
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)+/g, "")}`}
                    >
                      <span className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer inline-flex">
                        {cat}
                      </span>
                    </Link>
                  ))}

                  {video.tags && (
                    <>
                      {(isTagsExpanded ? video.tags : video.tags.slice(0, 12)).map((tag) => (
                        <Link
                          to={`/tag/${tag
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)+/g, "")}`}
                          key={tag}
                          className="bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex"
                        >
                          #{tag}
                        </Link>
                      ))}
                      {!isTagsExpanded && video.tags.length > 12 && (
                        <button
                          onClick={() => setIsTagsExpanded(true)}
                          className="bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex"
                        >
                          +{video.tags.length - 12} More
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-neutral-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap mt-1">
                  {video.description}
                </p>
              </div>

              {/* Prev / Next */}
              {adjacent && (adjacent.prev || adjacent.next) && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {adjacent.next ? (
                    <Link
                      to={`/video/${adjacent.next.slug}`}
                      className="flex items-center gap-3 bg-neutral-900 hover:bg-neutral-800 p-4 rounded-xl transition-colors group"
                    >
                      <ChevronLeft className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                      <div className="min-w-0">
                        <div className="text-xs text-neutral-500 mb-1">
                          Previous Video
                        </div>
                        <div className="text-sm font-semibold text-white truncate">
                          {adjacent.next.title}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div></div>
                  )}
                  {adjacent.prev ? (
                    <Link
                      to={`/video/${adjacent.prev.slug}`}
                      className="flex items-center justify-end text-right gap-3 bg-neutral-900 hover:bg-neutral-800 p-4 rounded-xl transition-colors group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-neutral-500 mb-1">
                          Next Video
                        </div>
                        <div className="text-sm font-semibold text-white truncate">
                          {adjacent.prev.title}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                    </Link>
                  ) : (
                    <div></div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Related Videos */}
          <div className="w-full lg:w-[400px] xl:w-[450px]">
            <RelatedVideos
              videoId={video.id}
              categories={video.categories ? video.categories : ((video as any).category ? [(video as any).category] : [])}
              tags={video.tags}
            />
          </div>
        </div>
      </div>
    </>
  );
}
