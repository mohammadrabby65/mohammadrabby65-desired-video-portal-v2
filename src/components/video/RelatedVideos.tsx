import React from 'react';
import { useRelatedVideos, useLatestVideos } from '../../hooks/useVideos';
import { VideoCard } from '../ui/VideoCard';
import { SkeletonCard } from '../ui/SkeletonCard';

interface RelatedVideosProps {
  videoId: string;
  category: string;
  tags: string[];
}

export function RelatedVideos({ videoId, category, tags }: RelatedVideosProps) {
  const { data: relatedVideos, isLoading: isRelatedLoading } = useRelatedVideos(videoId, category, tags);
  const { data: latestVideos, isLoading: isLatestLoading } = useLatestVideos(10);

  const displayVideos = relatedVideos && relatedVideos.length > 0 ? relatedVideos : (latestVideos || []);
  const isLoading = isRelatedLoading || isLatestLoading;
  const title = relatedVideos && relatedVideos.length > 0 ? 'Related Videos' : 'Latest Videos';

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-2 gap-3 md:gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : displayVideos.map(video => <VideoCard key={video.id} video={video} />)}
      </div>
    </div>
  );
}
