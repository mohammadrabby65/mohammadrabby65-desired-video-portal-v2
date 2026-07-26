import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { VideoCard } from '../ui/VideoCard';
import { VideoPost } from '../../types';

export function GlobalRandomVideos() {
  const [randomVideos, setRandomVideos] = useState<VideoPost[]>([]);
  const location = useLocation();

  useEffect(() => {
    // Re-shuffle on every route change using the pool injected by the server
    if (typeof window !== 'undefined' && (window as any).__RANDOM_VIDEOS_POOL__) {
      const pool = (window as any).__RANDOM_VIDEOS_POOL__ as VideoPost[];
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      setRandomVideos(shuffled.slice(0, 12));
    }
  }, [location.pathname]);

    // Only show on specific pages
  const isTargetPage = /^\/(?:video\/.*|category\/.*|tag\/.*|search)?$/.test(location.pathname);
  
  if (randomVideos.length === 0 || !isTargetPage) return null;

  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 mb-20 mt-10">
      <div className="mb-10 sm:mb-14">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
          Random Videos
        </h2>
        <div className="h-1.5 w-12 bg-primary rounded-full mt-3 opacity-90 shadow-[0_0_12px_rgba(229,9,20,0.6)]" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
        {randomVideos.map(video => (
          <VideoCard key={`global-random-${video.id}`} video={video} />
        ))}
      </div>
    </section>
  );
}
