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

// Performance metrics collection
export function collectPerformanceMetrics() {
  if (typeof window === 'undefined' || typeof self === 'undefined' || process.env.NODE_ENV !== 'development') return;

  // Collect Core Web Vitals
  const vitals = {
    lcp: 0,
    fid: 0,
    cls: 0,
    fcp: 0,
    ttfb: 0
  };

  // LCP
  if (typeof PerformanceObserver !== 'undefined') {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      vitals.lcp = lastEntry.startTime;
      console.log(`📊 LCP: ${vitals.lcp.toFixed(2)}ms`);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.processingStart) {
          vitals.fid = entry.processingStart - entry.startTime;
          console.log(`📊 FID: ${vitals.fid.toFixed(2)}ms`);
        }
      });
    }).observe({ entryTypes: ['first-input'] });

    // CLS
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          vitals.cls = clsValue;
          console.log(`📊 CLS: ${vitals.cls.toFixed(4)}`);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });

    // FCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        vitals.fcp = entry.startTime;
        console.log(`📊 FCP: ${vitals.fcp.toFixed(2)}ms`);
      });
    }).observe({ entryTypes: ['paint'] });
  }

  // TTFB
  if (typeof performance !== 'undefined') {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      vitals.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      console.log(`📊 TTFB: ${vitals.ttfb.toFixed(2)}ms`);
    }
  }

  return vitals;
}
