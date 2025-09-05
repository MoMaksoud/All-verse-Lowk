'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Upload, X, Brain, Zap } from 'lucide-react';
import { SimpleListingCreate } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';

const steps = [
  { id: 1, title: 'Photo Upload', description: 'Upload your item photo', icon: Upload },
  { id: 2, title: 'AI Analysis', description: 'AI fills details automatically', icon: Brain },
  { id: 3, title: 'Review & Edit', description: 'Review and adjust if needed', icon: Zap },
  { id: 4, title: 'Publish', description: 'Final review and publish', icon: Brain },
];

export default function SellPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SimpleListingCreate & { images: File[] }>({
    title: '',
    description: '',
    price: 0,
    category: '',
    photos: [],
    images: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Remove categories fetch since we'll use hardcoded categories

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_: File, i: number) => i !== index) || []
    }));
  };

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.images?.length) stepErrors.images = 'At least one image is required';
        break;
      case 2:
        // AI will fill this automatically, so we'll skip validation for now
        break;
      case 3:
        if (!formData.title?.trim()) stepErrors.title = 'Title is required';
        if (!formData.description?.trim()) stepErrors.description = 'Description is required';
        if (!formData.category) stepErrors.category = 'Category is required';
        if (!formData.price || formData.price <= 0) stepErrors.price = 'Valid price is required';
        // Location not required for MVP
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    // Condition and location not required for MVP
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert images to data URLs for MVP
      let photoUrls: string[] = [];
      if (formData.images && formData.images.length > 0) {
        photoUrls = await Promise.all(
          formData.images.map((file) => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
          })
        );
      }
      
      // Create listing
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        photos: photoUrls
      };
      
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create listing');
      }
      
      const result = await response.json();
      console.log('Listing created:', result);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: 0,
        category: '',
        photos: [],
        images: []
      });
      setErrors({});
      
      // Show success message
      alert('Listing created successfully!');
      router.push(`/listings/${result.id}`);
      
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing. Please try again.');
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
                Upload Your Item Photo
              </label>
              <div className="border-2 border-dashed border-dark-600 rounded-xl p-8 text-center hover:border-accent-500 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="btn btn-primary">Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Upload a clear photo of your item for AI analysis
                </p>
              </div>
              {errors.images && <p className="text-red-400 text-sm mt-1">{errors.images}</p>}
            </div>

            {formData.images && formData.images.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Uploaded Photo</h4>
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(formData.images[0])}
                      alt="Item preview"
                      className="w-64 h-64 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => handleRemoveImage(0)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="animate-pulse">
                <Brain className="mx-auto h-16 w-16 text-accent-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">AI Analysis in Progress</h3>
                <p className="text-gray-400 mb-6">Our AI is analyzing your photo and generating details...</p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <span className="text-gray-400">Title</span>
                  <span className="text-white">Analyzing...</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white">Analyzing...</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <span className="text-gray-400">Price</span>
                  <span className="text-white">Analyzing...</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <span className="text-gray-400">Description</span>
                  <span className="text-white">Analyzing...</span>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => {
                    // Simulate AI completion - in real app, this would be API call
                    setFormData(prev => ({
                      ...prev,
                      title: 'Sample Item Title',
                      description: 'This is a sample description generated by AI based on your photo.',
                      category: 'electronics',
                      price: 99.99
                    }));
                    setCurrentStep(3);
                  }}
                  className="btn btn-primary"
                >
                  Complete AI Analysis
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Review & Edit AI Suggestions</h3>
              <p className="text-gray-400 text-sm">Review the AI-generated details and make any adjustments</p>
            </div>

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
                rows={4}
                className={`input resize-none ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>

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
                <option value="electronics">Electronics</option>
                <option value="fashion">Fashion</option>
                <option value="home">Home</option>
                <option value="sports">Sports</option>
                <option value="automotive">Automotive</option>
                <option value="other">Other</option>
              </select>
              {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Condition field removed for MVP */}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Price
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                <button
                  type="button"
                  onClick={async () => {
                    if (formData.title && formData.description) {
                      try {
                        const response = await fetch('/api/prices/suggest', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: formData.title,
                            description: formData.description,
                            photos: formData.images?.map(img => URL.createObjectURL(img)) || []
                          })
                        });
                        const result = await response.json();
                        if (result.price) {
                          handleInputChange('price', result.price);
                        }
                      } catch (error) {
                        console.error('Error getting price suggestion:', error);
                      }
                    }
                  }}
                  className="btn btn-outline whitespace-nowrap"
                >
                  Suggest Price
                </button>
              </div>
              {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
            </div>

            {/* Location field removed for MVP */}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Final Review & Publish</h3>
              
              <div className="space-y-4">
                {formData.images && formData.images.length > 0 && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={URL.createObjectURL(formData.images[0])}
                      alt="Item preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                
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
                    <span className="text-gray-400">Price:</span>
                    <span className="ml-2 text-white">${formData.price}</span>
                  </div>
                </div>
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
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sell Your Item</h1>
          <p className="text-lg text-gray-400">Upload a photo and let AI do the work for you</p>
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
                {currentStep === 1 ? 'Analyze with AI' : currentStep === 2 ? 'Review & Edit' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
