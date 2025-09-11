'use client';

import React, { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, Star, Clock, X, MapPin, ShoppingCart } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { VoiceInputButton, VoiceInputStatus } from '@/components/VoiceInputButton';
import { formatLocation } from '@/lib/location';
import { useAuth } from '@/contexts/AuthContext';

interface ListingCardProps {
  listing: SimpleListing;
}

export const ListingCard = memo(function ListingCard({ listing }: ListingCardProps) {
  const { currentUser } = useAuth();
  const [isFavorited, setIsFavorited] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return favorites.includes(listing.id);
      } catch {
        return false;
      }
    }
    return false;
  });
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please sign in to add items to cart');
      return;
    }

    setAddingToCart(true);
    try {
      const response = await fetch('/api/carts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify({
          listingId: listing.id,
          sellerId: listing.sellerId || 'test-seller',
          qty: 1,
          priceAtAdd: listing.price,
        }),
      });

      if (response.ok) {
        alert('Added to cart!');
      } else {
        alert('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error adding to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      let updatedFavorites;
      
      if (isFavorited) {
        updatedFavorites = favorites.filter((id: string) => id !== listing.id);
        showToast('Removed from favorites', 'success');
      } else {
        updatedFavorites = [...favorites, listing.id];
        showToast('Added to favorites', 'success');
      }
      
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('Error updating favorites:', error);
      showToast('Failed to update favorites', 'error');
    }
  }, [isFavorited, listing.id]);

  const handleMessageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    setShowMessageModal(true);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (message.trim()) {
      showToast('Message sent!', 'success');
      setMessage('');
      setShowMessageModal(false);
    }
  }, [message]);

  const handleVoiceResult = (text: string) => {
    setMessage(text);
    setVoiceTranscript(text);
    setVoiceError(null);
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    setIsVoiceListening(false);
  };

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }, []);

  return (
    <>
      <Link href={`/listings/${listing.id}`} className="group h-full">
        <div className="card hover:scale-105 transition-all duration-200 cursor-pointer overflow-hidden h-full flex flex-col">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-dark-700 flex-shrink-0">
            {listing.photos && listing.photos.length > 0 && listing.photos[0] ? (
              <Image
                src={listing.photos[0]}
                alt={listing.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                priority={false}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
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
            <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            
            {/* Message Button */}
            <button 
              onClick={handleMessageClick}
              className="absolute top-3 left-3 btn-ghost p-2 rounded-xl backdrop-blur-sm bg-dark-800/50 hover:bg-dark-700/50 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4 text-gray-300" />
            </button>

            {/* Add to Cart Button */}
            <button 
              onClick={addToCart}
              disabled={addingToCart}
              className="absolute top-12 left-3 btn-ghost p-2 rounded-xl backdrop-blur-sm bg-dark-800/50 hover:bg-dark-700/50 transition-all duration-200 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4 text-gray-300" />
            </button>
            
            {/* Favorite Button */}
            <button 
              onClick={handleFavoriteClick}
              className={`absolute top-3 right-3 btn-ghost p-2 rounded-xl backdrop-blur-sm transition-all duration-200 ${
                isFavorited 
                  ? 'bg-red-500/80 hover:bg-red-600/80' 
                  : 'bg-dark-800/50 hover:bg-dark-700/50'
              }`}
            >
              <Heart className={`w-4 h-4 transition-all duration-200 ${
                isFavorited ? 'text-white fill-current' : 'text-gray-300'
              }`} />
            </button>
            
            {/* Price Badge */}
            <div className="absolute bottom-3 left-3">
              <div className="bg-accent-500 text-white px-3 py-1 rounded-xl text-sm font-semibold">
                ${listing.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col flex-grow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-accent-400 transition-colors">
                {listing.title}
              </h3>
            </div>
            
            <p className="text-gray-400 text-sm line-clamp-2 mb-3 flex-grow">
              {listing.description}
            </p>
            
            {/* Location */}
            {listing.location && (
              <div className="flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {formatLocation(listing.location)}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-auto">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-accent-400 fill-current" />
                <span className="text-sm text-gray-300">4.5</span>
              </div>
              <span className="text-gray-500">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">{new Date(listing.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-md w-full border border-dark-600">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Message Seller
                </h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 text-sm mb-2">About: {listing.title}</p>
                <p className="text-gray-400 text-xs">Price: ${listing.price.toLocaleString()}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Message
                </label>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! I'm interested in your item..."
                    rows={4}
                    className="w-full px-3 py-2 pr-12 border border-dark-600 rounded-md text-sm bg-dark-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                  />
                  <div className="absolute bottom-2 right-2">
                    <VoiceInputButton
                      onResult={handleVoiceResult}
                      onError={handleVoiceError}
                      size="sm"
                      className="bg-gray-600 hover:bg-gray-500"
                    />
                  </div>
                </div>
                
                {/* Voice Input Status */}
                <VoiceInputStatus 
                  isListening={isVoiceListening}
                  transcript={voiceTranscript}
                  error={voiceError}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
