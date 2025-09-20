import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      // Monitor page load performance
      window.addEventListener('load', () => {
        const loadTime = performance.now() - startTime;
        
        // Get memory usage if available
        const memoryUsage = (performance as any).memory?.usedJSHeapSize;
        
        setMetrics({
          loadTime: Math.round(loadTime),
          renderTime: Math.round(performance.now() - startTime),
          memoryUsage: memoryUsage ? Math.round(memoryUsage / 1024 / 1024) : undefined
        });
      });
    }
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded-lg z-50">
      <div>Load: {metrics.loadTime}ms</div>
      <div>Render: {metrics.renderTime}ms</div>
      {metrics.memoryUsage && <div>Memory: {metrics.memoryUsage}MB</div>}
    </div>
  );
}
