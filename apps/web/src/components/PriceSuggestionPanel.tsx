'use client';

import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { ListingWithSeller } from '@marketplace/types';
import { formatCurrency } from '@marketplace/lib';

interface PriceSuggestionPanelProps {
  listing: ListingWithSeller;
  onClose: () => void;
  onSuggestionSubmitted: (suggestion: any) => void; // Assuming PriceSuggestion type is not directly imported here
}

export function PriceSuggestionPanel({
  listing,
  onClose,
  onSuggestionSubmitted,
}: PriceSuggestionPanelProps) {
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!suggestedPrice || !reason) return;

    setLoading(true);
    try {
      const response = await fetch('/api/prices/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: listing.title,
          description: listing.description,
          category: listing.category
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        onSuggestionSubmitted({
          suggestedPrice: parseFloat(suggestedPrice),
          reason: reason,
          aiSuggestion: data.suggestion
        });
      } else {
        console.error('Error getting AI price suggestion:', data.error);
        // Fallback to manual suggestion
        onSuggestionSubmitted({
          suggestedPrice: parseFloat(suggestedPrice),
          reason: reason,
          aiSuggestion: null
        });
      }
    } catch (error) {
      console.error('Error submitting price suggestion:', error);
      // Fallback to manual suggestion
      onSuggestionSubmitted({
        suggestedPrice: parseFloat(suggestedPrice),
        reason: reason,
        aiSuggestion: null
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Suggest a Price
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">Current Price</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(listing.price, listing.currency)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Suggested Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Your Suggestion
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you think this price is fair..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !suggestedPrice || !reason}
                className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
