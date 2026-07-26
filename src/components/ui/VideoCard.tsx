import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { VideoPost } from '../../types';
import { formatTimeAgo } from '../../lib/utils';
import { Play } from 'lucide-react';

interface VideoCardProps {
  video: VideoPost;
  key?: string | number;
  priority?: boolean;
}

export const VideoCard = memo(function VideoCard({ video, priority = false }: VideoCardProps) {
  return (
    <Link to={`/video/${video.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 isolate">
        
        {/* CSS Skeleton Base */}
        <div className="absolute inset-0 bg-neutral-800/50 -z-10 rounded-xl" />

        <img
          src={video.thumbnailUrl || "https://placehold.co/600x400/171717/333333?text=No+Thumbnail"}
          alt={video.title}
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchPriority: "high" as any } : {})}
          decoding="async"
          width="600"
          height="338"
          className="w-full h-full object-cover rounded-xl"
        />

        {/* Play Button Overlay (Premium Glass) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/10 backdrop-blur-md rounded-full p-4 border border-white/20">
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Duration Badge (Glassmorphism) */}
        <div className="absolute bottom-2.5 right-2.5 z-20 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded-md text-[11px] font-semibold text-white tracking-wide whitespace-nowrap">
          {video.duration}
        </div>
        
        {/* Top Badges Area */}
        {video.badges && video.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-40px)] z-20">
            {video.badges.map(badge => (
              <div key={badge} className="bg-primary/90 backdrop-blur-md border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wider uppercase">
                {badge}
              </div>
            ))}
          </div>
        )}
        
        {/* Quality Badge */}
        {video.quality && (
          <div className="absolute top-3 right-3 z-20 bg-white/10 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider uppercase">
            {video.quality}
          </div>
        )}
      </div>
      
      {/* Typography & Metadata */}
      <div className="flex flex-col px-1 min-w-0 w-full gap-1.5">
        <h3 className="text-[15px] sm:text-base font-semibold text-neutral-100 line-clamp-2 leading-snug group-hover:text-primary break-words tracking-tight">
          {video.title}
        </h3>
        <div className="flex flex-wrap items-center text-[13px] text-neutral-400 font-medium">
          <span>{formatTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
});
