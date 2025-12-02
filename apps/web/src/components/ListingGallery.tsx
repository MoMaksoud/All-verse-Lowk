'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { normalizeImageSrc } from '@/lib/image-utils';

interface ListingGalleryProps {
  photos: string[];
  title?: string;
  className?: string;
}

export const ListingGallery: React.FC<ListingGalleryProps> = ({
  photos,
  title = 'Listing photo',
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const safePhotos = photos?.length ? photos : ['/images/placeholder.png'];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : safePhotos.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveIndex(prev => (prev < safePhotos.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safePhotos.length]);

  // Handle touch/swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const diff = startX - endX;
      
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          // Swipe left - next image
          setActiveIndex(prev => (prev < safePhotos.length - 1 ? prev + 1 : 0));
        } else {
          // Swipe right - previous image
          setActiveIndex(prev => (prev > 0 ? prev - 1 : safePhotos.length - 1));
        }
      }
      
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchend', handleTouchEnd);
  };

  if (safePhotos.length === 0) {
    return (
      <div className={`aspect-video bg-zinc-800 rounded-xl flex items-center justify-center ${className}`}>
        <div className="text-center text-zinc-400">
          <div className="text-5xl mb-3">📦</div>
          <div className="text-base">No Images Available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Image */}
      <div className="relative aspect-[4/3] w-full bg-zinc-900 rounded-xl overflow-hidden">
        <Image
          src={normalizeImageSrc(safePhotos[activeIndex])}
          alt={`${title} - Image ${activeIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover rounded-lg"
          priority={activeIndex === 0}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder.png';
          }}
        />
        
        {/* Navigation Arrows */}
        {safePhotos.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex(prev => (prev > 0 ? prev - 1 : safePhotos.length - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveIndex(prev => (prev < safePhotos.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        
        {/* Image Counter */}
        {safePhotos.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {activeIndex + 1} / {safePhotos.length}
          </div>
        )}
      </div>
      
      {/* Thumbnail Strip */}
      {safePhotos.length > 1 && (
        <div 
          className="flex gap-2 overflow-x-auto pb-2"
          onTouchStart={handleTouchStart}
        >
          {safePhotos.map((photo, index) => (
            <button
              key={`${photo}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                index === activeIndex 
                  ? 'border-accent-500 ring-2 ring-accent-500/50' 
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={normalizeImageSrc(photo)}
                alt={`${title} thumbnail ${index + 1}`}
                width={80}
                height={80}
                className="object-cover rounded-lg"
                style={{ width: 'auto', height: 'auto' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/placeholder.png';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
