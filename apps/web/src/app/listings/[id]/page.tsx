'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, MapPin, Eye, Star, MessageCircle, DollarSign } from 'lucide-react';
import { mockApi } from '@marketplace/lib';
import { Listing, PriceSuggestion } from '@marketplace/types';
import { formatCurrency, formatRelativeTime } from '@marketplace/lib';
import { Avatar } from '@marketplace/ui';
import { PriceSuggestionPanel } from '@/components/PriceSuggestionPanel';

export default function ListingDetailPage() {
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [priceSuggestions, setPriceSuggestions] = useState<PriceSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showPricePanel, setShowPricePanel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [listingResponse, suggestionsResponse] = await Promise.all([
          mockApi.getListing(params.id as string),
          mockApi.getPriceSuggestions(params.id as string),
        ]);

        setListing(listingResponse.data);
        setPriceSuggestions(suggestionsResponse.data);
      } catch (error) {
        console.error('Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Found</h1>
          <p className="text-gray-600">The listing you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Photo Gallery */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
              <div className="relative aspect-square">
                <Image
                  src={listing.images[selectedImage]}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                    <Heart className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Thumbnail Navigation */}
              {listing.images.length > 1 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2 overflow-x-auto">
                    {listing.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          selectedImage === index
                            ? 'border-primary-500'
                            : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${listing.title} ${index + 1}`}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Listing Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {listing.title}
                  </h1>
                  <div className="text-3xl font-bold text-primary-600 mb-4">
                    {formatCurrency(listing.price, listing.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Condition</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {listing.condition}
                  </div>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-6">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{listing.location}</span>
                <span className="mx-2">•</span>
                <Eye className="w-4 h-4 mr-1" />
                <span>{listing.views} views</span>
                <span className="mx-2">•</span>
                <span>{formatRelativeTime(listing.createdAt)}</span>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed">{listing.description}</p>
              </div>
            </div>

            {/* Seller Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller</h3>
              <div className="flex items-center">
                <Avatar
                  src={listing.seller.avatar}
                  alt={listing.seller.displayName}
                  size="lg"
                />
                <div className="ml-4">
                  <div className="font-semibold text-gray-900">
                    {listing.seller.displayName}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span>4.8 (127 reviews)</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Member since {new Date(listing.seller.createdAt).getFullYear()}
                  </div>
                </div>
                <div className="ml-auto">
                  <button className="btn btn-outline flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Buy Now Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 sticky top-8">
              <div className="text-3xl font-bold text-primary-600 mb-4">
                {formatCurrency(listing.price, listing.currency)}
              </div>
              
              <button
                disabled
                className="w-full btn btn-primary mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now (Coming Soon)
              </button>
              
              <button
                onClick={() => setShowPricePanel(true)}
                className="w-full btn btn-outline flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Suggest Price
              </button>
            </div>

            {/* Price Suggestions */}
            {priceSuggestions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Price Suggestions
                </h3>
                <div className="space-y-3">
                  {priceSuggestions.slice(0, 3).map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(suggestion.suggestedPrice, suggestion.currency)}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          suggestion.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : suggestion.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {suggestion.status}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {suggestion.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price Suggestion Modal */}
      {showPricePanel && (
        <PriceSuggestionPanel
          listing={listing}
          onClose={() => setShowPricePanel(false)}
          onSuggestionSubmitted={(suggestion) => {
            setPriceSuggestions([suggestion, ...priceSuggestions]);
            setShowPricePanel(false);
          }}
        />
      )}
    </div>
  );
}
