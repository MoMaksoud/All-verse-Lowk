'use client';

import React, { useState, useCallback, memo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, Star, Clock, X, MapPin, ShoppingCart } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { VoiceInputButton, VoiceInputStatus } from '@/components/VoiceInputButton';
import { formatLocation } from '@/lib/location';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';

interface ListingCardProps {
  listing: SimpleListing;
}

export const ListingCard = memo(function ListingCard({ listing }: ListingCardProps) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showMessageModal) {
        setShowMessageModal(false);
      }
    };

    if (showMessageModal) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showMessageModal]);

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      showError('Sign In Required', 'Please sign in to add items to cart');
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
        showSuccess('Added to Cart!', 'Item has been added to your cart');
      } else {
        showError('Failed to Add', 'Unable to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError('Error', 'Failed to add item to cart');
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
        showSuccess('Removed from favorites');
      } else {
        updatedFavorites = [...favorites, listing.id];
        showSuccess('Added to favorites');
      }
      
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error('Error updating favorites:', error);
      showError('Failed to update favorites');
    }
  }, [isFavorited, listing.id]);

  const handleMessageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    setShowMessageModal(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    
    if (!currentUser) {
      showError('Sign In Required', 'Please sign in to message sellers.');
      return;
    }

    if (!listing.sellerId) {
      showError('Error', 'Unable to find seller information.');
      return;
    }

    try {
      await startChat({
        listingId: listing.id,
        sellerId: listing.sellerId,
        listingTitle: listing.title,
        listingPrice: listing.price,
        initialMessage: message.trim(),
      });
      
      setMessage('');
      setShowMessageModal(false);
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message', 'Please try again later.');
    }
  }, [message, currentUser, listing, startChat, showError]);

  const handleVoiceResult = (text: string) => {
    setMessage(text);
    setVoiceTranscript(text);
    setVoiceError(null);
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    setIsVoiceListening(false);
  };


  return (
    <>
      <Link href={`/listings/${listing.id}`} className="group/card h-full">
        <div className="listing-container">
          {/* Image Section with Overlay */}
          <div className="image-section relative overflow-hidden rounded-t-2xl">
            {listing.photos && listing.photos.length > 0 && listing.photos[0] ? (
              <Image
                src={listing.photos[0]}
                alt={listing.title}
                width={400}
                height={300}
                className="w-full h-full object-cover bg-slate-900"
                priority={false}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-dark-700 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-sm">No Image</div>
                </div>
              </div>
            )}

            {/* Readability gradient */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Rating/Date chip with hover expansion */}
            <div className="absolute bottom-3 right-3 z-20 inline-flex items-center rounded-full bg-black/60 text-white px-2.5 py-1 backdrop-blur transition-all duration-500 ease-in-out shadow">
              {/* Rating always visible */}
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                <Star className="w-3 h-3 fill-current text-yellow-400" />
                4.5
              </span>

              {/* Date expands on hover */}
              {listing.createdAt && (
                <span className="ml-2 overflow-hidden max-w-0 opacity-0 translate-x-2 group-hover/card:max-w-[160px] group-hover/card:opacity-100 group-hover/card:translate-x-0 transition-all duration-500 ease-in-out whitespace-nowrap text-sm">
                  <Clock className="w-3 h-3 mr-1 inline" />
                  {new Date(listing.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="content-area">
            <h3 className="group-hover:text-accent-400 transition-colors">
              {listing.title}
            </h3>
            
            <p className="text-gray-400 text-sm leading-relaxed">
              {listing.description}
            </p>
            
            {/* Price and Category */}
            <div className="price-category">
              <span className="price">${listing.price.toLocaleString()}</span>
              <span className="category">{listing.category}</span>
              <span className="condition">Like New</span>
            </div>
            
            {/* Location */}
            {listing.location && (
              <div className="flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {formatLocation(listing.location)}
                </span>
              </div>
            )}

            {/* Action Icons - Centered at Bottom */}
            <div className="action-icons">
              <button 
                onClick={addToCart}
                disabled={addingToCart}
                className="p-2 rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className={`w-4 h-4 ${addingToCart ? 'text-accent-500' : 'text-gray-400'}`} />
              </button>
              <button 
                onClick={handleMessageClick}
                className="p-2 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={handleFavoriteClick}
                className={`p-2 rounded-lg hover:bg-dark-600 transition-colors ${
                  isFavorited ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                <Heart className={`w-4 h-4 transition-all duration-200 ${
                  isFavorited ? 'text-red-500 fill-current' : 'text-gray-400'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </Link>

      {/* Message Modal */}
      {showMessageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMessageModal(false);
            }
          }}
        >
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
