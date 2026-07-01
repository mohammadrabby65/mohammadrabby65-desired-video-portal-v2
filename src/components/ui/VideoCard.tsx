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
    <Link to={`/video/${video.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800">
        <img
          src={video.thumbnailUrl || "https://placehold.co/600x400/171717/333333?text=No+Thumbnail"}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-3 shadow-md">
            <Play className="w-5 h-5 text-pure-white fill-pure-white" />
          </div>
        </div>
        <div className="absolute bottom-[6px] right-[6px] z-20 bg-black/80 px-2 py-0.5 rounded text-[11px] font-medium text-pure-white tracking-wide whitespace-nowrap select-none">
          {video.duration}
        </div>
        {video.badges && video.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-40px)]">
            {video.badges.map(badge => (
              <div key={badge} className="bg-red-600/90 px-2 py-0.5 rounded text-[10px] font-bold text-pure-white tracking-wider shadow-sm">
                {badge}
              </div>
            ))}
          </div>
        )}
        {video.quality && (
          <div className="absolute top-2 right-2 bg-red-600/90 px-2 py-0.5 rounded text-[10px] font-bold text-pure-white tracking-wider shadow-sm">
            {video.quality}
          </div>
        )}
      </div>
      <div className="flex flex-col px-1">
        <h3 className="text-base font-medium text-neutral-100 line-clamp-2 leading-snug group-hover:text-red-500 transition-colors duration-150">
          {video.title}
        </h3>
        <div className="flex items-center text-[13px] text-neutral-400 mt-2 gap-2">
          <span>{formatViews(video.views)} views</span>
          <span className="w-1 h-1 rounded-full bg-neutral-700" />
          <span>{formatTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
