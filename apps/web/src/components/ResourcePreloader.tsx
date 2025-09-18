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

    // Prefetch API data - reduced to essential data only
    const prefetchData = async () => {
      try {
        await fetch('/api/listings?limit=3', {
          method: 'GET',
          headers: {
            'Cache-Control': 'max-age=600', // 10 minutes cache
          },
        });
      } catch (error) {
        // Silently fail - prefetch is not critical
      }
    };

    // Prefetch after initial load - increased delay to reduce initial load impact
    const timer = setTimeout(prefetchData, 3000);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return null;
}
