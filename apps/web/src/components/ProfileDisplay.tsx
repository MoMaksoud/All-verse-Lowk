'use client';

import React from 'react';
import { User, MapPin, Phone, Star, Heart, ShoppingBag, DollarSign, Calendar } from 'lucide-react';
import { Profile } from '@marketplace/types';

interface ProfileDisplayProps {
  profile: Profile;
  className?: string;
}

export function ProfileDisplay({ profile, className = '' }: ProfileDisplayProps) {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGenderDisplay = (gender?: string) => {
    if (!gender) return 'Not specified';
    return gender.charAt(0).toUpperCase() + gender.slice(1).replace('-', ' ');
  };

  const getActivityDisplay = (activity: string) => {
    const activityMap: Record<string, string> = {
      'browse-only': 'Browse and buy items only',
      'buy-only': 'Buy items only',
      'sell-only': 'Sell items only',
      'both-buy-sell': 'Both buy and sell items'
    };
    return activityMap[activity] || activity;
  };

  const getFrequencyDisplay = (frequency?: string) => {
    if (!frequency) return 'Not specified';
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const getConditionPreferenceDisplay = (preference: string) => {
    const preferenceMap: Record<string, string> = {
      'new-only': 'New items only',
      'second-hand-only': 'Second-hand items only',
      'both': 'Both new and second-hand'
    };
    return preferenceMap[preference] || preference;
  };

  return (
    <div className={`bg-dark-800 rounded-2xl p-6 border border-dark-700 ${className}`}>
      <div className="flex items-start space-x-4 mb-6">
        <div className="w-20 h-20 bg-dark-700 rounded-full flex items-center justify-center overflow-hidden">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1">{profile.username}</h2>
          {profile.bio && (
            <p className="text-gray-300 mb-2">{profile.bio}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>{profile.rating.toFixed(1)}/5.0</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDate(profile.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Personal Information</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-400">Gender:</span>
                <span className="ml-2 text-white">{getGenderDisplay(profile.gender)}</span>
              </div>
            </div>

            {profile.age && (
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-400">Age:</span>
                  <span className="ml-2 text-white">{profile.age} years old</span>
                </div>
              </div>
            )}

            {profile.location && (
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-400">Location:</span>
                  <span className="ml-2 text-white">{profile.location}</span>
                </div>
              </div>
            )}

            {profile.phoneNumber && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-400">Phone:</span>
                  <span className="ml-2 text-white">{profile.phoneNumber}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shopping Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">Shopping Preferences</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-400">Activity:</span>
                <span className="ml-2 text-white">{getActivityDisplay(profile.userActivity)}</span>
              </div>
            </div>

            {profile.shoppingFrequency && (
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-400">Shopping Frequency:</span>
                  <span className="ml-2 text-white">{getFrequencyDisplay(profile.shoppingFrequency)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Heart className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-400">Item Preference:</span>
                <span className="ml-2 text-white">{getConditionPreferenceDisplay(profile.itemConditionPreference)}</span>
              </div>
            </div>

            {profile.budget && (profile.budget.min || profile.budget.max) && (
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-400">Budget:</span>
                  <span className="ml-2 text-white">
                    {profile.budget.min ? `$${profile.budget.min}` : '$0'} - {profile.budget.max ? `$${profile.budget.max}` : 'No limit'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interest Categories */}
      {profile.interestCategories.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">Interest Categories</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interestCategories.map((category) => (
              <span
                key={category}
                className="px-3 py-1 bg-accent-500/20 text-accent-400 rounded-full text-sm"
              >
                {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
