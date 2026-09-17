import React, { memo } from "react";
import { Link } from "react-router-dom";
import { VideoPost } from "../../types";
import { formatTimeAgo } from "../../lib/utils";
import { Play } from "lucide-react";
import Hls from "hls.js";
import { useVote } from "../../hooks/useVote";

let currentPlayingId: string | number | null = null;
let stopCurrentPreview: (() => void) | null = null;

const requestPlayPreview = (id: string | number, stopFn: () => void) => {
  if (currentPlayingId === id) return;
  if (stopCurrentPreview) stopCurrentPreview();
  currentPlayingId = id;
  stopCurrentPreview = stopFn;
};

const cancelPreview = (id: string | number) => {
  if (currentPlayingId === id) {
    if (stopCurrentPreview) stopCurrentPreview();
    currentPlayingId = null;
    stopCurrentPreview = null;
  }
};

const VideoPreview = React.memo(({ videoUrl, onStop }: { videoUrl: string, onStop: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hlsInstanceRef = React.useRef<Hls | null>(null);
  const sceneIndexRef = React.useRef(0);
  const sceneTimeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    let isM3U8 = videoUrl.includes('.m3u8');
    let isDestroyed = false;

    const cleanupScene = () => {
       if (sceneTimeoutRef.current) {
         clearTimeout(sceneTimeoutRef.current);
         sceneTimeoutRef.current = null;
       }
    };
    
    const playScene = (duration: number) => {
       if (isDestroyed) return;
       if (sceneIndexRef.current >= 3) {
          onStop();
          return;
       }
       
       let startFraction = 0;
       if (sceneIndexRef.current === 0) startFraction = 0.05;
       else if (sceneIndexRef.current === 1) startFraction = 0.45;
       else startFraction = 0.85;
       
       const startTime = duration * startFraction;
       
       let sceneDuration = 2500; // 2.5 seconds per scene
       if (duration < 10) {
          sceneDuration = Math.max(500, (duration / 3) * 1000 - 500);
       }
       
       video.currentTime = startTime;
       video.play().catch(err => {
         console.warn("[VideoPreview] play() rejected:", err.name, err.message);
       });
       
       sceneTimeoutRef.current = setTimeout(() => {
          sceneIndexRef.current++;
          playScene(duration);
       }, sceneDuration);
    };

    const handleDuration = () => {
       if (isDestroyed) return;
       const duration = video.duration;
       if (duration && isFinite(duration) && !sceneTimeoutRef.current) {
           sceneIndexRef.current = 0;
           playScene(duration);
       }
    };

    video.addEventListener('loadedmetadata', handleDuration);
    video.addEventListener('durationchange', handleDuration);

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        debug: false
      });
      hlsInstanceRef.current = hls;
      
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
           onStop();
        }
      });
    } else {
      video.src = videoUrl;
      video.removeAttribute('crossOrigin');
    }

    return () => {
      isDestroyed = true;
      cleanupScene();
      video.removeEventListener('loadedmetadata', handleDuration);
      video.removeEventListener('durationchange', handleDuration);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      } else {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [videoUrl, onStop]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      preload="metadata"
      className={'absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-20 ' + (isLoaded ? 'opacity-100' : 'opacity-0')}
      onLoadedData={() => setIsLoaded(true)}
      onError={onStop}
    />
  );
});

interface VideoCardProps {
  video: VideoPost;
  key?: string | number;
  priority?: boolean;
  enablePreview?: boolean;
}

export const VideoCard = memo(function VideoCard({
  video,
  priority = false,
  enablePreview = false
}: VideoCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const { likePercentage } = useVote(video);

  React.useEffect(() => {
    if (!enablePreview) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting && entry.intersectionRatio >= 0.6);
    }, {
      threshold: [0, 0.6]
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [enablePreview]);

  React.useEffect(() => {
    if (!enablePreview) return;
    const stopFn = () => setIsPreviewing(false);
    if (isIntersecting) {
       requestPlayPreview(video.id, stopFn);
       setIsPreviewing(true);
    } else {
       cancelPreview(video.id);
    }
    return () => cancelPreview(video.id);
  }, [isIntersecting, enablePreview, video.id]);

  return (
    <Link to={'/video/' + video.slug} className="group flex flex-col gap-3" onClick={() => enablePreview && cancelPreview(video.id)}>
      <div ref={containerRef} className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/60 isolate group-hover:border-neutral-700/80 transition-colors">
        {isPreviewing && video.videoUrl && (
          <VideoPreview 
            videoUrl={video.videoUrl} 
            onStop={() => { cancelPreview(video.id); setIsPreviewing(false); }} 
          />
        )}
        
        <img
          src={
            video.thumbnailUrl ||
            "https://placehold.co/600x400/171717/333333?text=No+Thumbnail"
          }
          alt={video.title}
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchPriority: "high" as any } : {})}
          decoding="async"
          width="600"
          height="338"
          className="w-full h-full object-cover rounded-xl"
        />
        {/* Play Button Overlay (Desktop hover only, hidden on mobile touch) */}
        <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 sm:group-hover:opacity-100 z-30 transition-opacity duration-300 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md rounded-full p-3 border border-white/10">
            <Play className="w-6 h-6 text-white fill-white translate-x-0.5" />
          </div>
        </div>
        {/* Duration Badge (Glassmorphism) */}
        <div className="absolute bottom-2 right-2 z-30 bg-black/80 px-1.5 py-0.5 rounded text-[11px] font-bold text-white tracking-wide">
          {video.duration}
        </div>
        
        {/* Top Badges Area */}
        {video.badges && video.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[calc(100%-40px)] z-30">
            {Array.from(new Set(video.badges)).map((badge) => (
              <div
                key={badge}
                className="bg-primary px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider uppercase shadow-sm"
              >
                {badge}
              </div>
            ))}
          </div>
        )}
        {/* Quality Badge */}
        {video.quality && (
          <div className="absolute top-2 right-2 z-30 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider uppercase">
            {video.quality}
          </div>
        )}
      </div>
      {/* Typography & Metadata */}
      <div className="flex flex-col mt-3 px-1 min-w-0 w-full gap-1">
        <h3 className="text-sm sm:text-[15px] font-bold text-neutral-100 line-clamp-2 leading-snug group-hover:text-primary break-words transition-colors">
          {video.title}
        </h3>
        <div className="flex flex-wrap items-center text-xs sm:text-[13px] text-neutral-400 font-medium gap-2">
          <span>{formatTimeAgo(video.publishedAt)}</span>
          {video.views !== undefined && (
            <>
              <span className="text-neutral-600 text-[10px]">•</span>
              <span>{video.views.toLocaleString()} views</span>
            </>
          )}
          {likePercentage !== null && (
            <>
              <span className="text-neutral-600 text-[10px]">•</span>
              <span>{likePercentage}%</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
});
