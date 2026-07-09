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
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useRelatedVideos(videoId, categories, tags);
  
  const displayVideos = data?.pages.flatMap(page => page.videos) || [];
  const title = 'Related Videos';

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-2 gap-3 md:gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : displayVideos.map(video => <VideoCard key={video.id} video={video} />)}
          
        {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
      </div>

      {hasNextPage && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'See More'}
          </button>
        </div>
      )}
    </div>
  );
}
