import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useVideoBySlug, useAdjacentVideos } from "../hooks/useVideos";
import { VideoPlayer } from "../components/video/VideoPlayer";
import { VideoGallery } from "../components/video/VideoGallery";
import { RelatedVideos } from "../components/video/RelatedVideos";
import { SEO } from "../components/seo/SEO";
import { formatTimeAgo } from "../lib/utils";
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

const formatIsoDuration = (duration: string) => {
  if (!duration) return undefined;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return `PT${parts[0]}H${parts[1]}M${parts[2]}S`;
  } else if (parts.length === 2) {
    return `PT${parts[0]}M${parts[1]}S`;
  } else if (parts.length === 1) {
    return `PT${parts[0]}S`;
  }
  return undefined;
};

export function Video() {
  const { slug } = useParams<{ slug: string }>();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

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
      <div className="flex-1 min-w-0 p-4 container mx-auto">
        <div className="animate-pulse flex flex-col lg:flex-row gap-6 min-w-0 w-full">
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
                  <div className="w-32 sm:w-40 aspect-video bg-neutral-900 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
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

  const categoryName = video.categories?.[0] || (video as any).category;
  const categorySlug = categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") : null;

  const breadcrumbs = [
    { name: "Home", item: "/" },
    ...(categoryName && categorySlug ? [{ name: categoryName, item: `/category/${categorySlug}` }] : []),
    { name: video.title, item: `/video/${video.slug}` }
  ];

  return (
    <>
      <SEO
        title={`${video.title} - DesiredHub`}
        description={video.description}
        image={video.thumbnailUrl}
        exactTitle={true}
        breadcrumbs={breadcrumbs}
        video={{
          name: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          uploadDate: video.publishedAt?.toDate
            ? video.publishedAt.toDate().toISOString()
            : new Date().toISOString(),
          ...(video.duration && { duration: formatIsoDuration(video.duration) }),
          contentUrl: video.videoUrl,
        }}
      />
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto pb-20 w-full overflow-x-hidden">
        <nav className="flex text-neutral-400 text-[13px] font-medium mb-6 min-w-0 w-full overflow-hidden">
          <ol className="flex items-center space-x-2.5 min-w-0 w-full">
            <li className="shrink-0">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            {categoryName && categorySlug && (
              <>
                <li className="shrink-0 text-neutral-600">/</li>
                <li className="shrink-0 min-w-0 truncate max-w-[120px] sm:max-w-none">
                  <Link to={`/category/${categorySlug}`} className="hover:text-white transition-colors truncate block">{categoryName}</Link>
                </li>
              </>
            )}
            <li className="shrink-0 text-neutral-600">/</li>
            <li className="text-neutral-200 truncate min-w-0" aria-current="page">{video.title}</li>
          </ol>
        </nav>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 min-w-0 w-full">
          {/* Main Video Section */}
          <div className="flex-1 max-w-[1400px] min-w-0">
            <div className="rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl shadow-black/50">
              <VideoPlayer videoUrl={video.videoUrl} thumbnailUrl={video.thumbnailUrl} />
            </div>

            <div className="mt-6 sm:mt-8 flex flex-col gap-5 min-w-0 w-full">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight break-words tracking-tight">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-[15px] text-neutral-400 font-medium mt-3">
                <span>{formatTimeAgo(video.publishedAt)}</span>
              </div>

              <VideoGallery images={video.gallery} />

              <div className="flex flex-wrap items-center gap-3 border-b border-neutral-800/60 pb-6 min-w-0 w-full mt-2">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md group">
                    <ThumbsUp className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="group-hover:text-white text-neutral-300 transition-colors">Like</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md group"
                  >
                    <Copy className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="group-hover:text-white text-neutral-300 transition-colors">Copy</span>
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md group">
                    <Share2 className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                    <span className="group-hover:text-white text-neutral-300 transition-colors">Share</span>
                  </button>
                  <button
                    onClick={handleReport}
                    className="flex items-center gap-2 p-2.5 sm:px-5 sm:py-2.5 bg-neutral-900/80 hover:bg-red-500/10 border border-neutral-800 hover:border-red-500/30 rounded-full text-sm font-semibold text-neutral-400 hover:text-red-500 transition-all duration-300 active:scale-95 shadow-sm group"
                    title="Report Video"
                  >
                    <Flag className="w-4 h-4 group-hover:text-red-500 transition-colors" />
                    <span className="hidden sm:inline">Report</span>
                  </button>
                </div>

              <div className="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/60 rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-inner mt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  {video.quality && (
                    <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm uppercase">
                      {video.quality}
                    </span>
                  )}
                  {video.badges?.map(badge => (
                    <span key={badge} className="bg-primary/90 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm uppercase">
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
                      <span className="bg-neutral-800/80 border border-neutral-700/50 hover:bg-neutral-700 text-neutral-300 hover:text-white px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 cursor-pointer inline-flex shadow-sm active:scale-95">
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
                          className="text-neutral-500 hover:text-white hover:bg-neutral-800/80 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 inline-flex max-w-full truncate active:scale-95"
                        >
                          #{tag}
                        </Link>
                      ))}
                      {!isTagsExpanded && video.tags.length > 12 && (
                        <button
                          onClick={() => setIsTagsExpanded(true)}
                          className="text-neutral-500 hover:text-white hover:bg-neutral-800/80 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 inline-flex max-w-full truncate active:scale-95"
                        >
                          +{video.tags.length - 12} More
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-neutral-300 text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                  {video.description}
                </p>
              </div>

              {/* Prev / Next */}
              {adjacent && (adjacent.prev || adjacent.next) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {adjacent.next ? (
                    <Link
                      to={`/video/${adjacent.next.slug}`}
                      className="flex items-center gap-4 bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 p-5 rounded-2xl transition-all duration-300 group active:scale-[0.98] shadow-sm hover:shadow-md"
                    >
                      <div className="bg-neutral-800 group-hover:bg-neutral-700 p-2 rounded-full transition-colors shrink-0">
                        <ChevronLeft className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500 mb-1 tracking-wider uppercase">
                          Previous Video
                        </div>
                        <div className="text-[15px] font-semibold text-neutral-200 group-hover:text-white truncate transition-colors">
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
                      className="flex items-center justify-end text-right gap-4 bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 p-5 rounded-2xl transition-all duration-300 group active:scale-[0.98] shadow-sm hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500 mb-1 tracking-wider uppercase">
                          Next Video
                        </div>
                        <div className="text-[15px] font-semibold text-neutral-200 group-hover:text-white truncate transition-colors">
                          {adjacent.prev.title}
                        </div>
                      </div>
                      <div className="bg-neutral-800 group-hover:bg-neutral-700 p-2 rounded-full transition-colors shrink-0">
                        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                      </div>
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
