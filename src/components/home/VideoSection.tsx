import { useInfiniteVideos, VideoFilter } from '../../hooks/useVideos';
import { VideoCard } from '../ui/VideoCard';
import { SkeletonCard } from '../ui/SkeletonCard';
import { ChevronRight } from 'lucide-react';

interface VideoSectionProps {
  title: string;
  filter: VideoFilter;
  limitCount?: number;
}

export function VideoSection({ title, filter, limitCount = 4 }: VideoSectionProps) {
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteVideos(filter, limitCount);

  if (isError) return null;

  const videos = data?.pages.flatMap(page => page.videos) || [];

  if (!isLoading && videos.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-1 group cursor-pointer">
          {title}
          <ChevronRight className="w-6 h-6 text-neutral-500 group-hover:text-red-500 transition-colors" />
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          videos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))
        )}
      </div>

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-8 py-2.5 rounded-full border border-neutral-800 text-neutral-300 text-sm font-medium hover:bg-neutral-900 transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
    </section>
  );
}
