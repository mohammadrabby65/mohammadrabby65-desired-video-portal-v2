import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useVideoBySlug, useAdjacentVideos } from "../hooks/useVideos";
import { useVote } from "../hooks/useVote";
import { VideoPlayer } from "../components/video/VideoPlayer";
import { AdsterraBanner320x50 } from "../components/ads/AdsterraBanner320x50";
import { VideoGallery } from "../components/video/VideoGallery";
import { RelatedVideos } from "../components/video/RelatedVideos";
import { SEO } from "../components/seo/SEO";
import { formatTimeAgo } from "../lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Flag,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Clock,
  Calendar,
  MoreVertical
} from "lucide-react";

const formatIsoDuration = (duration: string) => {
  if (!duration) return undefined;
  const parts = duration.split(":").map(Number);
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

  // Default to empty object if video is undefined for useVote hook safety
  const { likeCount, dislikeCount, likePercentage, localVote, handleVote } = useVote(video || ({} as any));

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
        <div className="flex flex-col lg:flex-row gap-0 sm:gap-6 min-w-0 w-full">
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
  const categorySlug = categoryName
    ? categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    : null;

  const breadcrumbs = [
    { name: "Home", item: "/" },
    ...(categoryName && categorySlug
      ? [{ name: categoryName, item: `/category/${categorySlug}` }]
      : []),
    { name: video.title, item: `/video/${video.slug}` },
  ];

  let metaDesc = video.metaDescription || "";
  if (!metaDesc) {
    let text = (video.description || "").replace(/\s+/g, " ").trim();
    if (text.length > 155) {
      let cutoff = text.substring(0, 153).lastIndexOf(" ");
      if (cutoff === -1) cutoff = 152;
      metaDesc = text.substring(0, cutoff).trim() + "...";
    } else {
      metaDesc = text;
    }
  }

  return (
    <>
      <SEO
        title={`${video.title} - DesiredHub`}
        description={metaDesc}
        image={video.thumbnailUrl}
        exactTitle={true}
        breadcrumbs={breadcrumbs}
        video={{
          name: video.title,
          description: metaDesc,
          thumbnailUrl: video.thumbnailUrl,
          uploadDate: video.publishedAt?.toDate
            ? video.publishedAt.toDate().toISOString()
            : new Date().toISOString(),
          ...(video.duration && {
            duration: formatIsoDuration(video.duration),
          }),
          contentUrl: video.videoUrl,
        }}
      />
      <div className="flex-1 min-w-0 sm:p-6 lg:p-8 max-w-[1920px] mx-auto pb-20 w-full overflow-x-hidden">
        <nav className="flex text-neutral-400 text-[13px] font-medium mb-4 sm:mb-6 px-4 sm:px-0 min-w-0 w-full overflow-hidden">
          <ol className="flex items-center space-x-2.5 min-w-0 w-full">
            <li className="shrink-0">
              <Link to="/" className="hover:text-white ">
                Home
              </Link>
            </li>
            {categoryName && categorySlug && (
              <>
                <li className="shrink-0 text-neutral-600">/</li>
                <li className="shrink-0 min-w-0 truncate max-w-[120px] sm:max-w-none">
                  <Link
                    to={`/category/${categorySlug}`}
                    className="hover:text-white  truncate block"
                  >
                    {categoryName}
                  </Link>
                </li>
              </>
            )}
            <li className="shrink-0 text-neutral-600">/</li>
            <li
              className="text-neutral-200 truncate min-w-0"
              aria-current="page"
            >
              {video.title}
            </li>
          </ol>
        </nav>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 min-w-0 w-full">
          {/* Main Video Section */}
          <div className="flex-1 max-w-[1400px] min-w-0">
            {/* Adsterra 320x50 Banner (Directly Above Video Player) */}
            <AdsterraBanner320x50 key={video.id} />

            {/* Premium Player Container */}
            <div className="sm:rounded-2xl overflow-hidden bg-black sm:border sm:border-neutral-800/60 relative w-full shadow-xl">
              <div className="relative w-full aspect-video bg-black">
                <VideoPlayer
                  videoId={video.id}
                  videoUrl={video.videoUrl}
                  thumbnailUrl={video.thumbnailUrl}
                  previewStoryboardUrl={video.previewStoryboardUrl}
                  previewStoryboardData={video.previewStoryboardData}
                />
              </div>
            </div>

            {/* Video Meta Info */}
            <div className="mt-5 sm:mt-6 flex flex-col min-w-0 w-full px-4 sm:px-0 lg:px-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight break-words tracking-tight">
                {video.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[13px] sm:text-[14px] text-neutral-400 font-medium mt-3 pb-4 border-b border-white/10">
                {video.views !== undefined && (
                  <span className="flex items-center gap-1.5 text-neutral-300 font-semibold bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                    <Eye className="w-4 h-4 text-neutral-500" />
                    {video.views.toLocaleString()} views
                  </span>
                )}
                {video.duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {video.duration}
                  </span>
                )}
                {video.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatTimeAgo(video.publishedAt)}
                  </span>
                )}
                {video.quality && (
                  <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ml-auto sm:ml-0">
                    {video.quality}
                  </span>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-4">
                <div className="flex items-center bg-neutral-900 border border-neutral-800/80 rounded-full overflow-hidden">
                  <button
                    onClick={() => handleVote('like')}
                    className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-[13px] sm:text-sm font-semibold transition-colors ${localVote === 'like' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${localVote === 'like' ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Like</span>
                  </button>
                  <div className="flex items-center px-4 font-bold text-[13px] sm:text-sm text-neutral-300 border-x border-neutral-800/80 h-6">
                    {likePercentage !== null ? `${likePercentage}%` : <span className="font-medium text-neutral-500 text-[12px]">No votes yet</span>}
                  </div>
                  <button
                    onClick={() => handleVote('dislike')}
                    className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-[13px] sm:text-sm font-semibold transition-colors ${localVote === 'dislike' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}`}
                  >
                    <ThumbsDown className={`w-4 h-4 ${localVote === 'dislike' ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Dislike</span>
                  </button>
                </div>
                <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-300 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                {video.downloadUrl && video.downloadUrl.trim() !== "" ? (
                  <Link
                    to={`/download/${video.slug}`}
                    className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-red-600 hover:bg-red-500 rounded-full text-[13px] sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-red-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </Link>
                ) : (
                  <a
                    href="https://predestineheadypleasure.com/wbunjk6rq?key=53693a97cb2d7fe1805610bc89cca2ab"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-red-600 hover:bg-red-500 rounded-full text-[13px] sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-red-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  onClick={handleReport}
                  className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-transparent hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-full text-[13px] sm:text-sm font-semibold text-neutral-500 hover:text-red-500 transition-colors ml-auto"
                  title="Report Video"
                >
                  <Flag className="w-4 h-4" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              </div>

              {/* Gallery (If exists) */}
              {video.gallery && video.gallery.length > 0 && (
                <div className="mt-2 mb-6">
                  <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider mb-2">Video Gallery</h3>
                  <VideoGallery images={video.gallery} />
                </div>
              )}

              {/* Collapsible Description & Tags */}
              <div className="bg-neutral-900 border border-neutral-800/60 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 mt-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {Array.from(new Set(video.badges || [])).map((badge) => (
                    <span
                      key={badge}
                      className="bg-primary/20 border border-primary/30 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-sm uppercase"
                    >
                      {badge}
                    </span>
                  ))}
                  {Array.from(new Set(video.categories
                    ? video.categories
                    : (video as any).category
                      ? [(video as any).category]
                      : []
                  )).map((cat: any) => (
                    <Link
                      key={cat}
                      to={`/category/${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}`}
                    >
                      <span className="bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors inline-flex">
                        {cat}
                      </span>
                    </Link>
                  ))}
                  {video.tags && (
                    <>
                      {Array.from(new Set(isTagsExpanded
                        ? video.tags
                        : video.tags.slice(0, 8)
                      )).map((tag: any) => (
                        <Link
                          to={`/tag/${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}`}
                          key={tag}
                          className="text-neutral-500 hover:text-neutral-300 bg-transparent px-2 py-1 rounded-full text-[13px] font-medium transition-colors inline-flex"
                        >
                          #{tag}
                        </Link>
                      ))}
                      {!isTagsExpanded && video.tags.length > 8 && (
                        <button
                          onClick={() => setIsTagsExpanded(true)}
                          className="text-neutral-500 hover:text-white px-2 py-1 rounded-full text-[13px] font-medium transition-colors inline-flex"
                        >
                          +{video.tags.length - 8} More
                        </button>
                      )}
                    </>
                  )}
                </div>
                
                <div className="relative">
                  <p className={`text-neutral-300 text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words ${!isTagsExpanded ? 'line-clamp-3' : ''}`}>
                    {video.description}
                  </p>
                  {!isTagsExpanded && video.description && video.description.length > 150 && (
                    <button onClick={() => setIsTagsExpanded(true)} className="text-white font-semibold text-[14px] mt-1 hover:underline">
                      Show more
                    </button>
                  )}
                  {isTagsExpanded && video.description && video.description.length > 150 && (
                    <button onClick={() => setIsTagsExpanded(false)} className="text-white font-semibold text-[14px] mt-2 hover:underline">
                      Show less
                    </button>
                  )}
                </div>
              </div>

              {/* Prev / Next */}
              {adjacent && (adjacent.prev || adjacent.next) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {adjacent.next ? (
                    <Link
                      to={`/video/${adjacent.next.slug}`}
                      className="flex items-center gap-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 p-4 sm:p-5 rounded-2xl group transition-all"
                    >
                      <div className="bg-neutral-800/50 group-hover:bg-neutral-700/50 p-2 rounded-full shrink-0 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500 mb-1 tracking-wider uppercase">
                          Previous Video
                        </div>
                        <div className="text-[14px] sm:text-[15px] font-semibold text-neutral-200 group-hover:text-white truncate">
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
                      className="flex items-center justify-end text-right gap-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800/80 p-4 sm:p-5 rounded-2xl group transition-all"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-neutral-500 mb-1 tracking-wider uppercase">
                          Next Video
                        </div>
                        <div className="text-[14px] sm:text-[15px] font-semibold text-neutral-200 group-hover:text-white truncate">
                          {adjacent.prev.title}
                        </div>
                      </div>
                      <div className="bg-neutral-800/50 group-hover:bg-neutral-700/50 p-2 rounded-full shrink-0 transition-colors">
                        <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-white" />
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
          <div className="w-full lg:w-[400px] xl:w-[450px] px-4 sm:px-0 mt-6 lg:mt-0">
            <RelatedVideos
              videoId={video.id}
              categories={
                video.categories
                  ? video.categories
                  : (video as any).category
                    ? [(video as any).category]
                    : []
              }
              tags={video.tags}
            />
          </div>
        </div>
      </div>
    </>
  );
}
