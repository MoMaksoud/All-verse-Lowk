import Script from 'next/script';

export function ResourcePreloader() {
  return (
    <>
      <Script id="resource-preloader" strategy="afterInteractive">
        {`
          (function(){
            try {
              var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
              var isSlow = false;
              if (connection && connection.effectiveType) {
                var et = String(connection.effectiveType || '').toLowerCase();
                isSlow = et.includes('2g') || et.includes('slow-2g');
              }
              if ('saveData' in navigator && navigator.saveData) {
                isSlow = true;
              }
              if (isSlow) return; // Skip prefetch on slow connections or data saver

              var prefetch = function(){
                fetch('/api/listings?limit=3', {
                  method: 'GET',
                  headers: { 'Cache-Control': 'max-age=600' }
                }).catch(function(){ /* non-critical */ });
              };

              // Delay prefetch a bit to avoid competing with initial load
              setTimeout(prefetch, 5000);
            } catch(e) {
              // no-op
            }
          })();
        `}
      </Script>
      <Script id="staged-route-prefetch" strategy="afterInteractive">
        {`
          (function(){
            try {
              if (!('requestIdleCallback' in window)) {
                window.requestIdleCallback = function(cb){ return setTimeout(function(){ cb({ timeRemaining: function(){ return 1; } }); }, 1); };
              }
              
              // Reuse connection detection logic from above
              var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
              var slow = false;
              if (connection && connection.effectiveType) {
                var t = String(connection.effectiveType || '').toLowerCase();
                slow = t.includes('2g') || t.includes('slow-2g');
              }
              if ('saveData' in navigator && navigator.saveData) slow = true;
              if (slow) return;

              var routesPhase1 = ['/listings'];
              var routesPhase2 = ['/ai', '/messages'];
              var routesPhase3 = ['/settings', '/profile', '/cart'];

              function prefetchRoute(href){
                if (!href) return;
                var l = document.createElement('link');
                l.rel = 'prefetch';
                l.href = href;
                l.as = 'document';
                l.crossOrigin = 'anonymous';
                l.referrerPolicy = 'no-referrer';
                document.head.appendChild(l);
              }

              function schedule(list, delay){
                setTimeout(function(){
                  requestIdleCallback(function(){
                    try { list.forEach(prefetchRoute); } catch(_){}
                  });
                }, delay);
              }

              // Stagger route prefetches
              schedule(routesPhase1, 1500);
              schedule(routesPhase2, 4000);
              schedule(routesPhase3, 7000);
            } catch(e){}
          })();
        `}
      </Script>
    </>
  );
}
