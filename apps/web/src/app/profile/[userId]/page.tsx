'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ListingCard from '@/components/ListingCard';
import { ProfilePicture } from '@/components/ProfilePicture';
import { SimpleListing } from '@marketplace/types';

interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;
  createdAt?: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.userId) return;

      try {
        setLoading(true);
        const { apiGet } = await import('@/lib/api-client');

        // Fetch user profile
        const profileResponse = await apiGet(`/api/profile?userId=${params.userId}`, { requireAuth: false });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile({
            id: params.userId as string,
            username: profileData.data?.username || 'User',
            displayName: profileData.data?.displayName,
            profilePicture: profileData.data?.profilePicture,
            bio: profileData.data?.bio,
            createdAt: profileData.data?.createdAt,
          });
        } else if (profileResponse.status === 404) {
          // Profile not found - create minimal profile
          setProfile({
            id: params.userId as string,
            username: 'User',
          });
        }

        // Fetch user's listings - query listings collection where sellerId == userId
        const listingsResponse = await apiGet(`/api/listings?sellerId=${params.userId}&limit=100`, { requireAuth: false });

        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          // API returns { data: [...], pagination: {...} }
          const fetchedListings = (listingsData.data || []) as SimpleListing[];
          setListings(fetchedListings);
        } else {
          const errorData = await listingsResponse.json().catch(() => ({}));
          console.warn('Failed to fetch listings:', listingsResponse.status, errorData);
          setListings([]);
        }
      } catch (error) {
        console.warn('Error fetching profile data:', error);
        setProfile({
          id: params.userId as string,
          username: 'User',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.userId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6" aria-busy="true" aria-label="Loading profile">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 animate-pulse rounded-full bg-zinc-100" />
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">This profile isn’t available</h1>
        <p className="mt-2 text-zinc-600">The link may be wrong, or the account may no longer exist.</p>
        <Link href="/listings" className="btn btn-primary mt-8 self-start">Browse listings</Link>
      </div>
    );
  }

  const memberSince = formatDate(profile.createdAt);

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft strokeWidth={1.75} className="h-4 w-4" />
        Back
      </button>

      <header className="mt-8 flex flex-col gap-6 border-b border-zinc-200 pb-8 sm:flex-row sm:items-start">
        <ProfilePicture
          src={profile.profilePicture}
          alt={profile.username}
          name={profile.username}
          size="xl"
        />
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-zinc-950">
            {profile.displayName || profile.username}
          </h1>
          {memberSince && <p className="mt-1 text-sm text-zinc-500">Member since {memberSince}</p>}
          {profile.bio && <p className="mt-4 max-w-[65ch] leading-relaxed text-zinc-600">{profile.bio}</p>}
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-950">
          {listings.length === 1 ? '1 listing' : `${listings.length} listings`}
        </h2>

        {listings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-8">
            <p className="text-zinc-600">Nothing listed right now. Check back later.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                variant="grid"
                id={listing.id}
                title={listing.title}
                description=""
                price={listing.price}
                category={listing.category || ''}
                imageUrl={listing.photos?.[0] || '/default-avatar.png'}
                sellerId={listing.sellerId}
                sellerProfile={(listing as any).sellerProfile}
                sold={(listing as any).sold}
                soldThroughAllVerse={(listing as any).soldThroughAllVerse}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
