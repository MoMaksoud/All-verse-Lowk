'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePicture } from '@/components/ProfilePicture';
import { Profile } from '@marketplace/types';
import { Settings, Camera, Pencil } from 'lucide-react';
import { ProfileEditModal } from '@/components/ProfileEditModal';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({ listingsCount: 0, salesCount: 0, reviewsCount: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, loading: authLoading, refreshProfile, userProfile, userProfilePic } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/signin?redirect=/profile&reason=profile');
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchProfile();
      fetchStats();
    }
  }, [currentUser]);

  const fetchStats = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/profile/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          listingsCount: data.listingsCount || 0,
          salesCount: data.salesCount || 0,
          reviewsCount: data.reviewsCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const { apiGet } = await import('@/lib/api-client');
      // Send auth token to get current user's profile
      const response = await apiGet('/api/profile');

      // 404 is expected for new users without a profile yet
      if (response.status === 404) {
        setProfile(null);
        return;
      }

      if (!response.ok) {
        console.error('Failed to fetch profile:', response.status);
        setProfile(null);
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        setProfile(result.data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      // Only log unexpected errors (not 404s)
      console.error('Unexpected error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const onCameraClick = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid) return;
    try {
      const form = new FormData();
      form.append('photo', file);
      const { apiRequest } = await import('@/lib/api-client');
      const resp = await apiRequest('/api/upload/profile-photo', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser.email || ''
        },
        body: form,
      });
      if (!resp.ok) throw new Error('Upload failed');
      const data = await resp.json();
      
      // Use storage path as the source of truth (photoPath takes precedence over photoUrl)
      const profilePicturePath = data.photoPath || data.photoUrl;
      
      // Refresh profile from AuthContext to get updated profilePicture
      await refreshProfile();
      
      // Fetch fresh profile data from server with cache-busted URL
      await fetchProfile();
      
      // Also update local state for immediate UI update with cache-busted URL
      const cacheBustedUrl = profilePicturePath ? `${profilePicturePath}?t=${Date.now()}` : profilePicturePath;
      setProfile((p) => p ? { ...p, profilePicture: cacheBustedUrl } as any : p);
    } catch (err) {
      console.error('Profile photo upload failed:', err);
    } finally {
      // Reset input to allow re-selecting same file
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getMemberSince = (): string | null => {
    if (!profile?.createdAt) return null;
    try {
      // Handle Firestore Timestamp, ISO string, or Date object
      const createdAt = profile.createdAt;
      if (!createdAt) return null;
      
      let date: Date | null = null;
      // Safe conversion: check for Timestamp, then Date, then string
      if (createdAt !== null && typeof createdAt === 'object') {
        const timestampObj = createdAt as any;
        if ('toDate' in timestampObj && typeof timestampObj.toDate === 'function') {
          date = timestampObj.toDate();
        } else if (timestampObj instanceof Date) {
          date = timestampObj;
        } else {
          // Invalid object, cannot convert
          return null;
        }
      } else if (typeof createdAt === 'string') {
        date = new Date(createdAt);
      } else {
        return null;
      }
      
      if (!date || isNaN(date.getTime())) {
        return null;
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric"
      }).format(date);
    } catch {
      return null;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6" aria-busy="true" aria-label="Loading profile">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 animate-pulse rounded-full bg-zinc-100" />
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
              <div className="h-4 w-56 animate-pulse rounded bg-zinc-100" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </div>
    );
  }

  const memberSince = getMemberSince();

  return (
    <div className="mx-auto w-full max-w-[1150px] px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Your profile</h1>
        <p className="mt-2 text-zinc-600">How you appear to buyers and sellers on AllVerse.</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <section className="min-w-0">
          {profile ? (
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <ProfilePicture
                  src={profile.profilePicture || userProfile?.profilePicture}
                  alt={profile.username}
                  name={profile.username}
                  email={currentUser?.email}
                  size="xl"
                  currentUser={currentUser}
                  userProfilePic={userProfilePic}
                />
                <button
                  type="button"
                  onClick={onCameraClick}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-900 transition hover:bg-zinc-50"
                >
                  <Camera strokeWidth={1.75} className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileSelected}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold text-zinc-950">{profile.username}</h2>
                    <p className="mt-1 break-all text-sm text-zinc-600">{currentUser?.email}</p>
                    {memberSince && <p className="mt-1 text-sm text-zinc-500">Member since {memberSince}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className="btn btn-outline shrink-0 gap-2"
                  >
                    <Pencil strokeWidth={1.75} className="h-4 w-4" />
                    Edit profile
                  </button>
                </div>

                <div className="mt-8 border-t border-zinc-200 pt-6">
                  <h3 className="text-sm font-semibold text-zinc-950">About</h3>
                  <p className="mt-2 max-w-[65ch] leading-relaxed text-zinc-600">
                    {profile.bio || 'You haven’t written a bio yet. Buyers see it on your public profile.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-10">
              <Settings strokeWidth={1.5} className="h-8 w-8 text-zinc-500" />
              <h2 className="mt-4 font-semibold text-zinc-950">Set up your profile</h2>
              <p className="mt-1 max-w-[44ch] text-sm text-zinc-600">
                Add a name and photo so buyers know who they’re buying from.
              </p>
              <button type="button" onClick={() => setShowEditModal(true)} className="btn btn-primary mt-6">
                Set up profile
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-10">
          <section>
            <h3 className="text-sm font-semibold text-zinc-950">Activity</h3>
            <dl className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200 text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-600">Listings</dt>
                <dd className="font-semibold tabular-nums text-zinc-950">{stats.listingsCount}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-600">Sales</dt>
                <dd className="font-semibold tabular-nums text-zinc-950">{stats.salesCount}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-zinc-600">Reviews</dt>
                <dd className="font-semibold tabular-nums text-zinc-950">{stats.reviewsCount}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-zinc-950">Manage</h3>
            <ul className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200 text-sm">
              <li>
                <Link href="/settings" className="flex items-center justify-between py-3 font-medium text-zinc-950 hover:text-primary-700">
                  Account settings
                  <span aria-hidden="true" className="text-zinc-400">→</span>
                </Link>
              </li>
              <li>
                <Link href="/my-listings" className="flex items-center justify-between py-3 font-medium text-zinc-950 hover:text-primary-700">
                  My listings
                  <span aria-hidden="true" className="text-zinc-400">→</span>
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onProfileUpdate={(updatedProfile) => {
          setProfile(updatedProfile);
        }}
      />
    </div>
  );
}
