import React from 'react';
import { useRelatedVideos } from '../../hooks/useVideos';
import { VideoCard } from '../ui/VideoCard';
import { SkeletonCard } from '../ui/SkeletonCard';

interface RelatedVideosProps {
  videoId: string;
  categories: string[];
  tags: string[];
}

export function RelatedVideos({ videoId, categories, tags }: RelatedVideosProps) {
  const { data: relatedVideos, isLoading } = useRelatedVideos(videoId, categories, tags);

  const displayVideos = relatedVideos || [];
  const title = 'Related Videos';

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-2 gap-3 md:gap-4">
        {isLoading
          ? Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)
          : displayVideos.map((video, index) => <VideoCard key={video.id} video={video}  />)}
      </div>
    </div>
  );
}
