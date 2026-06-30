import { useState } from 'react';
import { CategoryBar } from '../components/home/CategoryBar';
import { HeroSlider } from '../components/home/HeroSlider';
import { VideoSection } from '../components/home/VideoSection';

export function Home() {
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div className="flex-1 pb-10">
      <CategoryBar activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

      {activeCategory === 'All' ? (
        <>
          <HeroSlider />
          <VideoSection title="Newest Videos" filter={{ sortBy: 'publishedAt' }} limitCount={4} />
          <VideoSection title="Trending Now" filter={{ trending: true, sortBy: 'publishedAt' }} limitCount={4} />
          <VideoSection title="Popular Videos" filter={{ sortBy: 'views' }} limitCount={4} />
        </>
      ) : (
        <div className="pt-2">
          <VideoSection
            title={`${activeCategory} Videos`}
            filter={{ category: activeCategory }}
          />
        </div>
      )}
    </div>
  );
}
