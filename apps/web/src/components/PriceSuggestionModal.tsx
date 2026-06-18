import React from 'react';
import { X, TrendingUp, Loader2 } from 'lucide-react';

interface PriceSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: string;
  loading?: boolean;
  listingTitle?: string;
}

export function PriceSuggestionModal({ isOpen, onClose, suggestion, loading = false, listingTitle }: PriceSuggestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 grid place-items-center shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white leading-tight">Price Suggestion</h3>
              {listingTitle && (
                <p className="text-xs text-zinc-500 truncate max-w-[200px]">{listingTitle}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-zinc-400 text-sm">Analysing market data…</p>
            </div>
          ) : (
            <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">
              {suggestion || 'No suggestion available.'}
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
