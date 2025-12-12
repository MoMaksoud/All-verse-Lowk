'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { ListingCard } from '@/components/listings/ListingCard';
import { ProfilePicture } from '@/components/ProfilePicture';
import { normalizeImageSrc } from '@/lib/image-utils';
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
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric"
      }).format(date);
    } catch {
      return '';
    }
  };

  const handleProfileClick = () => {
    router.push(`/profile/${params.userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Profile Header */}
        <div className="bg-dark-800 rounded-2xl p-6 mb-8">
          <div className="flex items-start space-x-6">
            {/* Avatar - clickable */}
            <button 
              onClick={handleProfileClick}
              className="shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-full"
              type="button"
              aria-label="View profile"
            >
              <ProfilePicture
                src={profile.profilePicture}
                alt={profile.username}
                name={profile.username}
                size="xl"
              />
            </button>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              {/* Name - clickable */}
              <button
                onClick={handleProfileClick}
                className="cursor-pointer hover:text-accent-400 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-accent-500 rounded"
                type="button"
              >
                <h1 className="text-2xl font-bold text-white mb-2">
                  {profile.displayName || profile.username}
                </h1>
              </button>

              {profile.createdAt && (
                <div className="flex items-center space-x-1 text-gray-400 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Member since {formatDate(profile.createdAt)}</span>
                </div>
              )}

              {profile.bio && (
                <p className="text-gray-300 mb-4">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Listings Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Listings ({listings.length})
          </h2>
          
          {listings.length === 0 ? (
            <div className="bg-dark-800 rounded-2xl p-8 text-center">
              <p className="text-gray-400">No listings found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    imageUrl: listing.photos?.[0] || '/default-avatar.png',
                    createdAt: listing.createdAt,
                  }}
                  view="comfortable"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
