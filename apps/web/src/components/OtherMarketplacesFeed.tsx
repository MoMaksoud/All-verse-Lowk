'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Globe2, Loader2 } from 'lucide-react';
import { ExternalResultsSection } from '@/components/search/ExternalResultsSection';
import { readDiscoveryHistory } from '@/lib/discoveryHistory';
import type { ExternalResult } from '@/lib/search/types';

type Props = {
  keyword?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  interestCategories?: string[];
};

export function OtherMarketplacesFeed(props: Props) {
  const { keyword, category, condition, minPrice, maxPrice, interestCategories } = props;
  const [enabled, setEnabled] = useState(false);
  const [results, setResults] = useState<ExternalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seeds, setSeeds] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const seenUrls = useRef(new Set<string>());
  const emptyBatches = useRef(0);
  const inFlight = useRef(false);
  const enabledRef = useRef(false);
  const hasMoreRef = useRef(true);
  const batchRef = useRef(0);
  const seedsRef = useRef<string[]>([]);
  const propsRef = useRef(props);
  const cooldownUntil = useRef(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    propsRef.current = { keyword, category, condition, minPrice, maxPrice, interestCategories };
    const history = readDiscoveryHistory();
    const candidates = [
      keyword,
      category,
      ...history.map((item) => item.query),
      ...(interestCategories || []),
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    const nextSeeds = [...new Set(candidates.map((value) => value.toLowerCase()))].slice(0, 20);
    seedsRef.current = nextSeeds;
    setSeeds(nextSeeds);
  }, [category, condition, interestCategories, keyword, maxPrice, minPrice]);

  const loadNext = useCallback(async () => {
    if (!enabledRef.current || inFlight.current || !hasMoreRef.current) return;

    const waitMs = cooldownUntil.current - Date.now();
    if (waitMs > 0) {
      if (!cooldownTimer.current) {
        cooldownTimer.current = setTimeout(() => {
          cooldownTimer.current = null;
          void loadNext();
        }, waitMs);
      }
      return;
    }

    inFlight.current = true;
    setLoading(true);

    try {
      const currentSeeds = seedsRef.current;
      const currentProps = propsRef.current;
      const seed = currentSeeds[batchRef.current % Math.max(currentSeeds.length, 1)] || 'popular products';
      const queryParts = [seed];
      if (currentProps.condition) queryParts.push(currentProps.condition);
      if (currentProps.minPrice !== undefined || currentProps.maxPrice !== undefined) {
        queryParts.push(`$${currentProps.minPrice ?? 0} to $${currentProps.maxPrice ?? 'any'}`);
      }

      const params = new URLSearchParams({
        q: queryParts.join(' '),
        source: 'external',
        provider: 'auto',
        conversational: '0',
        limit: '20',
      });
      const response = await fetch(`/api/search?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data) throw new Error(payload?.error || 'Marketplace search failed');

      const incoming = Array.isArray(payload.data.externalResults)
        ? (payload.data.externalResults as ExternalResult[])
        : [];
      const unique = incoming.filter((item) => {
        if (!item?.url || seenUrls.current.has(item.url)) return false;
        seenUrls.current.add(item.url);
        return true;
      });

      setResults((current) => [...current, ...unique]);
      batchRef.current += 1;
      emptyBatches.current = unique.length === 0 ? emptyBatches.current + 1 : 0;
      if (emptyBatches.current >= Math.min(3, Math.max(1, currentSeeds.length))) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } catch (error) {
      console.error('Unable to load recommendations from other marketplaces:', error);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      cooldownUntil.current = Date.now() + 700;
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadNext();
  }, [enabled, loadNext]);

  useEffect(() => {
    if (!enabled || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadNext();
      },
      { rootMargin: '900px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, hasMore, loadNext]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  if (!enabled) {
    return (
      <div className="mt-12 flex justify-center">
        <button
          type="button"
          onClick={() => {
            enabledRef.current = true;
            setEnabled(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-600"
        >
          <Globe2 className="h-5 w-5" />
          Load from other marketplaces
        </button>
      </div>
    );
  }

  return (
    <section className="mt-12 border-t border-white/10 pt-8">
      <h2 className="text-2xl font-bold text-white">Recommended from other marketplaces</h2>
      <p className="mt-1 text-sm text-gray-400">
        Based on your filters, interests, and recent product clicks{seeds.length > 0 ? '.' : ''}
      </p>
      <ExternalResultsSection results={results} />
      <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-6">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-accent-400" />}
        {!loading && !hasMore && results.length > 0 && (
          <span className="text-sm text-gray-500">You’re all caught up.</span>
        )}
        {!loading && !hasMore && results.length === 0 && (
          <span className="text-sm text-gray-500">No matching external listings were found.</span>
        )}
      </div>
    </section>
  );
}
