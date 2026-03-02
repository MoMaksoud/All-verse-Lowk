'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function RouteTransitionMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    performance.mark('route-change-start');

    const measureRouteChange = () => {
      performance.mark('route-change-end');
      try {
        performance.measure('route-change-duration', 'route-change-start', 'route-change-end');
        const measures = performance.getEntriesByName('route-change-duration');
        const latestMeasure = measures[measures.length - 1];

        if (latestMeasure && typeof (window as any).gtag === 'function') {
          (window as any).gtag('event', 'route_transition', {
            event_category: 'Performance',
            value: Math.round(latestMeasure.duration),
            event_label: pathname,
            non_interaction: true,
          });
        }

        // Console logging in development only
        if (process.env.NODE_ENV === 'development' && latestMeasure) {
          console.log(`Route transition to ${pathname}: ${latestMeasure.duration.toFixed(2)}ms`);
          if (latestMeasure.duration > 150) {
            console.warn(`Slow route transition detected: ${latestMeasure.duration.toFixed(2)}ms`);
          }
        }
      } catch {
        // performance.measure can throw if marks are missing
      }
    };

    const timeoutId = setTimeout(measureRouteChange, 0);
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
