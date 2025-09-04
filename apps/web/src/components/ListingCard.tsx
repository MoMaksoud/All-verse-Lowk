'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Star, Clock } from 'lucide-react';
import { Listing } from '@marketplace/types';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/listings/${listing.id}`} className="group">
      <div className="card hover:scale-105 transition-all duration-200 cursor-pointer overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-2xl">
          <img
            src={listing.images[0] || 'https://via.placeholder.com/300x300/1e293b/64748b?text=No+Image'}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          
          {/* Favorite Button */}
          <button className="absolute top-3 right-3 btn-ghost p-2 rounded-xl bg-dark-800/50 backdrop-blur-sm hover:bg-dark-700/50">
            <Heart className="w-4 h-4" />
          </button>
          
          {/* Price Badge */}
          <div className="absolute bottom-3 left-3">
            <div className="bg-accent-500 text-white px-3 py-1 rounded-xl text-sm font-semibold">
              ${listing.price}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-accent-400 transition-colors">
              {listing.title}
            </h3>
          </div>
          
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
            {listing.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-accent-400 fill-current" />
                <span className="text-sm text-gray-300">{listing.rating || 4.5}</span>
              </div>
              <span className="text-gray-500">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">{listing.createdAt}</span>
              </div>
            </div>
            
            <button className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50">
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
