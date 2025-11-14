'use client';

import React, { useState, useEffect } from 'react';
import { Profile } from '@marketplace/types';
import { useAuth } from '@/contexts/AuthContext';
import { User, Save, X, Heart, DollarSign, ShoppingBag } from 'lucide-react';
import Select from './Select';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    age: undefined as number | undefined,
    gender: '',
    phoneNumber: '',
    interestCategories: [] as string[],
    userActivity: '',
    budget: { min: 0, max: 1000, currency: 'USD' },
    shoppingFrequency: '',
    itemConditionPreference: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showAgeValidation, setShowAgeValidation] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        age: profile.age,
        gender: profile.gender || '',
        phoneNumber: profile.phoneNumber || '',
        interestCategories: profile.interestCategories || [],
        userActivity: profile.userActivity || '',
        budget: profile.budget ? {
          min: profile.budget.min || 0,
          max: profile.budget.max || 1000,
          currency: profile.budget.currency || 'USD'
        } : { min: 0, max: 1000, currency: 'USD' },
        shoppingFrequency: profile.shoppingFrequency || '',
        itemConditionPreference: profile.itemConditionPreference || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    if (isAgeInvalid()) {
      setError('Please enter a valid age (13-120)');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const profileData = {
        username: formData.username,
        bio: formData.bio,
        age: formData.age,
        gender: formData.gender,
        phoneNumber: formData.phoneNumber,
        interestCategories: formData.interestCategories,
        userActivity: formData.userActivity,
        budget: formData.budget,
        shoppingFrequency: formData.shoppingFrequency,
        itemConditionPreference: formData.itemConditionPreference,
      };

      const { apiPut } = await import('@/lib/api-client');
      const response = await apiPut('/api/profile', profileData);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error?.message || errorData.error || 'Failed to update profile');
      }

      const result = await response.json();
      
      if (result.success) {
        onProfileUpdate(result.data);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      }
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-dark-800 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto chat-scrollbar border border-dark-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded-lg">
            <p className="text-green-400">Profile updated successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <User className="w-5 h-5 mr-2 text-accent-500" />
              Basic Information
            </h3>

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
                    Age must be between 13-120
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
                rows={3}
                maxLength={280}
                className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {(formData.bio || '').length}/280 characters
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Select
                  label="Gender"
                  value={formData.gender || ''}
                  onChange={(value) => handleInputChange('gender', value || undefined)}
                  placeholder="Prefer not to say"
                  options={[
                    { value: '', label: 'Prefer not to say' },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'non-binary', label: 'Non-binary' },
                    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                  ]}
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
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Heart className="w-5 h-5 mr-2 text-accent-500" />
              Interest Categories
            </h3>
            <p className="text-gray-400 text-sm">What are you interested in? Select all that apply</p>
            <div className="grid grid-cols-2 gap-4">
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
            <h3 className="text-xl font-semibold text-white flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-accent-500" />
              Shopping Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Select
                  label="User Activity"
                  value={formData.userActivity}
                  onChange={(value) => handleInputChange('userActivity', value)}
                  placeholder="Select activity"
                  options={[
                    { value: '', label: 'Select activity' },
                    { value: 'buy-only', label: 'Buy Only' },
                    { value: 'sell-only', label: 'Sell Only' },
                    { value: 'both-buy-sell', label: 'Both Buy & Sell' },
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Shopping Frequency"
                  value={formData.shoppingFrequency}
                  onChange={(value) => handleInputChange('shoppingFrequency', value)}
                  placeholder="Select frequency"
                  options={[
                    { value: '', label: 'Select frequency' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'rarely', label: 'Rarely' },
                  ]}
                />
              </div>
            </div>

            <div>
              <Select
                label="Item Condition Preference"
                value={formData.itemConditionPreference}
                onChange={(value) => handleInputChange('itemConditionPreference', value)}
                placeholder="Select preference"
                options={[
                  { value: '', label: 'Select preference' },
                  { value: 'new-only', label: 'New Only' },
                  { value: 'second-hand-only', label: 'Second Hand Only' },
                  { value: 'both', label: 'Both' },
                ]}
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-accent-500" />
              Budget
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Min Budget
                </label>
                <input
                  type="number"
                  value={formData.budget.min}
                  onChange={(e) => handleInputChange('budget', { ...formData.budget, min: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Budget
                </label>
                <input
                  type="number"
                  value={formData.budget.max}
                  onChange={(e) => handleInputChange('budget', { ...formData.budget, max: parseInt(e.target.value) || 1000 })}
                  placeholder="1000"
                  min="0"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div>
                <Select
                  label="Currency"
                  value={formData.budget.currency}
                  onChange={(value) => handleInputChange('budget', { ...formData.budget, currency: value })}
                  placeholder="Select currency"
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'CAD', label: 'CAD' },
                  ]}
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
  );
};
