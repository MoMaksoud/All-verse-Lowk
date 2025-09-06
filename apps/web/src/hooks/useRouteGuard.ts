'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function useRouteGuard() {
  const pathname = usePathname();
  const [isHomeRoute, setIsHomeRoute] = useState(false);

  useEffect(() => {
    // Only show dynamic background on home route
    setIsHomeRoute(pathname === '/');
  }, [pathname]);

  return isHomeRoute;
}
