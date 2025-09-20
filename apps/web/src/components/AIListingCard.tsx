'use client';

import React from 'react';
import { SimpleListing } from '@marketplace/types';
import { ExternalLink, Heart, ShoppingCart } from 'lucide-react';

interface AIListingCardProps {
  listing: SimpleListing;
  onViewDetails: (listing: SimpleListing) => void;
  onAddToCart?: (listing: SimpleListing) => void;
  onAddToFavorites?: (listing: SimpleListing) => void;
}

export function AIListingCard({ 
  listing, 
  onViewDetails, 
  onAddToCart, 
  onAddToFavorites 
}: AIListingCardProps) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 overflow-hidden hover:border-accent-500/50 transition-all duration-300 group hover:shadow-lg hover:shadow-accent-500/10">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={listing.photos?.[0] || '/placeholder.jpg'}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik04MCA4MEgxMjBWMjAwSDgwVjgwWiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K';
          }}
        />
        
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onAddToFavorites && (
            <button
              onClick={() => onAddToFavorites(listing)}
              className="w-8 h-8 bg-dark-800/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors"
            >
              <Heart className="w-4 h-4 text-white" />
            </button>
          )}
          {onAddToCart && (
            <button
              onClick={() => onAddToCart(listing)}
              className="w-8 h-8 bg-dark-800/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-accent-500/80 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Condition badge */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-accent-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
            {listing.condition}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-accent-400 transition-colors">
            {listing.title}
          </h3>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-accent-400 font-bold text-lg">
              ${listing.price.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <span>by</span>
            <span className="text-white font-medium">{listing.sellerId || 'Seller'}</span>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-3">
            {listing.description}
          </p>
        )}

        {/* Action button */}
        <button
          onClick={() => onViewDetails(listing)}
          className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn hover:shadow-md hover:shadow-accent-500/25"
        >
          <span>View Details</span>
          <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

interface AIListingGridProps {
  listings: SimpleListing[];
  onViewDetails: (listing: SimpleListing) => void;
  onAddToCart?: (listing: SimpleListing) => void;
  onAddToFavorites?: (listing: SimpleListing) => void;
  title?: string;
}

export function AIListingGrid({ 
  listings, 
  onViewDetails, 
  onAddToCart, 
  onAddToFavorites,
  title 
}: AIListingGridProps) {
  if (!listings || listings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {title && (
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-accent-500 rounded-full"></div>
          <h3 className="text-white font-semibold text-xl">{title}</h3>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {listings.map((listing) => (
          <AIListingCard
            key={listing.id}
            listing={listing}
            onViewDetails={onViewDetails}
            onAddToCart={onAddToCart}
            onAddToFavorites={onAddToFavorites}
          />
        ))}
      </div>
    </div>
  );
}
