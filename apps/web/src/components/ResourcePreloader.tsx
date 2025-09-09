'use client';

import { useEffect } from 'react';

export function ResourcePreloader() {
  useEffect(() => {
    // Preload critical images
    const criticalImages = [
      '/icons/electronics.svg',
      '/icons/fashion.svg',
      '/icons/home.svg',
      '/icons/sports.svg',
    ];

    criticalImages.forEach((src) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });

    // Prefetch API data
    const prefetchData = async () => {
      try {
        await fetch('/api/listings?limit=6', {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=300', // 5 minutes cache
          },
        });
      } catch (error) {
      }
    };

    // Prefetch after initial load
    const timer = setTimeout(prefetchData, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null;
}
