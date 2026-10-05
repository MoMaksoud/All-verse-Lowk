'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface AISummary {
  overview: string;
  priceRange?: {
    min: number;
    max: number;
    average: number;
  };
  topRecommendations?: string[];
  marketInsights?: string[];
}

interface AISummarySectionProps {
  summary: AISummary | null;
  query: string;
  hasResults: boolean;
}

export function AISummarySection({ summary, query, hasResults }: AISummarySectionProps) {
  if (!summary || !hasResults) {
    return null;
  }

  const range = summary.priceRange;
  const hasPrice = range && range.min !== undefined && range.max > 0;
  const showRecommendations = summary.topRecommendations && summary.topRecommendations.length > 0;
  const showInsights = summary.marketInsights && summary.marketInsights.length > 0;

  if (!hasPrice && !showRecommendations && !showInsights) {
    return null;
  }

  // Position of the average along the min..max bar
  const avgPos = hasPrice && range!.max > range!.min
    ? ((range!.average - range!.min) / (range!.max - range!.min)) * 100
    : 50;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-7">
      <div className="flex items-center gap-2 text-sm font-medium text-primary-700">
        <Sparkles strokeWidth={1.75} className="h-4 w-4" />
        AI price check
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">
        What “{query}” goes for right now
      </h2>

      {hasPrice && (
        <div className="mt-6 max-w-2xl">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-zinc-500">Typical price</span>
            <span className="text-2xl font-semibold tabular-nums text-zinc-950">{formatPrice(range!.average)}</span>
          </div>
          <div className="relative mt-4 h-1.5 rounded-full bg-gradient-to-r from-primary-200 via-primary-500 to-primary-200">
            <span
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary-700 shadow"
              style={{ left: `${Math.min(100, Math.max(0, avgPos))}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-500">
            <span>Low {formatPrice(range!.min)}</span>
            <span>High {formatPrice(range!.max)}</span>
          </div>
        </div>
      )}

      {(showRecommendations || showInsights) && (
        <div className="mt-7 grid grid-cols-1 gap-6 border-t border-zinc-200 pt-6 md:grid-cols-2 md:gap-10">
          {showRecommendations && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">What to look for</h3>
              <ol className="mt-3 space-y-2.5">
                {summary.topRecommendations!.map((rec, index) => (
                  <li key={index} className="grid grid-cols-[1.5rem_1fr] text-sm leading-relaxed text-zinc-700">
                    <span className="tabular-nums text-primary-600">{index + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {showInsights && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Market notes</h3>
              <ul className="mt-3 space-y-2.5">
                {summary.marketInsights!.map((insight, index) => (
                  <li key={index} className="border-l-2 border-zinc-200 pl-3 text-sm leading-relaxed text-zinc-700">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
