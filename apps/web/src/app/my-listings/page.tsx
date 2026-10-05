'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Package, Loader2, AlertCircle } from 'lucide-react';
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
  sold?: boolean;
  soldThroughAllVerse?: boolean;
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

const getStatusColor = (listing: MyListing) => {
  if (listing.sold) {
    return listing.soldThroughAllVerse
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-zinc-200 bg-zinc-100 text-zinc-700';
  }
  switch (listing.status) {
    case 'active':
      return 'border-primary-200 bg-primary-50 text-primary-700';
    case 'draft':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-600';
  }
};

const getStatusLabel = (listing: MyListing) => {
  if (listing.sold) return listing.soldThroughAllVerse ? 'Sold through AllVerse' : 'Sold';
  return listing.status.charAt(0).toUpperCase() + listing.status.slice(1);
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
  const [markSoldModal, setMarkSoldModal] = useState<{
    isOpen: boolean;
    listingId: string | null;
    listingTitle: string;
  }>({ isOpen: false, listingId: null, listingTitle: '' });
  const [markingSold, setMarkingSold] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { isDeleting, deleteListing } = useFirebaseCleanup();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser?.uid) {
      setError('Please sign in to view your listings');
      setLoading(false);
      return;
    }
    fetchMyListings();
  }, [currentUser, authLoading]);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/my-listings');

      if (response.status === 401) {
        // User not authenticated - redirect to login or show message
        const errorData = await response.json().catch(() => ({}));
        console.error('401 Unauthorized:', errorData);
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

  const handleMarkAsSold = (listing: MyListing) => {
    setMarkSoldModal({ isOpen: true, listingId: listing.id, listingTitle: listing.title });
  };

  const confirmMarkAsSold = async () => {
    if (!markSoldModal.listingId) return;
    try {
      setMarkingSold(true);
      const { apiPut } = await import('@/lib/api-client');
      const response = await apiPut(`/api/listings/${markSoldModal.listingId}`, { sold: true });
      if (response.ok) {
        setListings(prev => prev.map(l =>
          l.id === markSoldModal.listingId
            ? { ...l, sold: true, status: 'sold', soldThroughAllVerse: false }
            : l
        ));
        showSuccess('Listing marked as sold. It will stay on your profile.');
        setMarkSoldModal({ isOpen: false, listingId: null, listingTitle: '' });
      } else {
        const err = await response.json().catch(() => ({}));
        showError(err.error || 'Failed to mark as sold');
      }
    } catch (e) {
      showError('Failed to mark as sold');
    } finally {
      setMarkingSold(false);
    }
  };

  const cancelMarkSold = () => {
    setMarkSoldModal({ isOpen: false, listingId: null, listingTitle: '' });
  };
  // Wait for auth to finish loading before showing sign-in prompt
  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6" aria-busy="true" aria-label="Loading your listings">
        <div className="h-8 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="mt-8 h-24 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!currentUser) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your listings</h1>
        <p className="mt-2 text-zinc-600">Sign in to see and manage what you’re selling.</p>
        <Link href="/signin?redirect=/my-listings" className="btn btn-primary mt-8 self-start">
          Sign in
        </Link>
      </div>
    );
  }

  const activeCount = listings.filter(l => l.status === 'active' && !l.sold).length;

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your listings</h1>
          {!loading && !error && (
            <p className="mt-2 text-zinc-600">
              {listings.length === 0
                ? 'Nothing listed yet.'
                : `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'}, ${activeCount} active`}
            </p>
          )}
        </div>
        <Link href="/sell" className="btn btn-primary self-start sm:self-auto">
          New listing
        </Link>
      </header>

      {loading ? (
        <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200" aria-busy="true" aria-label="Loading your listings">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 py-5">
              <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-zinc-100" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-2 font-medium text-red-800">
            <AlertCircle strokeWidth={1.75} className="h-4 w-4" />
            Couldn’t load your listings
          </div>
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={fetchMyListings} className="btn btn-outline">
            Try again
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-10 flex flex-col items-start rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-10">
          <Package strokeWidth={1.5} className="h-8 w-8 text-zinc-500" />
          <h2 className="mt-4 font-semibold text-zinc-950">No listings yet</h2>
          <p className="mt-1 max-w-[44ch] text-sm text-zinc-600">
            Add a few photos and the AI drafts the listing and suggests a price. You review it before anything goes live.
          </p>
          <Link href="/sell" className="btn btn-primary mt-6">Create a listing</Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
          {listings.map((listing, i) => (
            <li key={listing.id} className="reveal py-5" style={{ '--i': i } as React.CSSProperties}>
              <div className="flex gap-4 sm:gap-5">
                <Link href={`/listings/${listing.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-24 sm:w-24">
                  {listing.photos?.[0]?.startsWith('/') || listing.photos?.[0]?.startsWith('http') ? (
                    <Image
                      src={listing.photos[0]}
                      alt=""
                      fill
                      sizes="96px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-xs text-zinc-500">No photo</span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/listings/${listing.id}`} className="truncate font-semibold text-zinc-950 hover:text-primary-700">
                        {listing.title}
                      </Link>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(listing)}`}>
                        {getStatusLabel(listing)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm tabular-nums text-zinc-900">{formatCurrency(listing.price)}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      <span className="capitalize">{listing.category}</span> · Created {formatDate(listing.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
                    <Link href={`/listings/${listing.id}/edit`} className="text-primary-600 hover:text-primary-700">
                      Edit
                    </Link>
                    {!listing.sold && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsSold(listing)}
                        className="text-zinc-700 hover:text-zinc-950"
                        title="I sold this elsewhere"
                      >
                        Mark as sold
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteListing(listing.id)}
                      className="text-red-700 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={cancelDeleteListing}
        onConfirm={confirmDeleteListing}
        title="Delete listing"
        message={`Delete “${deleteModal.listingTitle}”? This can’t be undone.`}
        confirmText="Delete"
        cancelText="Keep it"
        type="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={markSoldModal.isOpen}
        onClose={cancelMarkSold}
        onConfirm={confirmMarkAsSold}
        title="Mark as sold"
        message={`Mark “${markSoldModal.listingTitle}” as sold elsewhere? It stays on your profile, labeled Sold.`}
        confirmText="Mark as sold"
        cancelText="Cancel"
        type="info"
        isLoading={markingSold}
      />
    </div>
  );
}
