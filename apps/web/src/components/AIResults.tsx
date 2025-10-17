"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AiListingsPayloadT } from '@/lib/schemas/aiListings';
import { Star, MapPin, ShoppingCart, Heart, MessageCircle } from 'lucide-react';

interface AIResultsProps {
  data: AiListingsPayloadT;
}

export default function AIResults({ data }: AIResultsProps) {
  console.log('🎯 AIResults received data:', data);
  
  if (!data?.items?.length) {
    console.log('🎯 No items found in data:', { data, itemsLength: data?.items?.length });
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No results found.</div>
        <div className="text-gray-500 text-xs mt-1">Try a different search term</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meta info */}
      <div className="text-sm text-gray-400 mb-4">
        Found {data.meta.total} result{data.meta.total !== 1 ? 's' : ''} for "{data.meta.query}"
      </div>
      
      {/* Grid of listing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.items.map((item: AiListingsPayloadT['items'][0]) => (
          <AICard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

interface AICardProps {
  item: AiListingsPayloadT['items'][0];
}

function AICard({ item }: AICardProps) {
  const [isFavorited, setIsFavorited] = React.useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Add to cart logic here
    console.log('Add to cart:', item.id);
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Message seller logic here
    console.log('Message seller:', item.seller.id);
  };

  return (
    <Link href={item.url} className="group/card h-full">
      <div className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700 hover:border-accent-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/10 h-full flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-square overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="w-full h-full bg-dark-700 flex items-center justify-center">
                      <div class="text-center text-gray-400">
                        <div class="text-4xl mb-2">📦</div>
                        <div class="text-sm">No Image</div>
                      </div>
                    </div>
                  `;
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-dark-700 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📦</div>
                <div className="text-sm">No Image</div>
              </div>
            </div>
          )}

          {/* Badges */}
          {item.badges && item.badges.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {item.badges.map((badge: string, index: number) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    badge === 'Trending' ? 'bg-red-500 text-white' :
                    badge === 'Hot' ? 'bg-orange-500 text-white' :
                    badge === 'Deal' ? 'bg-green-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Rating */}
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur rounded-full px-2 py-1 flex items-center gap-1">
            <Star className="w-3 h-3 fill-current text-yellow-400" />
            <span className="text-white text-xs font-medium">4.5</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-white group-hover/card:text-accent-400 transition-colors line-clamp-2 mb-2">
            {item.title}
          </h3>
          
          <div className="text-accent-400 font-bold text-lg mb-2">
            ${item.price.value.toLocaleString()} {item.price.currency}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span className="px-2 py-1 bg-dark-700 rounded text-xs">
              {item.condition}
            </span>
            {item.category && (
              <span className="px-2 py-1 bg-dark-700 rounded text-xs capitalize">
                {item.category}
              </span>
            )}
          </div>

          {/* Seller and Location */}
          <div className="space-y-1 mb-3">
            <div className="text-sm text-gray-300">
              👤 {item.seller.name || item.seller.id}
            </div>
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                {item.location}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-dark-700">
            <button 
              onClick={handleAddToCart}
              className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
              title="Add to Cart"
            >
              <ShoppingCart className="w-4 h-4 text-gray-400 hover:text-accent-400" />
            </button>
            <button 
              onClick={handleMessageClick}
              className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
              title="Message Seller"
            >
              <MessageCircle className="w-4 h-4 text-gray-400 hover:text-accent-400" />
            </button>
            <button 
              onClick={handleFavoriteClick}
              className={`p-2 rounded-lg hover:bg-dark-600 transition-colors ${
                isFavorited ? 'text-red-500' : 'text-gray-400'
              }`}
              title="Add to Favorites"
            >
              <Heart className={`w-4 h-4 transition-all duration-200 ${
                isFavorited ? 'text-red-500 fill-current' : 'text-gray-400'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
