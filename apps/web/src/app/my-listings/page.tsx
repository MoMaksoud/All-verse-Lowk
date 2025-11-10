'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmationModal } from '@/components/ConfirmationModal';
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
import { useFirebaseCleanup } from '@/hooks/useFirebaseCleanup';
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
  const { currentUser, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { isDeleting, deleteListing } = useFirebaseCleanup();

  useEffect(() => {
    console.log('🔍 Auth state check:', {
      authLoading,
      currentUser: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
      hasUid: !!currentUser?.uid
    });

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }

    if (!currentUser?.uid) {
      console.warn('⚠️ No current user, cannot fetch listings');
      console.warn('⚠️ Auth state:', { currentUser, authLoading });
      setError('Please sign in to view your listings');
      setLoading(false);
      return;
    }
    console.log('✅ User authenticated, fetching listings for:', currentUser.uid);
    fetchMyListings();
  }, [currentUser, authLoading]);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Starting fetchMyListings...');
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/my-listings');
      
      console.log('🔍 API response status:', response.status);
      console.log('🔍 API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 401) {
        // User not authenticated - redirect to login or show message
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ 401 Unauthorized:', errorData);
        setError('Please sign in to view your listings');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setListings(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch listings');
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (error instanceof Error && error.message.includes('not authenticated')) {
        setError('Please sign in to view your listings');
      } else {
        setError('Failed to fetch listings');
      }
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

    await deleteListing(
      deleteModal.listingId,
      () => {
        // Success callback
        setListings(prev => prev.filter(listing => listing.id !== deleteModal.listingId));
        setDeleteModal({ isOpen: false, listingId: null, listingTitle: '' });
      },
      (error) => {
        // Error callback - error is already handled by the hook
        console.error('Delete failed:', error);
      }
    );
  };

  const cancelDeleteListing = () => {
    setDeleteModal({ isOpen: false, listingId: null, listingTitle: '' });
  };

  // Wait for auth to finish loading before showing sign-in prompt
  if (authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <Navigation />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
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
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 inline-flex items-center gap-2"
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
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">My Listings</h1>
            <p className="text-zinc-400 text-lg">Manage your marketplace listings</p>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
                <span className="text-zinc-300 font-semibold">
                  {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
                </span>
              </div>
              {listings.length > 0 && (
                <div className="text-sm text-zinc-500">
                  {listings.filter(l => l.status === 'active').length} active
                </div>
              )}
            </div>
            <Link
              href="/sell"
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" />
              Create New Listing
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-zinc-400 text-lg">Loading your listings...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="border-red-500/20 bg-red-500/5">
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-3">Error Loading Listings</h2>
                <p className="text-zinc-400 mb-6 text-lg">{error}</p>
                <button
                  onClick={fetchMyListings}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25"
                >
                  Try Again
                </button>
              </div>
            </Card>
          ) : listings.length === 0 ? (
            <Card className="border-zinc-700 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50">
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">No Listings Yet</h2>
                <p className="text-zinc-400 mb-8 text-lg max-w-md mx-auto">Start selling by creating your first listing. It's easy and takes just a few minutes!</p>
                <Link
                  href="/sell"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Listing
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="group hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl overflow-hidden mb-4 group-hover:rounded-2xl transition-all duration-300">
                    {listing.photos && listing.photos.length > 0 ? (
                      <Image
                        src={listing.photos[0]}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x300/1e293b/64748b?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <div className="text-center text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-60" />
                          <div className="text-sm font-medium">No Image</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full border backdrop-blur-sm text-xs font-semibold shadow-lg transition-all duration-300 group-hover:scale-105 ${getStatusColor(listing.status)}`}>
                      {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                    </div>

                    {/* Photo Count Badge */}
                    {listing.photos && listing.photos.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium border border-white/20">
                        {listing.photos.length} photos
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-zinc-100 font-semibold text-lg line-clamp-2 mb-2 group-hover:text-white transition-colors">
                        {listing.title}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed group-hover:text-zinc-300 transition-colors">
                        {listing.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="capitalize font-medium">{listing.category}</span>
                      </div>
                      <div className="text-blue-400 font-bold text-lg group-hover:text-blue-300 transition-colors">
                        {formatCurrency(listing.price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Created {formatDate(listing.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-zinc-800 group-hover:border-zinc-700 transition-colors">
                    <div className="flex gap-2">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      <Link
                        href={`/listings/${listing.id}/edit`}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md hover:shadow-blue-500/25"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 hover:shadow-md hover:shadow-red-500/25"
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
