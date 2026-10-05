'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CreateProfileInput, UserActivity, ItemConditionPreference } from '@marketplace/types';
import { FileUpload } from '@/components/FileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneNumber } from '@/lib/utils';

interface ProfileSetupFormProps {
  onSubmit: (profileData: CreateProfileInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const INTEREST_CATEGORIES = [
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home', name: 'Home & garden' },
  { id: 'books', name: 'Books' },
  { id: 'sports', name: 'Sports' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'furniture', name: 'Furniture' },
  { id: 'beauty', name: 'Beauty & health' },
  { id: 'toys', name: 'Toys & games' },
  { id: 'music', name: 'Music & instruments' },
];

const STEP_TITLES = ['The basics', 'What you’re into', 'How you shop', 'Your budget', 'A photo'];

const RADIO = 'h-4 w-4 accent-primary-600';

export function ProfileSetupForm({ onSubmit, onCancel, isLoading = false }: ProfileSetupFormProps) {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showAgeValidation, setShowAgeValidation] = useState(false);
  const [formData, setFormData] = useState<CreateProfileInput>({
    username: '',
    displayName: '',
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
    <div className="space-y-5">
      <div className="grid gap-2">
        <label htmlFor="profile-username" className="text-sm font-medium text-zinc-950">Username</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">@</span>
          <input
            id="profile-username"
            type="text"
            value={formData.username}
            onChange={(e) => {
              // Normalize: lowercase, remove spaces, remove @, only allow alphanumeric, underscore, period
              const value = e.target.value.toLowerCase().replace(/^@/, '').replace(/\s+/g, '').replace(/[^a-z0-9._]/g, '');
              handleInputChange('username', value);
            }}
            placeholder="username"
            className="input pl-8"
            maxLength={30}
            aria-describedby="profile-username-help"
          />
        </div>
        <p id="profile-username-help" className="text-xs text-zinc-500">
          At least 3 characters. Letters, numbers, dots and underscores. {formData.username.length}/30
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="profile-bio" className="text-sm font-medium text-zinc-950">Bio <span className="font-normal text-zinc-500">(optional)</span></label>
        <textarea
          id="profile-bio"
          value={formData.bio || ''}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          placeholder="A line or two about what you buy and sell"
          className="input resize-none"
          rows={3}
          maxLength={280}
        />
        <p className="text-xs text-zinc-500">{(formData.bio || '').length}/280</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="profile-gender" className="text-sm font-medium text-zinc-950">Gender <span className="font-normal text-zinc-500">(optional)</span></label>
          <select
            id="profile-gender"
            value={formData.gender || ''}
            onChange={(e) => handleInputChange('gender', e.target.value || undefined)}
            className="input"
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="profile-age" className="text-sm font-medium text-zinc-950">Age <span className="font-normal text-zinc-500">(optional)</span></label>
          <input
            id="profile-age"
            type="number"
            value={formData.age || ''}
            onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
            onBlur={() => setShowAgeValidation(true)}
            onClick={() => setShowAgeValidation(true)}
            placeholder="Age"
            min="13"
            max="120"
            aria-invalid={showAgeValidation && isAgeInvalid()}
            className={`input ${showAgeValidation && isAgeInvalid() ? 'border-red-600 focus:border-red-600 focus:ring-red-600' : ''}`}
          />
          {showAgeValidation && isAgeInvalid() && (
            <p className="text-sm text-red-700">Age must be between 13 and 120.</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="profile-phone" className="text-sm font-medium text-zinc-950">Phone <span className="font-normal text-zinc-500">(optional)</span></label>
        <input
          id="profile-phone"
          type="tel"
          value={formData.phoneNumber || ''}
          onChange={(e) => {
            const formatted = formatPhoneNumber(e.target.value);
            handleInputChange('phoneNumber', formatted);
          }}
          placeholder="(555) 123-4567"
          className="input"
        />
        <p className="text-xs text-zinc-500">Used for account recovery. Never shown to buyers.</p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <p className="text-sm text-zinc-600">Pick the kinds of things you look for. You can change this later.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {INTEREST_CATEGORIES.map((category) => {
          const selected = formData.interestCategories.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryToggle(category.id)}
              aria-pressed={selected}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selected
                  ? 'border-primary-600 bg-primary-50 font-medium text-primary-700'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-500'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-950">What will you use AllVerse for?</legend>
        {[
          { value: 'browse-only', label: 'Browsing and buying' },
          { value: 'buy-only', label: 'Only buying' },
          { value: 'sell-only', label: 'Only selling' },
          { value: 'both-buy-sell', label: 'Buying and selling' },
        ].map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-zinc-800">
            <input
              type="radio"
              name="userActivity"
              value={option.value}
              checked={formData.userActivity === option.value}
              onChange={(e) => handleInputChange('userActivity', e.target.value as UserActivity)}
              className={RADIO}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor="profile-frequency" className="text-sm font-medium text-zinc-950">How often do you shop? <span className="font-normal text-zinc-500">(optional)</span></label>
        <select
          id="profile-frequency"
          value={formData.shoppingFrequency || ''}
          onChange={(e) => handleInputChange('shoppingFrequency', e.target.value || undefined)}
          className="input"
        >
          <option value="">Choose one</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="occasionally">Occasionally</option>
          <option value="rarely">Rarely</option>
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-950">Condition you’re open to</legend>
        {[
          { value: 'new-only', label: 'New only' },
          { value: 'second-hand-only', label: 'Secondhand only' },
          { value: 'both', label: 'New or secondhand' },
        ].map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-zinc-800">
            <input
              type="radio"
              name="itemConditionPreference"
              value={option.value}
              checked={formData.itemConditionPreference === option.value}
              onChange={(e) => handleInputChange('itemConditionPreference', e.target.value as ItemConditionPreference)}
              className={RADIO}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="budget-min" className="text-sm font-medium text-zinc-950">Minimum ($)</label>
          <input
            id="budget-min"
            type="number"
            value={formData.budget?.min || ''}
            onChange={(e) => handleBudgetChange('min', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0"
            min="0"
            className="input"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="budget-max" className="text-sm font-medium text-zinc-950">Maximum ($)</label>
          <input
            id="budget-max"
            type="number"
            value={formData.budget?.max || ''}
            onChange={(e) => handleBudgetChange('max', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="1000"
            min="0"
            className="input"
          />
        </div>
      </div>
      <p className="text-sm text-zinc-500">Optional. Used to show you items in your range first.</p>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-5">
      {formData.profilePicture && (
        <div className="flex items-center gap-4">
          <img
            src={formData.profilePicture}
            alt="Your profile photo"
            className="h-20 w-20 rounded-full object-cover"
          />
          <p className="text-sm text-zinc-600">Looking good. You can change this later in Settings.</p>
        </div>
      )}

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
        userEmail={currentUser?.email ?? undefined}
      />

      <p className="text-sm text-zinc-500">Optional. You can add one later.</p>
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
    <div>
      <div>
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Step {currentStep} of {totalSteps}</span>
          <span className="tabular-nums">{Math.round((currentStep / totalSteps) * 100)}%</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-primary-600 transition-[width] duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="mt-8 text-xl font-semibold tracking-tight text-zinc-950">{STEP_TITLES[currentStep - 1]}</h2>

      <div className="mt-6">
        {renderCurrentStep()}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={currentStep === 1 ? onCancel : prevStep}
          className="btn btn-ghost gap-1.5"
        >
          <ChevronLeft strokeWidth={1.75} className="h-4 w-4" />
          {currentStep === 1 ? 'Skip for now' : 'Back'}
        </button>

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!isStepValid()}
            className="btn btn-primary gap-1.5"
          >
            Next
            <ChevronRight strokeWidth={1.75} className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading && <Loader2 strokeWidth={1.75} className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Saving…' : 'Finish setup'}
          </button>
        )}
      </div>
    </div>
  );
}
