import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { useFeaturedVideos } from '../../hooks/useVideos';

export function HeroSlider() {
  const { data: videos, isLoading } = useFeaturedVideos();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!videos || videos.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [videos]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 mb-8">
        <div className="w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[21/7] rounded-2xl bg-neutral-900 animate-pulse" />
      </div>
    );
  }

  if (!videos || videos.length === 0) return null;

  const activeVideo = videos[currentIndex];

  return (
    <div className="container mx-auto px-4 mb-8">
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] lg:aspect-[21/7] rounded-2xl overflow-hidden bg-neutral-900 group">
        <img
          key={activeVideo.id}
          src={activeVideo.thumbnailUrl}
          alt={activeVideo.title}
          className="w-full h-full object-cover transition-transform duration-[6000ms] scale-100 group-hover:scale-105 animate-in fade-in zoom-in-95 duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/30 to-transparent" />

        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 flex flex-col justify-end z-10">
          {activeVideo.quality && (
            <span className="w-fit bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded mb-3 tracking-wider">
              {activeVideo.quality}
            </span>
          )}
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 leading-tight line-clamp-2 drop-shadow-md">
            {activeVideo.title}
          </h2>
          <p className="text-sm md:text-base text-neutral-300 mb-6 line-clamp-2 max-w-xl drop-shadow">
            {activeVideo.description}
          </p>
          <div className="flex items-center gap-3">
            <Link
              to={`/video/${activeVideo.slug}`}
              className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-semibold hover:bg-neutral-200 transition-colors shadow-lg"
            >
              <Play className="w-5 h-5 fill-black" />
              Play Now
            </Link>
            <Link
              to={`/video/${activeVideo.slug}`}
              className="flex items-center gap-2 bg-neutral-800/80 hover:bg-neutral-700/80 backdrop-blur text-white px-6 py-2.5 rounded-full font-semibold transition-colors"
            >
              <Info className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          {videos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-6 bg-red-500' : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
