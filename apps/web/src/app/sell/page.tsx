'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Upload, X, Brain, Zap } from 'lucide-react';
import { mockApi } from '@marketplace/lib';
import { CreateListingForm, Category } from '@marketplace/types';
import { validateForm, createListingSchema } from '@marketplace/lib';
import { Navigation } from '@/components/Navigation';

const steps = [
  { id: 1, title: 'Basic Info', description: 'Title and description', icon: Brain },
  { id: 2, title: 'Details', description: 'Category, condition, and price', icon: Zap },
  { id: 3, title: 'Photos', description: 'Upload images', icon: Upload },
  { id: 4, title: 'Review', description: 'Review and publish', icon: Brain },
];

export default function SellPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Partial<CreateListingForm>>({
    title: '',
    description: '',
    price: 0,
    category: '',
    condition: 'good',
    location: '',
    images: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await mockApi.getCategories();
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleInputChange = (field: keyof CreateListingForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...files].slice(0, 10)
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }));
  };

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.title?.trim()) stepErrors.title = 'Title is required';
        if (!formData.description?.trim()) stepErrors.description = 'Description is required';
        break;
      case 2:
        if (!formData.category) stepErrors.category = 'Category is required';
        if (!formData.price || formData.price <= 0) stepErrors.price = 'Valid price is required';
        if (!formData.location?.trim()) stepErrors.location = 'Location is required';
        break;
      case 3:
        if (!formData.images?.length) stepErrors.images = 'At least one image is required';
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const validation = validateForm(createListingSchema, formData);
      if (!validation.success) {
        setErrors(validation.errors.reduce((acc, error) => ({ ...acc, [error]: error }), {}));
        return;
      }

      const response = await mockApi.createListing(formData as CreateListingForm);
      router.push(`/listings/${response.data.id}`);
    } catch (error) {
      console.error('Error creating listing:', error);
      setErrors({ submit: 'Failed to create listing. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="What are you selling?"
                className={`input ${errors.title ? 'border-red-500' : ''}`}
              />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your item in detail..."
                rows={6}
                className={`input resize-none ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Category
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`input ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Condition
              </label>
              <select
                value={formData.condition || 'good'}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="input"
              >
                <option value="new">New</option>
                <option value="like-new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Price
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`input pl-8 ${errors.price ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State"
                className={`input ${errors.location ? 'border-red-500' : ''}`}
              />
              {errors.location && <p className="text-red-400 text-sm mt-1">{errors.location}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Photos (up to 10)
              </label>
              <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-accent-500 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="btn btn-primary">Choose Files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  PNG, JPG, GIF up to 10MB each
                </p>
              </div>
              {errors.images && <p className="text-red-400 text-sm mt-1">{errors.images}</p>}
            </div>

            {formData.images && formData.images.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Uploaded Images</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Review Your Listing</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-white">{formData.title}</h4>
                  <p className="text-gray-400 text-sm">{formData.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <span className="ml-2 text-white">{formData.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Condition:</span>
                    <span className="ml-2 text-white capitalize">{formData.condition}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price:</span>
                    <span className="ml-2 text-white">${formData.price}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <span className="ml-2 text-white">{formData.location}</span>
                  </div>
                </div>
                
                {formData.images && formData.images.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Images: {formData.images.length}</span>
                  </div>
                )}
              </div>
            </div>
            
            {errors.submit && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Sell Your Item</h1>
          <p className="text-lg text-gray-400">Create a listing with AI assistance</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl text-sm font-medium transition-all duration-200 ${
                    currentStep >= step.id
                      ? 'bg-accent-500 text-white glow'
                      : 'bg-dark-700 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-white' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 transition-all duration-200 ${
                      currentStep > step.id ? 'bg-accent-500' : 'bg-dark-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="card p-8">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-600">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn btn-outline flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                className="btn btn-primary flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
