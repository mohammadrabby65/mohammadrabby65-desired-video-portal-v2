import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useVideoBySlug } from "../hooks/useVideos";
import { VideoPlayer } from "../components/video/VideoPlayer";
import { SEO } from "../components/seo/SEO";
import { formatTimeAgo } from "../lib/utils";
import {
  ThumbsUp,
  Share2,
  Flag,
  Copy,
} from "lucide-react";

export function Video() {
  const { slug } = useParams<{ slug: string }>();
  const { data: video, isLoading, isError } = useVideoBySlug(slug);
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
        <div className="animate-pulse flex flex-col gap-6 min-w-0 w-full">
          <div className="flex-1">
            <div className="w-full aspect-video bg-neutral-900 rounded-xl mb-4" />
            <div className="h-8 bg-neutral-900 rounded w-3/4 mb-2" />
            <div className="h-4 bg-neutral-900 rounded w-1/4 mb-6" />
            <div className="h-20 bg-neutral-900 rounded w-full" />
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

  return (
    <>
      <SEO title={`${video.title} - DesiredHub`} />
      <div className="flex-1 min-w-0 p-4 container mx-auto pb-10 w-full overflow-x-hidden">
        <nav className="flex text-neutral-400 text-sm mb-4 min-w-0 w-full overflow-hidden">
          <ol className="flex items-center space-x-2 min-w-0 w-full">
            <li className="shrink-0">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            {categoryName && (
              <>
                <li className="shrink-0">/</li>
                <li className="shrink-0 min-w-0 truncate max-w-[100px] sm:max-w-none text-neutral-400">
                  {categoryName}
                </li>
              </>
            )}
            <li className="shrink-0">/</li>
            <li className="text-neutral-200 truncate min-w-0" aria-current="page">{video.title}</li>
          </ol>
        </nav>
        <div className="flex flex-col gap-6 lg:gap-8 min-w-0 w-full max-w-[1200px] mx-auto">
          {/* Main Video Section */}
          <div className="flex-1 min-w-0">
            <VideoPlayer videoUrl={video.videoUrl} thumbnailUrl={video.thumbnailUrl} />

            <div className="mt-4 flex flex-col gap-4 min-w-0 w-full">
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight break-words">
                {video.title}
              </h1>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4 min-w-0 w-full">
                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
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
                    <span key={cat} className="bg-red-500/10 text-red-500 px-4 py-1.5 rounded-full text-sm font-medium inline-flex">
                      {cat}
                    </span>
                  ))}

                  {video.tags && (
                    <>
                      {(isTagsExpanded ? video.tags : video.tags.slice(0, 12)).map((tag) => (
                        <span
                          key={tag}
                          className="bg-neutral-800 text-neutral-300 px-4 py-1.5 rounded-full text-sm font-medium inline-flex max-w-full truncate"
                        >
                          #{tag}
                        </span>
                      ))}
                      {!isTagsExpanded && video.tags.length > 12 && (
                        <button
                          onClick={() => setIsTagsExpanded(true)}
                          className="bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex max-w-full truncate"
                        >
                          +{video.tags.length - 12} More
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-neutral-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words mt-1">
                  {video.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
