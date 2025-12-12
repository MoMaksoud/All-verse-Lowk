'use client';

import React from 'react';
import { Brain, DollarSign, TrendingUp } from 'lucide-react';

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

  const hasPrice = summary.priceRange && summary.priceRange.min !== undefined;
  const showRecommendations = summary.topRecommendations && summary.topRecommendations.length > 0;
  const showInsights = summary.marketInsights && summary.marketInsights.length > 0;

  if (!hasPrice && !showRecommendations && !showInsights) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-accent-500/10 to-primary-500/10 backdrop-blur-xl border border-accent-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Insights for “{query}”
              </h2>
              <p className="text-sm text-gray-300">
                Based on live results across the web
              </p>
            </div>
          </div>

          {hasPrice && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs text-gray-400 mb-1">Minimum</p>
                <p className="text-lg font-bold text-green-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {summary.priceRange!.min.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs text-gray-400 mb-1">Average</p>
                <p className="text-lg font-bold text-accent-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {summary.priceRange!.average.toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-xs text-gray-400 mb-1">Maximum</p>
                <p className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {summary.priceRange!.max.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {showRecommendations && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-accent-400" />
                <h3 className="text-lg font-semibold text-white">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {summary.topRecommendations!.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-gray-200">
                    <span className="w-6 h-6 flex items-center justify-center bg-accent-500/20 text-accent-300 rounded-full text-xs font-semibold shrink-0">
                      {index + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showInsights && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Market Insights</h3>
              <ul className="space-y-2">
                {summary.marketInsights!.map((insight, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-gray-200">
                    <span className="text-accent-300 mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

