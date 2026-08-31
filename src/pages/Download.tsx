import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useVideoBySlug } from "../hooks/useVideos";
import { SEO } from "../components/seo/SEO";
import { ChevronLeft, Download as DownloadIcon, AlertCircle } from "lucide-react";

export function Download() {
  const { slug } = useParams<{ slug: string }>();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const { data: video, isLoading, isError } = useVideoBySlug(slug);

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 p-4 container mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !video) {
    return (
      <div className="flex-1 min-w-0 p-4 container mx-auto">
        <SEO title="Video Not Found - DesiredHub" description="The requested video could not be found." />
        <div className="max-w-2xl mx-auto mt-12 sm:mt-24 text-center">
          <AlertCircle className="w-16 h-16 text-neutral-600 mx-auto mb-6" />
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-4">
            Video Not Found
          </h1>
          <p className="text-neutral-400 mb-8 text-sm sm:text-base">
            The video you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-semibold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const hasDownloadUrl = video.downloadUrl && video.downloadUrl.trim() !== "";

  return (
    <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 container mx-auto max-w-4xl">
      <SEO title={`Download ${video.title} - DesiredHub`} description={`Download the original video file for ${video.title}.`} />
      
      <div className="mb-6">
        <Link
          to={`/video/${video.slug}`}
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Video
        </Link>
      </div>

      <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative aspect-video sm:aspect-[21/9] bg-black">
          <img
            src={video.thumbnailUrl || "https://placehold.co/1200x600/171717/333333?text=No+Thumbnail"}
            alt={video.title}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 line-clamp-2">
              {video.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-300">
              {video.duration && (
                <span className="bg-black/60 px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm">
                  {video.duration}
                </span>
              )}
              {video.quality && (
                <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm">
                  {video.quality}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center">
          {hasDownloadUrl ? (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Ready to Download
              </h2>
              <p className="text-neutral-400 max-w-md mx-auto mb-8 text-sm sm:text-base">
                Click the button below to download the original video file. You will be redirected to the secure download page.
              </p>
              
              <a
                href={video.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:-translate-y-1"
              >
                <DownloadIcon className="w-6 h-6" />
                Download Now
              </a>
            </>
          ) : (
             <>
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-neutral-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                Download Unavailable
              </h2>
              <p className="text-neutral-400 max-w-md mx-auto mb-8 text-sm sm:text-base">
                We're sorry, but the download link for this video is currently unavailable or has been removed.
              </p>
              <Link
                to={`/video/${video.slug}`}
                className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-full font-semibold transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Return to Video
              </Link>
             </>
          )}
        </div>
      </div>
    </div>
  );
}
