'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { DynamicBackground } from '@/components/DynamicBackground';
import { DefaultAvatar } from '@/components/DefaultAvatar';
import { Profile } from '@marketplace/types';
import { User, MapPin, Star, Settings, Edit, Bell, Camera, Shield } from 'lucide-react';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Navigation } from '@/components/Navigation';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser?.uid) {
      fetchProfile();
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/profile', {
        headers: {
          'x-user-id': currentUser?.uid || '',
        },
      });

      if (response.status === 404) {
        setProfile(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      
      if (result.success) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      const resp = await fetch('/api/upload/profile-photo', {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.uid,
          'x-user-email': currentUser.email || ''
        },
        body: form,
      });
      if (!resp.ok) throw new Error('Upload failed');
      const data = await resp.json();
      // Optimistically update local profile
      setProfile((p) => p ? { ...p, profilePicture: data.photoUrl } as any : p);
    } catch (err) {
      console.error('Profile photo upload failed:', err);
    } finally {
      // Reset input to allow re-selecting same file
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 text-yellow-400 fill-current opacity-50" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-400" />
      );
    }

    return stars;
  };

  const getMemberSince = () => {
    if (!profile?.createdAt) return 'Recently';
    const date = new Date(profile.createdAt);
    return date.getFullYear().toString();
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
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      
      {/* Navigation */}
      <Navigation />
      
      <div className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white">Profile</h1>
            <p className="text-gray-400 mt-2">Manage your account and preferences</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                  <div className="flex items-center space-x-3">
                    <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                      <Bell className="w-5 h-5" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                    </button>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>

                {profile ? (
                  <div className="space-y-8">
                    {/* User Identity */}
                    <div className="flex items-start space-x-6">
                      <div className="relative flex-shrink-0">
                        {profile.profilePicture ? (
                          <img
                            src={profile.profilePicture as any}
                            alt={profile.username}
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <DefaultAvatar
                            name={profile.username}
                            email={currentUser?.email || undefined}
                            size="xl"
                          />
                        )}
                        <button
                          onClick={onCameraClick}
                          className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-500 hover:bg-accent-600 rounded-full flex items-center justify-center transition-colors"
                        >
                          <Camera className="w-4 h-4 text-white" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onFileSelected}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-white mb-1">
                          {profile.username}
                        </h3>
                        <p className="text-gray-400 mb-2">
                          {currentUser?.email}
                        </p>
                        <p className="text-sm text-gray-500">
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

                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Location</h4>
                        <div className="flex items-center text-gray-400">
                          <MapPin className="w-4 h-4 mr-2" />
                          {profile.location || 'No location set.'}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Rating</h4>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {getRatingStars(profile.rating || 0)}
                          </div>
                          <span className="text-sm text-gray-400">
                            {profile.rating ? profile.rating.toFixed(1) : '0'}/5
                          </span>
                        </div>
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
                    <span className="text-white font-semibold">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sales</span>
                    <span className="text-white font-semibold">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Reviews</span>
                    <span className="text-white font-semibold">0</span>
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