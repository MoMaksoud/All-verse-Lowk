'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, MapPin, Eye, Star, MessageCircle, DollarSign, X, Edit, Trash2 } from 'lucide-react';
import { SimpleListing } from '@marketplace/types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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
  const [listing, setListing] = useState<SimpleListing | null>(null);
  const [priceSuggestions, setPriceSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showPricePanel, setShowPricePanel] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!params.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/listings/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setListing(data);
      } else {
        console.error('Error fetching listing:', data.error);
        setListing(null);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFavoriteClick = useCallback(() => {
    setIsFavorited(!isFavorited);
    showToast(isFavorited ? 'Removed from favorites' : 'Added to favorites', 'success');
  }, [isFavorited]);

  const handleShareClick = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const handleMessageClick = useCallback(() => {
    setShowMessageModal(true);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (message.trim()) {
      showToast('Message sent!', 'success');
      setMessage('');
      setShowMessageModal(false);
    }
  }, [message]);

  const handleBuyNow = useCallback(() => {
    showToast('Redirecting to checkout...', 'success');
    // In a real app, this would redirect to a checkout page
    setTimeout(() => {
      showToast('Checkout feature coming soon!', 'success');
    }, 1000);
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
  }, []);

  const handleDeleteListing = useCallback(async () => {
    if (!listing) return;
    
    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        showToast('Listing deleted successfully!', 'success');
        router.push('/listings');
      } else {
        throw new Error('Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      showToast('Failed to delete listing', 'error');
    }
  }, [listing, router]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" text="Loading listing details..." />
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
              <div className="relative aspect-square bg-gray-100">
                {listing.photos && listing.photos.length > 0 && listing.photos[selectedImage] ? (
                  <Image
                    src={listing.photos[selectedImage]}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/300x300/1e293b/64748b?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">📦</div>
                      <div className="text-sm">No Image Available</div>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button 
                    onClick={handleFavoriteClick}
                    className={`p-2 rounded-full hover:bg-white transition-colors ${
                      isFavorited ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-sm'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  <button 
                    onClick={handleShareClick}
                    className="p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                  >
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Thumbnail Navigation */}
              {listing.photos && listing.photos.length > 1 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2 mt-4">
                    {listing.photos.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          selectedImage === index ? 'border-blue-500' : 'border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${listing.title} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/64x64/1e293b/64748b?text=?';
                          }}
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
                    {formatCurrency(listing.price)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Condition</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    <span>{listing.category}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="btn btn-outline flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn btn-outline text-red-400 border-red-400 hover:bg-red-400 hover:text-white flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-500 mb-6">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{/* <span>{listing.location}</span> */}</span>
                <span className="mx-2">•</span>
                <Eye className="w-4 h-4 mr-1" />
                <span>{/* <span>{listing.views} views</span> */}</span>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://via.placeholder.com/40x40/1e293b/64748b?text=U"
                    alt="Seller"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium text-white">Seller</p>
                    <p className="text-sm text-gray-300">
                      Member since {new Date().getFullYear()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowChatWidget(true)}
                    className="btn btn-outline flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </button>
                  <button 
                    onClick={handleMessageClick}
                    className="btn btn-primary flex items-center gap-2"
                  >
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
                {formatCurrency(listing.price)}
              </div>
              
              <button
                onClick={handleBuyNow}
                className="w-full btn btn-primary mb-4"
              >
                Buy Now
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

      {/* Price Suggestion Modal - Simplified */}
      {showPricePanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Price Suggestion</h3>
                <button
                  onClick={() => setShowPricePanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">Price suggestion feature coming soon!</p>
              <button
                onClick={() => setShowPricePanel(false)}
                className="w-full btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Message Seller
                </h3>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">About: {listing.title}</p>
                <p className="text-gray-500 text-xs">Price: {formatCurrency(listing.price)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! I'm interested in your item..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Share Listing
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-2">{listing.title}</p>
                <p className="text-gray-500 text-xs">{formatCurrency(listing.price)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.href : '')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(`https://twitter.com/intent/tweet?text=Check out this item: ${listing.title}&url=${encodeURIComponent(window.location.href)}`, '_blank');
                    }
                  }}
                  className="flex-1 btn btn-outline"
                >
                  Share on Twitter
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
                    }
                  }}
                  className="flex-1 btn btn-outline"
                >
                  Share on Facebook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Listing
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to delete "{listing?.title}"? This action cannot be undone.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    handleDeleteListing();
                  }}
                  className="flex-1 btn bg-red-500 text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget - Simplified */}
      {showChatWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Chat with Seller</h3>
                <button
                  onClick={() => setShowChatWidget(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">Chat feature coming soon!</p>
              <button
                onClick={() => setShowChatWidget(false)}
                className="w-full btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
