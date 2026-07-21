import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon } from 'lucide-react';

interface VideoGalleryProps {
  images?: string[];
}

export function VideoGallery({ images }: VideoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = '';
  }, []);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const goToPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToNext, goToPrev]);

  // Swipe handlers for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrev();
  };

  return (
    <div className="w-full min-w-0 py-2">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 shadow-sm">
          <ImageIcon className="w-5 h-5 text-neutral-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Gallery</h3>
      </div>

      {/* Horizontal Scroll Gallery */}
      <div className="flex overflow-x-auto gap-4 sm:gap-5 pb-6 scrollbar-hide snap-x snap-mandatory">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => openLightbox(idx)}
            className="relative flex-none w-[280px] sm:w-[320px] aspect-[16/9] rounded-2xl overflow-hidden group cursor-pointer border border-neutral-800/60 hover:border-neutral-700 transition-all duration-300 shadow-md hover:shadow-xl bg-neutral-900 snap-center active:scale-[0.98]"
            aria-label={`View image ${idx + 1} of ${images.length}`}
          >
            <div className="absolute inset-0 bg-neutral-800/50 animate-pulse" />
            <img
              src={img}
              alt={`Gallery image ${idx + 1}`}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl transition-opacity animate-fade-in">
          {/* Header */}
          <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="text-white/80 font-medium text-sm sm:text-base tracking-wider bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              {currentIndex + 1} / {images.length}
            </div>
            <button
              onClick={closeLightbox}
              className="p-2 sm:p-3 bg-black/40 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all duration-200 backdrop-blur-md border border-white/10 active:scale-90"
              aria-label="Close lightbox"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Navigation Prev */}
          <button
            onClick={goToPrev}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/40 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all duration-200 backdrop-blur-md border border-white/10 z-10 hidden sm:flex active:scale-90"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Navigation Next */}
          <button
            onClick={goToNext}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/40 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all duration-200 backdrop-blur-md border border-white/10 z-10 hidden sm:flex active:scale-90"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Image Container */}
          <div
            className="w-full h-full flex items-center justify-center p-4 sm:p-12 md:p-24 outline-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={closeLightbox}
          >
            <img
              src={images[currentIndex]}
              alt={`Gallery view ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
            />
          </div>
        </div>
      )}
    </div>
  );
}
