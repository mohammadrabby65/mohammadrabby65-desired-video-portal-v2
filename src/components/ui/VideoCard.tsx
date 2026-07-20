import React from 'react';
import { Link } from 'react-router-dom';
import { VideoPost } from '../../types';
import { formatTimeAgo } from '../../lib/utils';
import { Play } from 'lucide-react';

interface VideoCardProps {
  video: VideoPost;
  key?: string | number;
  priority?: boolean;
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  return (
    <Link to={`/video/${video.slug}`} className="group flex flex-col gap-3 active:scale-[0.98] transition-all duration-300">
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-sm group-hover:shadow-2xl group-hover:shadow-black/40 group-hover:border-neutral-700/50 transition-all duration-300 isolate">
        
        {/* CSS Skeleton Base */}
        <div className="absolute inset-0 animate-pulse bg-neutral-800/50 -z-10" />

        <img
          src={video.thumbnailUrl || "https://placehold.co/600x400/171717/333333?text=No+Thumbnail"}
          alt={video.title}
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchPriority: "high" as any } : {})}
          decoding="async"
          width="600"
          height="338"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Cinematic Bottom Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Play Button Overlay (Premium Glass) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-95 group-hover:scale-100">
          <div className="bg-white/10 backdrop-blur-md rounded-full p-4 shadow-2xl border border-white/20 transition-transform duration-300 hover:scale-110">
            <Play className="w-7 h-7 text-white fill-white translate-x-0.5" />
          </div>
        </div>

        {/* Duration Badge (Glassmorphism) */}
        <div className="absolute bottom-2.5 right-2.5 z-20 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 rounded-md text-[11px] font-semibold text-white tracking-wide whitespace-nowrap shadow-sm transition-transform duration-300 group-hover:scale-105">
          {video.duration}
        </div>
        
        {/* Top Badges Area */}
        {video.badges && video.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-40px)] z-20">
            {video.badges.map(badge => (
              <div key={badge} className="bg-primary/90 backdrop-blur-md border border-white/10 px-2.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wider shadow-sm uppercase">
                {badge}
              </div>
            ))}
          </div>
        )}
        
        {/* Quality Badge */}
        {video.quality && (
          <div className="absolute top-3 right-3 z-20 bg-white/10 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wider shadow-sm uppercase">
            {video.quality}
          </div>
        )}
      </div>
      
      {/* Typography & Metadata */}
      <div className="flex flex-col px-1 min-w-0 w-full gap-1.5">
        <h3 className="text-[15px] sm:text-base font-semibold text-neutral-100 line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200 break-words tracking-tight">
          {video.title}
        </h3>
        <div className="flex flex-wrap items-center text-[13px] text-neutral-400 font-medium">
          <span>{formatTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
