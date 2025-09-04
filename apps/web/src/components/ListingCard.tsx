'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Eye, MapPin } from 'lucide-react';
import { Listing } from '@marketplace/types';
import { formatCurrency, formatRelativeTime } from '@marketplace/lib';

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

export function ListingCard({ listing, className = '' }: ListingCardProps) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className={`group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 ${className}`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-2 right-2">
            <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
              <Heart className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">SOLD</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
              {listing.title}
            </h3>
          </div>
          
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {formatCurrency(listing.price, listing.currency)}
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{listing.location}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{listing.views} views</span>
            </div>
            <span>{formatRelativeTime(listing.createdAt)}</span>
          </div>
          
          {/* Seller info */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full overflow-hidden mr-2">
                <Image
                  src={listing.seller.avatar || ''}
                  alt={listing.seller.displayName}
                  width={24}
                  height={24}
                  className="object-cover"
                />
              </div>
              <span className="text-sm text-gray-600">{listing.seller.displayName}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
