'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

/**
 * Renders Vercel Analytics only after client mount to avoid triggering
 * lazy chunk loading during hydration (which can cause options.factory errors).
 */
export function AnalyticsDeferred() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Analytics />;
}
