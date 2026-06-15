'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

const HIDDEN_PREFIXES = ['/signin', '/signup', '/verify', '/settings', '/seller', '/listing/'];

export function ConditionalNavigation() {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );

  if (hidden) return null;
  return <Navigation />;
}
