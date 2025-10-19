'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, MapPin, Star, MessageCircle, X, ArrowLeft, Clock, Tag } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Navigation } from '@/components/Navigation';
import { SellerInfo } from '@/components/SellerInfo';
import { ListingActions } from '@/components/ListingActions';
import { PriceSuggestionModal } from '@/components/PriceSuggestionModal';
import ShareMenu from '@/components/ShareMenu';
import { Card } from '@/components/ui/Card';
import { ListingGallery } from '@/components/ListingGallery';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
  const [listing, setListing] = useState<SimpleListing | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Owner check
  const isOwner = currentUser?.uid && listing?.sellerId && currentUser.uid === listing.sellerId;
  const [isFavorited, setIsFavorited] = useState(() => {
    if (typeof window !== 'undefined' && params.id) {
      try {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return favorites.includes(params.id as string);
      } catch {
        return false;
      }
    }
    return false;
  });
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPriceSuggestionModal, setShowPriceSuggestionModal] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState('');
  const [priceSuggestionLoading, setPriceSuggestionLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const fetchData = useCallback(async () => {
    if (!params.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/listings/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setListing(data);
      } else {
        throw new Error('Failed to fetch listing');
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!listing) return;
    
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
  }, [isFavorited, listing]);

  const handleMessageClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    setShowMessageModal(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    
    if (!listing) {
      showError('Error', 'Listing information not available.');
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
  }, [message, listing, startChat, showError]);

  const handleSuggestPrice = useCallback(async () => {
    if (!listing) return;
    
    setPriceSuggestionLoading(true);
    setShowPriceSuggestionModal(true);
    
    try {
      const response = await fetch('/api/prices/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: listing.title,
          description: listing.description,
          category: listing.category,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.suggestion) {
          setPriceSuggestion(data.suggestion);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get price suggestion');
      }
    } catch (error) {
      console.error('Error getting price suggestion:', error);
      setPriceSuggestion('Sorry, I was unable to generate a price suggestion at this time. Please try again later or consider researching similar listings manually.');
      showError('Failed to get price suggestion');
    } finally {
      setPriceSuggestionLoading(false);
    }
  }, [listing]);

  const addToCart = useCallback(async () => {
    if (!listing) return;
    
    if (!currentUser) {
      showError('Please sign in to add items to cart');
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
        showSuccess('Added to cart!');
      } else {
        showError('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError('Error adding to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [listing, currentUser]);

  const handleDeleteListing = useCallback(async () => {
    if (!listing || !currentUser) return;
    
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.uid,
        },
      });
      
      if (response.ok) {
        showSuccess('Listing deleted successfully!');
        router.push('/listings');
      } else {
        throw new Error('Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      showError('Failed to delete listing');
    }
  }, [listing, currentUser, router]);


  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navigation />
        <LoadingSpinner size="lg" text="Loading listing details..." />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Listing Not Found</h1>
            <p className="text-gray-400">The listing you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/listings')}
              className="mt-4 btn btn-primary"
            >
              Back to Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-4">
              <ShareMenu
                listing={listing}
                align="right"
              />
              <button
                onClick={handleFavoriteClick}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorited ? 'bg-red-500 text-white' : 'bg-dark-800 hover:bg-dark-700 text-gray-300'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photo Gallery */}
            <Card>
              <ListingGallery photos={listing.photos || []} title={listing.title} />
            </Card>

            {/* Listing Details */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-zinc-400 capitalize">{listing.category}</span>
              </div>
              <h1 className="text-2xl font-semibold text-zinc-100 mb-4">
                {listing.title}
              </h1>
              <div>
                <h3 className="text-lg font-medium text-zinc-200 mb-3">Description</h3>
                <p className="text-zinc-300 leading-relaxed">{listing.description}</p>
              </div>
            </Card>

          </div>

          {/* Actions Box - Right Side */}
          <div className="space-y-6">
            <ListingActions
              listing={listing}
              onBuyNow={() => addToCart()}
              onSuggestPrice={() => handleSuggestPrice()}
              onMessageSeller={() => handleMessageClick()}
              onEditListing={() => router.push(`/listings/${listing.id}/edit`)}
              onDeleteListing={() => setShowDeleteModal(true)}
              addingToCart={addingToCart}
              suggestingPrice={priceSuggestionLoading}
              isOwner={isOwner}
            />
            
            {/* Seller Information moved to right sidebar */}
            {!isOwner && (
              <SellerInfo
                seller={{
                  name: "Marketplace User",
                  since: "2024",
                  rating: 4.8,
                  reviews: 127,
                  id: listing.sellerId
                }}
                onContactClick={() => handleMessageClick()}
                currentUserId={currentUser?.uid}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Send Message</h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full h-32 p-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                className="btn btn-primary flex-1"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Delete Listing</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteListing}
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Suggestion Modal */}
      <PriceSuggestionModal
        isOpen={showPriceSuggestionModal}
        onClose={() => setShowPriceSuggestionModal(false)}
        suggestion={priceSuggestion}
        loading={priceSuggestionLoading}
      />
    </div>
  );
}