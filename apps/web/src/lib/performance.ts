'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Route transition performance monitoring (dev only)
export function RouteTransitionMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Mark route change start
    performance.mark('route-change-start');

    // Measure route change duration
    const measureRouteChange = () => {
      performance.mark('route-change-end');
      performance.measure(
        'route-change-duration',
        'route-change-start',
        'route-change-end'
      );

      const measures = performance.getEntriesByName('route-change-duration');
      const latestMeasure = measures[measures.length - 1];
      
      if (latestMeasure) {
        console.log(`🚀 Route transition to ${pathname}: ${latestMeasure.duration.toFixed(2)}ms`);
        
        // Log performance warnings
        if (latestMeasure.duration > 150) {
          console.warn(`⚠️ Slow route transition detected: ${latestMeasure.duration.toFixed(2)}ms`);
        }
      }
    };

    // Measure after a short delay to allow for rendering
    const timeoutId = setTimeout(measureRouteChange, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}

