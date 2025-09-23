'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { DynamicBackground } from '@/components/DynamicBackground';
import { Card } from '@/components/ui/Card';
import { 
  Package, 
  Edit, 
  Trash2, 
  Eye, 
  Plus,
  Loader2,
  Calendar,
  DollarSign,
  Tag,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import Image from 'next/image';

interface MyListing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  sellerId: string;
  status: string;
  location?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'text-green-400 bg-green-900/20 border-green-500/20';
    case 'sold':
      return 'text-blue-400 bg-blue-900/20 border-blue-500/20';
    case 'draft':
      return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/20';
    case 'inactive':
      return 'text-gray-400 bg-gray-900/20 border-gray-500/20';
    default:
      return 'text-gray-400 bg-gray-900/20 border-gray-500/20';
  }
};

export default function MyListingsPage() {
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    listingId: string | null;
    listingTitle: string;
  }>({
    isOpen: false,
    listingId: null,
    listingTitle: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (currentUser?.uid) {
      fetchMyListings();
    }
  }, [currentUser]);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/my-listings', {
        headers: {
          'x-user-id': currentUser?.uid || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data || []);
      } else {
        setError('Failed to fetch listings');
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError('Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;

    setDeleteModal({
      isOpen: true,
      listingId,
      listingTitle: listing.title
    });
  };

  const confirmDeleteListing = async () => {
    if (!deleteModal.listingId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/listings/${deleteModal.listingId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.uid || '',
        },
      });

      if (response.ok) {
        setListings(prev => prev.filter(listing => listing.id !== deleteModal.listingId));
        setDeleteModal({ isOpen: false, listingId: null, listingTitle: '' });
        showSuccess('Listing Deleted', 'Your listing has been successfully deleted');
      } else {
        showError('Delete Failed', 'Unable to delete listing. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      showError('Delete Failed', 'An error occurred while deleting the listing');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteListing = () => {
    setDeleteModal({ isOpen: false, listingId: null, listingTitle: '' });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <Navigation />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Please sign in to view your listings</h1>
            <Link
              href="/signin"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      <Navigation />
      
      <div className="relative z-10 min-h-screen pt-20 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-2">My Listings</h1>
            <p className="text-zinc-400">Manage your marketplace listings</p>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-zinc-300">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
            </div>
            <Link
              href="/sell"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Listing
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <Card>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Error Loading Listings</h2>
                <p className="text-zinc-400 mb-4">{error}</p>
                <button
                  onClick={fetchMyListings}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </Card>
          ) : listings.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No listings found</h2>
                <p className="text-zinc-400 mb-6">You haven't created any listings yet.</p>
                <Link
                  href="/sell"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Create Your First Listing
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id}>
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-zinc-800 rounded-xl overflow-hidden mb-4">
                    {listing.photos && listing.photos.length > 0 ? (
                      <Image
                        src={listing.photos[0]}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <div className="text-center text-zinc-400">
                          <Package className="w-12 h-12 mx-auto mb-2" />
                          <div className="text-sm">No Image</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(listing.status)}`}>
                      {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-zinc-100 font-medium text-lg line-clamp-2 mb-1">
                        {listing.title}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-2">
                        {listing.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Tag className="w-3 h-3" />
                        <span className="capitalize">{listing.category}</span>
                      </div>
                      <div className="text-blue-500 font-semibold">
                        {formatCurrency(listing.price)}
                      </div>
                    </div>

                    {listing.location && (
                      <div className="flex items-center gap-1 text-sm text-zinc-400">
                        <MapPin className="w-3 h-3" />
                        <span>{listing.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-sm text-zinc-400">
                      <Calendar className="w-3 h-3" />
                      <span>Created {formatDate(listing.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex gap-2">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        className="bg-red-600 hover:bg-red-500 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={cancelDeleteListing}
        onConfirm={confirmDeleteListing}
        title="Delete Listing"
        message={`Are you sure you want to delete "${deleteModal.listingTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
