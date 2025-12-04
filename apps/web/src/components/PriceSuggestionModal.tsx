import React from 'react';
import { X, DollarSign, Lightbulb, TrendingUp } from 'lucide-react';

interface PriceSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: string;
  loading?: boolean;
}

export function PriceSuggestionModal({ isOpen, onClose, suggestion, loading = false }: PriceSuggestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 grid place-items-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-100">AI Price Suggestion</h3>
              <p className="text-sm text-zinc-400">Powered by Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-zinc-400">Analyzing market data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Suggestion */}
              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-zinc-100 font-medium mb-2">Market Analysis</h4>
                    <div className="text-zinc-300 whitespace-pre-line leading-relaxed">
                      {suggestion}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-zinc-100 font-medium mb-2">Pricing Tips</h4>
                    <ul className="text-zinc-300 space-y-1 text-sm">
                      <li>• Consider seasonal demand patterns</li>
                      <li>• Monitor competitor pricing weekly</li>
                      <li>• Adjust prices based on views and inquiries</li>
                      <li>• Use psychological pricing (e.g., $29.99 vs $30)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-4 rounded-xl text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
