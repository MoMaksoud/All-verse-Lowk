'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, DollarSign } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';

interface ListingPreviewCardProps {
  listingId: string;
  className?: string;
  onError?: () => void;
}

export function ListingPreviewCard({ listingId, className = '', onError }: ListingPreviewCardProps) {
  const [listing, setListing] = useState<SimpleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId || listingId.trim() === '') {
        console.warn('ListingPreviewCard: Invalid listingId provided');
        setError(true);
        setLoading(false);
        onError?.();
        return;
      }

      try {
        setLoading(true);
        setError(false);
        
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet(`/api/listings/${listingId}`, { requireAuth: false });
        
        if (response.ok) {
          const data = await response.json();
          // API returns data directly, not wrapped in { data: ... }
          if (data && data.id) {
            setListing(data);
          } else {
            console.warn('ListingPreviewCard: Invalid listing data received', data);
            setError(true);
            onError?.();
          }
        } else {
          // Log error once, then call onError callback if provided
          if (response.status === 404) {
            // Only log 404 once to avoid spam
            if (!error) {
              console.warn('ListingPreviewCard: Listing not found', listingId);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('ListingPreviewCard: Failed to fetch listing', {
              status: response.status,
              listingId,
              error: errorData
            });
          }
          setError(true);
          onError?.();
        }
      } catch (err) {
        // Only log error once to avoid spam
        if (!error) {
          console.error('ListingPreviewCard: Error fetching listing', {
            listingId,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
        setError(true);
        onError?.();
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]); // Only depend on listingId - onError is a callback prop

  const formatPrice = (price: string | number): string => {
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`;
    }
    const numPrice = parseFloat(price.toString().replace(/[^0-9.-]+/g, ''));
    if (!isNaN(numPrice)) {
      return `$${numPrice.toLocaleString()}`;
    }
    return price.toString();
  };

  if (loading) {
    return (
      <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-20 bg-zinc-700 rounded"></div>
          <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
          <div className="h-3 bg-zinc-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className={`bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 ${className}`}>
        <p className="text-zinc-400 text-sm">Listing unavailable</p>
      </div>
    );
  }

  return (
    <Link 
      href={`/listings/${listingId}`}
      className={`block bg-zinc-800/50 border border-zinc-700 hover:border-accent-500/50 rounded-lg overflow-hidden transition-all duration-200 ${className}`}
    >
      <div className="flex gap-3 p-3">
        {/* Listing Image */}
        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-zinc-900">
          {listing.photos?.[0] ? (
            <Image
              src={listing.photos[0]}
              alt={listing.title}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
              No Image
            </div>
          )}
        </div>

        {/* Listing Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-white line-clamp-2 flex-1">
              {listing.title}
            </h4>
            <ExternalLink className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3 h-3 text-accent-400" />
            <span className="text-sm font-semibold text-accent-400">
              {formatPrice(listing.price)}
            </span>
          </div>

          {listing.category && (
            <p className="text-xs text-zinc-400 truncate">
              {listing.category}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

