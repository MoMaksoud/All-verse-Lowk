'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, MapPin, Eye, Star, MessageCircle, DollarSign, X, Edit, Trash2, ArrowLeft, Clock, Tag } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showPricePanel, setShowPricePanel] = useState(false);
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
  }, [isFavorited, listing]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowShareModal(true);
  }, []);

  const handleMessageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowMessageModal(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim()) return;
    
    try {
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Message sent successfully!', 'success');
      setMessage('');
      setShowMessageModal(false);
    } catch (error) {
      showToast('Failed to send message', 'error');
    }
  }, [message]);

  const handleSuggestPrice = useCallback(async () => {
    if (!listing) return;
    
    try {
      const response = await fetch('/api/prices/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: listing.title,
          description: listing.description,
          photos: listing.photos,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        showToast(`Suggested price: ${formatCurrency(data.price)}`, 'success');
      } else {
        throw new Error('Failed to get price suggestion');
      }
    } catch (error) {
      console.error('Error getting price suggestion:', error);
      showToast('Failed to get price suggestion', 'error');
    }
  }, [listing]);

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
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <LoadingSpinner size="lg" text="Loading listing details..." />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
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
              <button
                onClick={handleShareClick}
                className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-300" />
              </button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Photo Gallery */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
              <div className="relative aspect-[4/3] bg-dark-700 max-w-2xl mx-auto">
                {listing.photos && listing.photos.length > 0 && listing.photos[selectedImage] ? (
                  <Image
                    src={listing.photos[selectedImage]}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/600x450/1e293b/64748b?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dark-700">
                    <div className="text-center text-gray-400">
                      <div className="text-5xl mb-3">📦</div>
                      <div className="text-base">No Image Available</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail Navigation */}
              {listing.photos && listing.photos.length > 1 && (
                <div className="p-4 border-t border-dark-700">
                  <div className="flex gap-2 overflow-x-auto justify-center">
                    {listing.photos.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                          selectedImage === index ? 'border-accent-500' : 'border-dark-600'
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
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-accent-500" />
                  <span className="text-sm text-gray-400 capitalize">{listing.category}</span>
                </div>
                <h1 className="text-5xl font-bold text-white mb-4">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatRelativeTime(listing.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>4.5 (12 reviews)</span>
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <h3 className="text-xl font-semibold text-white mb-4">Description</h3>
                <p className="text-gray-300 leading-relaxed text-lg">{listing.description}</p>
              </div>
            </div>

            {/* Seller Information */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Seller Information</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-accent-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">U</span>
                  </div>
                  <div>
                    <p className="font-medium text-white text-lg">Marketplace User</p>
                    <p className="text-sm text-gray-400">Member since 2024</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-300">4.8 (127 reviews)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleMessageClick}
                  className="btn btn-outline flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact Seller
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price and Actions */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-5 sticky top-6">
              <div className="text-center mb-5">
                <div className="text-3xl font-bold text-accent-500 mb-1">
                  {formatCurrency(listing.price)}
                </div>
                <p className="text-sm text-gray-400">Current asking price</p>
              </div>


              <div className="space-y-2">
                <button className="btn btn-primary w-full py-3 text-base font-medium">
                  Buy Now
                </button>
                <button
                  onClick={handleSuggestPrice}
                  className="btn btn-secondary w-full py-3 text-base flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Suggest Price
                </button>
                <button
                  onClick={handleMessageClick}
                  className="btn btn-outline w-full py-3 text-base flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message Seller
                </button>
              </div>

              <div className="mt-5 pt-5 border-t border-dark-700">
                <h4 className="font-medium text-white mb-3 text-sm">Quick Actions</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="w-full flex items-center gap-2 text-gray-300 hover:text-white transition-colors py-2 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Listing
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors py-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Listing
                  </button>
                </div>
              </div>
            </div>
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

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Share Listing</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="w-full btn btn-outline text-left"
              >
                Copy Link
              </button>
              <button
                onClick={() => copyToClipboard(`${listing.title} - ${formatCurrency(listing.price)}`)}
                className="w-full btn btn-outline text-left"
              >
                Copy Title & Price
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
    </div>
  );
}