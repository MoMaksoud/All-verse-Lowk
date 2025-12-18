'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { DynamicBackground } from '@/components/DynamicBackground';
import { ProfilePicture } from '@/components/ProfilePicture';
import { Profile } from '@marketplace/types';
import { User, Settings, Edit, Camera, Shield } from 'lucide-react';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Navigation } from '@/components/Navigation';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({ listingsCount: 0, salesCount: 0, reviewsCount: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, refreshProfile, userProfile, userProfilePic } = useAuth();
  const router = useRouter();

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

  const getMemberSince = () => {
    if (!profile?.createdAt) return '2025';
    try {
      // Handle Firestore Timestamp, ISO string, or Date object
      const createdAt = profile.createdAt;
      if (!createdAt) return '2025';
      
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
          return '2025';
        }
      } else if (typeof createdAt === 'string') {
        date = new Date(createdAt);
      } else {
        return '2025';
      }
      
      if (!date || isNaN(date.getTime())) {
        return '2025';
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        return '2025';
      }
      
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric"
      }).format(date);
    } catch {
      return '2025';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <DynamicBackground intensity="low" showParticles={true} />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden w-full max-w-screen">
      <DynamicBackground intensity="low" showParticles={true} />
      
      {/* Navigation */}
      <Navigation />
      
      <div className="relative z-10 min-h-screen w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-screen mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white break-words">Profile</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-2">Manage your account and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-dark-800 rounded-2xl p-4 sm:p-6 md:p-8 border border-dark-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Profile Information</h2>
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>

                {profile ? (
                  <div className="space-y-8">
                    {/* User Identity */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
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
                          onClick={onCameraClick}
                          className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-accent-500 hover:bg-accent-600 rounded-full flex items-center justify-center transition-colors"
                        >
                          <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onFileSelected}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 break-words">
                          {profile.username}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-400 mb-1 sm:mb-2 break-all">
                          {currentUser?.email}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Member since {getMemberSince()}
                        </p>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Bio</h4>
                        <p className="text-gray-400">
                          {profile.bio || 'No bio added yet.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Profile Found</h3>
                    <p className="text-gray-400 mb-6">
                      It looks like you haven't set up your profile yet.
                    </p>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors mx-auto"
                    >
                      <Settings className="w-5 h-5 mr-2" />
                      Set Up Profile
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Listings</span>
                    <span className="text-white font-semibold">{stats.listingsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sales</span>
                    <span className="text-white font-semibold">{stats.salesCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Reviews</span>
                    <span className="text-white font-semibold">{stats.reviewsCount}</span>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
                <div className="space-y-3">
                  <Link
                    href="/settings"
                    className="w-full flex items-center px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                  >
                    <Settings className="w-5 h-5 mr-3 text-accent-500" />
                    Account Settings
                  </Link>
                  <button className="w-full flex items-center px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors">
                    <Shield className="w-5 h-5 mr-3 text-accent-500" />
                    Privacy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
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