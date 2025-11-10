'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, User, MapPin, Heart, DollarSign, ShoppingBag } from 'lucide-react';
import { CreateProfileInput, Gender, ShoppingFrequency, UserActivity, ItemConditionPreference } from '@marketplace/types';
import { FileUpload } from '@/components/FileUpload';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileSetupFormProps {
  onSubmit: (profileData: CreateProfileInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

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

export function ProfileSetupForm({ onSubmit, onCancel, isLoading = false }: ProfileSetupFormProps) {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showAgeValidation, setShowAgeValidation] = useState(false);
  const [formData, setFormData] = useState<CreateProfileInput>({
    username: '',
    bio: '',
    gender: undefined,
    age: undefined,
    profilePicture: undefined,
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

  const totalSteps = 5;

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

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const isAgeInvalid = () => {
    return formData.age !== undefined && formData.age !== null && (formData.age < 13 || formData.age > 120);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.username.length >= 3;
      case 2:
        // Age validation: if age is provided, it must be between 13-120
        return !isAgeInvalid();
      case 3:
        return formData.interestCategories.length > 0;
      case 4:
        return true; // Optional fields
      case 5:
        return true; // Optional fields
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <User className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h2 className="text-2xl font-bold text-white mb-2">Basic Information</h2>
        <p className="text-gray-400">Tell us a bit about yourself</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Username *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => {
                // Normalize: lowercase, remove spaces, remove @, only allow alphanumeric, underscore, period
                const value = e.target.value.toLowerCase().replace(/^@/, '').replace(/\s+/g, '').replace(/[^a-z0-9._]/g, '');
                handleInputChange('username', value);
              }}
              placeholder="username"
              className="w-full pl-8 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
              maxLength={30}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.username.length}/30 characters • Only letters, numbers, underscores, and periods
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
            rows={3}
            maxLength={280}
          />
          <p className="text-xs text-gray-500 mt-1">
            {(formData.bio || '').length}/280 characters
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phoneNumber || ''}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Heart className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h2 className="text-2xl font-bold text-white mb-2">Interest Categories</h2>
        <p className="text-gray-400">What are you interested in? Select all that apply</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {INTEREST_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => handleCategoryToggle(category.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
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
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h2 className="text-2xl font-bold text-white mb-2">Shopping Preferences</h2>
        <p className="text-gray-400">How do you like to shop?</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            What do you want to do on our platform?
          </label>
          <div className="space-y-2">
            {[
              { value: 'browse-only', label: 'Just browse and buy items' },
              { value: 'buy-only', label: 'Only buy items' },
              { value: 'sell-only', label: 'Only sell items' },
              { value: 'both-buy-sell', label: 'Both buy and sell items' },
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="userActivity"
                  value={option.value}
                  checked={formData.userActivity === option.value}
                  onChange={(e) => handleInputChange('userActivity', e.target.value as UserActivity)}
                  className="w-4 h-4 text-accent-500 bg-dark-700 border-dark-600 focus:ring-accent-500"
                />
                <span className="text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            How often do you shop?
          </label>
          <select
            value={formData.shoppingFrequency || ''}
            onChange={(e) => handleInputChange('shoppingFrequency', e.target.value || undefined)}
            className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="">Select frequency</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="occasionally">Occasionally</option>
            <option value="rarely">Rarely</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Item condition preference
          </label>
          <div className="space-y-2">
            {[
              { value: 'new-only', label: 'New items only' },
              { value: 'second-hand-only', label: 'Second-hand items only' },
              { value: 'both', label: 'Both new and second-hand' },
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="itemConditionPreference"
                  value={option.value}
                  checked={formData.itemConditionPreference === option.value}
                  onChange={(e) => handleInputChange('itemConditionPreference', e.target.value as ItemConditionPreference)}
                  className="w-4 h-4 text-accent-500 bg-dark-700 border-dark-600 focus:ring-accent-500"
                />
                <span className="text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <DollarSign className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h2 className="text-2xl font-bold text-white mb-2">Budget Preferences</h2>
        <p className="text-gray-400">Help us show you relevant items</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimum Budget ($)
            </label>
            <input
              type="number"
              value={formData.budget?.min || ''}
              onChange={(e) => handleBudgetChange('min', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0"
              min="0"
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Maximum Budget ($)
            </label>
            <input
              type="number"
              value={formData.budget?.max || ''}
              onChange={(e) => handleBudgetChange('max', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="1000"
              min="0"
              className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>This helps us show you items within your price range</p>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h2 className="text-2xl font-bold text-white mb-2">Profile Picture</h2>
        <p className="text-gray-400">Add a profile picture to personalize your account</p>
      </div>

      <div className="space-y-4">
        {/* Profile Picture Preview */}
        {formData.profilePicture && (
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-dark-700 border-2 border-dark-600 rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={formData.profilePicture}
                alt="Profile preview"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        )}

        {/* File Upload Component */}
        <FileUpload
          onUploadComplete={(result) => {
            handleInputChange('profilePicture', result.url);
          }}
          onUploadError={(error) => {
            console.error('Profile picture upload error:', error);
          }}
          accept="image/*"
          maxSize={5 * 1024 * 1024} // 5MB
          maxFiles={1}
          uploadType="profile-picture"
          userId={currentUser?.uid}
          className="max-w-md mx-auto"
        />

        <div className="text-center text-sm text-gray-400">
          <p>You can skip this and add a picture later</p>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-dark-800 rounded-2xl p-8 border border-dark-700">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2">
          <div
            className="bg-accent-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderCurrentStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={currentStep === 1 ? onCancel : prevStep}
          className="flex items-center px-6 py-3 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!isStepValid()}
            className="flex items-center px-6 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center px-6 py-3 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isLoading ? 'Creating Profile...' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}
