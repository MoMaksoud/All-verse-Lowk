'use client';

import React, { useState } from 'react';
import { ProfileSetupForm } from '@/components/ProfileSetupForm';
import { ProfileDisplay } from '@/components/ProfileDisplay';
import { CreateProfileInput, Profile } from '@marketplace/types';
import { DynamicBackground } from '@/components/DynamicBackground';
import { Logo } from '@/components/Logo';

export default function TestProfileSetup() {
  const [showForm, setShowForm] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const handleProfileSubmit = (profileData: CreateProfileInput) => {
    // Convert CreateProfileInput to Profile for display
    const mockProfile: Profile = {
      userId: 'test-user-123',
      username: profileData.username,
      bio: profileData.bio,
      createdAt: new Date().toISOString(),
      gender: profileData.gender,
      age: profileData.age,
      location: profileData.location,
      profilePicture: profileData.profilePicture,
      phoneNumber: profileData.phoneNumber,
      rating: 0,
      interestCategories: profileData.interestCategories,
      userActivity: profileData.userActivity,
      budget: profileData.budget,
      shoppingFrequency: profileData.shoppingFrequency,
      itemConditionPreference: profileData.itemConditionPreference,
    };

    setProfile(mockProfile);
    setShowForm(false);
  };

  const handleReset = () => {
    setProfile(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <Logo size="lg" className="justify-center mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Profile Setup Test</h1>
            <p className="text-gray-400">Test the comprehensive profile setup flow</p>
          </div>

          {showForm ? (
            <ProfileSetupForm
              onSubmit={handleProfileSubmit}
              onCancel={() => setShowForm(false)}
              isLoading={false}
            />
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors"
                >
                  Test Again
                </button>
              </div>
              
              {profile && (
                <ProfileDisplay profile={profile} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
