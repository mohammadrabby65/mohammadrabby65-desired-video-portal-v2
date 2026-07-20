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
      <div className="mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h3>
        <div className="h-1 w-10 bg-primary rounded-full mt-2 opacity-90 shadow-[0_0_10px_rgba(229,9,20,0.5)]" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-5 min-w-0 w-full">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : displayVideos.map(video => <VideoCard key={video.id} video={video} />)}
          
        {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`skel-${i}`} />)}
      </div>

      {hasNextPage && (
        <div className="mt-8 sm:mt-10 text-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-10 py-3.5 bg-primary/90 hover:bg-primary text-white font-medium tracking-wide rounded-full transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-[0_4px_14px_0_rgba(229,9,20,0.3)] hover:shadow-[0_6px_20px_rgba(229,9,20,0.4)] hover:-translate-y-0.5"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : 'See More'}
          </button>
        </div>
      )}
    </div>
  );
}
