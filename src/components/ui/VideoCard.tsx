import React from 'react';
import { Link } from 'react-router-dom';
import { VideoPost } from '../../types';
import { formatViews, formatTimeAgo } from '../../lib/utils';
import { Play } from 'lucide-react';

interface VideoCardProps {
  video: VideoPost;
  key?: string | number;
}

export function VideoCard({ video }: VideoCardProps) {
  return (
    <Link to={`/video/${video.slug}`} className="group flex flex-col gap-2">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/50">
        <img
          src={video.thumbnailUrl || "https://placehold.co/600x400/171717/333333?text=No+Thumbnail"}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-all">
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
        </div>
        <div className="absolute bottom-1.5 right-1.5 bg-black/90 px-1.5 py-0.5 rounded text-[11px] font-medium text-white tracking-wide">
          {video.duration}
        </div>
        {video.badges && video.badges.length > 0 && (
          <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 max-w-[calc(100%-40px)]">
            {video.badges.map(badge => (
              <div key={badge} className="bg-red-600/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wider shadow-sm backdrop-blur-sm">
                {badge}
              </div>
            ))}
          </div>
        )}
        {video.quality && (
          <div className="absolute top-1.5 right-1.5 bg-red-600/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wider shadow-sm backdrop-blur-sm">
            {video.quality}
          </div>
        )}
      </div>
      <div className="flex flex-col px-0.5">
        <h3 className="text-sm font-medium text-neutral-100 line-clamp-2 leading-snug group-hover:text-red-500 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center text-[12px] text-neutral-400 mt-1.5 gap-1.5">
          <span>{formatViews(video.views)} views</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700" />
          <span>{formatTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
