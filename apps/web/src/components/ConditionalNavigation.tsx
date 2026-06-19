'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

const NO_NAV_PREFIXES = ['/signin', '/signup', '/verify'];

export function ConditionalNavigation() {
  const pathname = usePathname();
  if (NO_NAV_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  return <Navigation />;
}
