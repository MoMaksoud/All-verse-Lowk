'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { DynamicBackground } from '@/components/DynamicBackground';
import { CreateProfileInput, Profile } from '@marketplace/types';
import { ArrowLeft, Save, User, MapPin, Heart, DollarSign, ShoppingBag } from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { currentUser } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<CreateProfileInput>({
    username: '',
    bio: '',
    gender: undefined,
    age: undefined,
    location: '',
    phoneNumber: '',
    interestCategories: [],
    userActivity: 'both-buy-sell',
    budget: {
      min: undefined,
      max: undefined,
      currency: 'USD'
    },
    shoppingFrequency: undefined,
    itemConditionPreference: 'both',
  });

  const [showAgeValidation, setShowAgeValidation] = useState(false);

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

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      if (result.success) {
        setProfile(result.data);
        // Populate form with existing data
        setFormData({
          username: result.data.username || '',
          bio: result.data.bio || '',
          gender: result.data.gender,
          age: result.data.age,
          location: result.data.location || '',
          phoneNumber: result.data.phoneNumber || '',
          interestCategories: result.data.interestCategories || [],
          userActivity: result.data.userActivity || 'both-buy-sell',
          budget: result.data.budget || { min: undefined, max: undefined, currency: 'USD' },
          shoppingFrequency: result.data.shoppingFrequency,
          itemConditionPreference: result.data.itemConditionPreference || 'both',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateProfileInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBudgetChange = (field: 'min' | 'max', value: number | undefined) => {
    setFormData(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        [field]: value,
        currency: 'USD'
      }
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      interestCategories: prev.interestCategories.includes(categoryId)
        ? prev.interestCategories.filter(id => id !== categoryId)
        : [...prev.interestCategories, categoryId]
    }));
  };

  const isAgeInvalid = () => {
    return formData.age !== undefined && formData.age !== null && (formData.age < 13 || formData.age > 120);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      setError('You must be logged in to update your profile');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Send all profile fields
      const profileData = {
        username: formData.username,
        bio: formData.bio,
        age: formData.age,
        gender: formData.gender,
        location: formData.location,
        phoneNumber: formData.phoneNumber,
        interestCategories: formData.interestCategories,
        userActivity: formData.userActivity,
        budget: formData.budget,
        shoppingFrequency: formData.shoppingFrequency,
        itemConditionPreference: formData.itemConditionPreference,
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const result = await response.json();
      console.log('Profile updated successfully:', result);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const INTEREST_CATEGORIES = [
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'fashion', name: 'Fashion', icon: '👕' },
    { id: 'home', name: 'Home & Garden', icon: '🏠' },
    { id: 'books', name: 'Books', icon: '📚' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'automotive', name: 'Automotive', icon: '🚗' },
    { id: 'furniture', name: 'Furniture', icon: '🪑' },
    { id: 'beauty', name: 'Beauty & Health', icon: '💄' },
    { id: 'toys', name: 'Toys & Games', icon: '🎮' },
    { id: 'music', name: 'Music & Instruments', icon: '🎵' },
  ];

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
      
      <div className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <Logo size="md" />
            <div className="w-20"></div> {/* Spacer for centering */}
      </div>

          {/* Main Content */}
          <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
            <div className="flex items-center mb-8">
              <User className="w-8 h-8 text-accent-500 mr-3" />
              <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
      </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                {error}
      </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg">
                Profile updated successfully!
        </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
    <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <User className="w-5 h-5 mr-2 text-accent-500" />
                  Basic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username *
          </label>
            <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Choose a unique username"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      maxLength={30}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.username.length}/30 characters
                    </p>
      </div>

      <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Age
          </label>
            <input
                      type="number"
                      value={formData.age || ''}
                      onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                      onBlur={() => setShowAgeValidation(true)}
                      onClick={() => setShowAgeValidation(true)}
                      placeholder="Age"
                      min="13"
                      max="120"
                      className={`w-full px-4 py-3 bg-dark-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                        showAgeValidation && isAgeInvalid()
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-dark-600 focus:ring-accent-500'
                      }`}
                    />
                    {showAgeValidation && isAgeInvalid() && (
                      <p className="text-xs text-red-400 mt-1">
                        Age must be 18+
                      </p>
                    )}
        </div>
      </div>

      <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bio
          </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                    rows={3}
                    maxLength={280}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(formData.bio || '').length}/280 characters
                  </p>
      </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gender
          </label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
      </div>

      <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location
          </label>
            <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="City, State"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
        </div>
      </div>

      <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
            <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>

              {/* Interest Categories */}
    <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-accent-500" />
                  Interest Categories
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {INTEREST_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        formData.interestCategories.includes(category.id)
                          ? 'border-accent-500 bg-accent-500/10 text-accent-400'
                          : 'border-dark-600 bg-dark-700 text-gray-300 hover:border-dark-500'
                      }`}
                    >
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="text-sm font-medium">{category.name}</div>
                    </button>
                  ))}
            </div>
          </div>

              {/* Shopping Preferences */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-2 text-accent-500" />
                  Shopping Preferences
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      User Activity
                    </label>
                    <select
                      value={formData.userActivity}
                      onChange={(e) => handleInputChange('userActivity', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                    >
                      <option value="browse-only">Browse and buy items only</option>
                      <option value="buy-only">Buy items only</option>
                      <option value="sell-only">Sell items only</option>
                      <option value="both-buy-sell">Both buy and sell items</option>
                    </select>
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Shopping Frequency
                    </label>
                    <select
                      value={formData.shoppingFrequency || ''}
                      onChange={(e) => handleInputChange('shoppingFrequency', e.target.value || undefined)}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                    >
                      <option value="">Not specified</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="occasionally">Occasionally</option>
                      <option value="rarely">Rarely</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Item Condition Preference
                  </label>
                  <select
                    value={formData.itemConditionPreference}
                    onChange={(e) => handleInputChange('itemConditionPreference', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    <option value="new-only">New items only</option>
                    <option value="second-hand-only">Second-hand items only</option>
                    <option value="both">Both new and second-hand</option>
                  </select>
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-accent-500" />
                  Budget
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Minimum Budget
                    </label>
                    <input
                      type="number"
                      value={formData.budget?.min || ''}
                      onChange={(e) => handleBudgetChange('min', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Min amount"
                      min="0"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
            </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Maximum Budget
                    </label>
                    <input
                      type="number"
                      value={formData.budget?.max || ''}
                      onChange={(e) => handleBudgetChange('max', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Max amount"
                      min="0"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
          </div>
        </div>
      </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-dark-700">
                <button
                  type="submit"
                  disabled={saving || isAgeInvalid()}
                  className="flex items-center px-8 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}