'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Upload, X, Brain, Zap } from 'lucide-react';
import { SimpleListingCreate } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { PhotoUpload } from '@/components/PhotoUpload';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreServices } from '@/lib/services/firestore';
import { Toast, ToastType } from '@/components/Toast';
import { AIStatusIndicator } from '@/components/AIStatusIndicator';

const steps = [
  { id: 1, title: 'Photo Upload', description: 'Upload your item photo', icon: Upload },
  { id: 2, title: 'AI Analysis', description: 'AI fills details automatically', icon: Brain },
  { id: 3, title: 'Review & Edit', description: 'Review and adjust if needed', icon: Zap },
  { id: 4, title: 'Publish', description: 'Final review and publish', icon: Brain },
];

export default function SellPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  // Toast helper functions
  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [priceSuggesting, setPriceSuggesting] = useState(false);
  const [lastPriceSuggestionTime, setLastPriceSuggestionTime] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; title: string; message?: string }>>([]);
  const [listingId, setListingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [formData, setFormData] = useState<SimpleListingCreate & {
    marketResearch?: {
      averagePrice: number;
      priceRange: { min: number; max: number };
      marketDemand: 'high' | 'medium' | 'low';
      competitorCount: number;
    };
    condition?: string;
    size?: string;
    sizeCategory?: 'clothing' | 'footwear';
  }>({
    title: '',
    description: '',
    price: 0,
    category: '',
    photos: [],
    condition: 'Good',
    size: '',
    sizeCategory: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      router.push('/signin');
    }
  }, [currentUser, router]);

  // Remove categories fetch since we'll use hardcoded categories

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // Reset size category and size when changing main category
      if (field === 'category') {
        newData.sizeCategory = undefined;
        newData.size = '';
      }
      
      return newData;
    });
    
    if (errors[field as string]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoUpload = (urls: string[]) => {
    console.log('📸 Photos uploaded locally:', urls.length);
    setFormData((prev) => ({
      ...prev,
      photos: urls
    }));
  };

  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.photos?.length) stepErrors.photos = 'At least one photo is required';
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

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        // Create listing first, then upload photos
        await createListingAndUploadPhotos();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, steps.length));
      }
    }
  };

  const createListingAndUploadPhotos = async () => {
    if (!currentUser || !formData.photos.length) return;

    try {
      setLoading(true);
      
      // Create listing first with empty photos array
      const listingData = {
        title: 'AI Analyzing...',
        description: 'AI is analyzing your photos...',
        price: 0,
        category: 'other',
        photos: [], // Start with empty array, photos will be uploaded separately
        condition: 'good' as const,
        inventory: 1,
        sellerId: currentUser.uid,
      };
      
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify(listingData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create listing');
      }
      
      const result = await response.json();
      setListingId(result.id);
      setCurrentStep(2);
      
      // Start AI analysis
      await performAIAnalysis(result.id);
      
    } catch (error) {
      console.error('Error creating listing:', error);
      setErrors({ submit: 'Failed to create listing. Please try again.' });
    } finally {
      setLoading(false);
    }
  };


  const testFallbackAnalysis = async (listingId: string) => {
    if (!currentUser || !formData.photos.length) return;

    try {
      setAiAnalyzing(true);
      
      console.log('🧪 Testing fallback analysis...');
      
      // Call fallback test API
      const response = await fetch('/api/ai/test-fallback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify({
          imageUrls: formData.photos,
          listingId: listingId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Fallback test failed: ${response.status}`);
      }
      
      const result = await response.json();
      const analysis = result.analysis;
      
      console.log('🧪 Fallback analysis result:', analysis);
      
      // Update listing with fallback data
      const aiData = {
        title: analysis.title,
        description: analysis.description,
        category: analysis.category,
        price: analysis.suggestedPrice,
        condition: analysis.condition,
        marketResearch: analysis.marketResearch,
      };
      
      const updateResponse = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify(aiData),
      });
      
      if (updateResponse.ok) {
        // Immediately update form data to show fallback results
        setFormData(prev => ({ ...prev, ...aiData }));
        setCurrentStep(3);
        console.log('🧪 Listing updated with fallback analysis');
        
        // Show success toast
        addToast('success', 'Fallback Analysis Complete', 'Product details generated using fallback analysis!');
      } else {
        // Even if database update fails, still update the form
        setFormData(prev => ({ ...prev, ...aiData }));
        setCurrentStep(3);
        console.log('🧪 Form updated with fallback analysis (database update failed)');
        
        // Show warning toast
        addToast('warning', 'Fallback Analysis Complete', 'Details generated but database update failed. You can still proceed.');
      }
      
    } catch (error) {
      console.error('🧪 Fallback analysis error:', error);
      setErrors({ submit: 'Fallback analysis failed. You can still edit manually.' });
      setCurrentStep(3);
      
      // Show error toast
      addToast('error', 'Fallback Analysis Failed', 'Unable to generate fallback analysis. Please edit manually.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const performAIAnalysis = async (listingId: string) => {
    if (!currentUser || !formData.photos.length) return;

    try {
      setAiAnalyzing(true);
      
      console.log('🤖 Starting real AI analysis...');
      
      // Call real AI analysis API
      const response = await fetch('/api/ai/analyze-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify({
          imageUrls: formData.photos,
          listingId: listingId
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI analysis failed');
      }
      
      const result = await response.json();
      const analysis = result.analysis;
      
      console.log('🤖 AI analysis result:', analysis);
      
      // Update listing with AI-generated data
      const aiData = {
        title: analysis.title,
        description: analysis.description,
        category: analysis.category,
        price: analysis.suggestedPrice,
        condition: analysis.condition,
        marketResearch: analysis.marketResearch,
      };
      
      const updateResponse = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify(aiData),
      });
      
      if (updateResponse.ok) {
        // Immediately update form data to show AI results
        setFormData(prev => ({ ...prev, ...aiData }));
        setCurrentStep(3);
        console.log('🤖 Listing updated with AI analysis');
        console.log('🤖 Form data updated:', aiData);
        
        // Show success toast
        addToast('success', 'AI Analysis Complete', 'Product details have been generated successfully!');
      } else {
        // Even if database update fails, still update the form
        setFormData(prev => ({ ...prev, ...aiData }));
        setCurrentStep(3);
        console.log('🤖 Form updated with AI analysis (database update failed)');
        
        // Show warning toast
        addToast('warning', 'AI Analysis Complete', 'Details generated but database update failed. You can still proceed.');
      }
      
    } catch (error) {
      console.error('Error in AI analysis:', error);
      setErrors({ submit: 'AI analysis failed. You can still edit manually.' });
      setCurrentStep(3);
      
      // Show error toast
      addToast('error', 'AI Analysis Failed', 'Using fallback analysis. You can edit the details manually.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!currentUser || !listingId) {
      setErrors({ submit: 'No listing found to update' });
      return;
    }
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Update listing with final data
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        condition: 'good' as const,
        inventory: 1,
        isActive: true,
      };
      
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify(listingData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update listing');
      }
      
      // Show success message
      alert('Listing published successfully!');
      router.push(`/listings/${listingId}`);
      
    } catch (error) {
      console.error('Error updating listing:', error);
      setErrors({ submit: 'Failed to publish listing. Please try again.' });
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
                Upload Your Item Photos
              </label>
              <PhotoUpload
                type="listing"
                listingId={listingId || `temp-${Date.now()}`}
                maxPhotos={10}
                existingPhotos={formData.photos}
                onUpload={handlePhotoUpload}
                onRemove={handleRemovePhoto}
                className="max-w-2xl mx-auto"
              />
              {errors.photos && <p className="text-red-400 text-sm mt-1">{errors.photos}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Brain className="mx-auto h-16 w-16 text-accent-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-gray-400 mb-6">Let our AI analyze your photos and generate product details</p>
              
              {formData.photos.length === 0 ? (
                <div className="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400">Please upload photos first to enable AI analysis</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiAnalyzing ? (
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                        <span className="text-gray-400">Title</span>
                        <span className="text-white animate-pulse">Analyzing photos...</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                        <span className="text-gray-400">Category</span>
                        <span className="text-white animate-pulse">Identifying product...</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                        <span className="text-gray-400">Price</span>
                        <span className="text-white animate-pulse">Calculating market value...</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                        <span className="text-gray-400">Description</span>
                        <span className="text-white animate-pulse">Generating details...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-dark-700 rounded-lg">
                        <p className="text-gray-400 text-sm mb-2">Photos uploaded: {formData.photos.length}</p>
                        <p className="text-white text-sm">Ready for AI analysis</p>
                      </div>
                      
                      <button
                        onClick={() => listingId && performAIAnalysis(listingId)}
                        disabled={aiAnalyzing || !listingId}
                        className="btn btn-primary w-full"
                      >
                        {aiAnalyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
                      </button>
                      
                      <button
                        onClick={() => listingId && testFallbackAnalysis(listingId)}
                        disabled={aiAnalyzing || !listingId}
                        className="btn btn-secondary w-full"
                      >
                        🧪 Test Fallback Analysis
                      </button>
                      
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="btn btn-outline w-full"
                      >
                        Skip AI Analysis
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Review & Edit AI Suggestions</h3>
              <p className="text-gray-400 text-sm">Review the AI-generated details and make any adjustments</p>
              {formData.title && formData.description && formData.price > 0 && formData.category && (
                <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">✅ Ready to Post!</span>
                  </div>
                  <p className="text-green-300 text-xs mt-1">All required fields are filled. You can post your listing now.</p>
                </div>
              )}
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

            {/* Condition Field */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Condition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'].map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => handleInputChange('condition', condition)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      formData.condition === condition
                        ? 'bg-accent-500 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Field - Only show for relevant categories */}
            {(formData.category === 'fashion' || formData.category === 'sports') && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Size <span className="text-gray-400 text-sm">(Optional)</span>
                </label>
                
                {formData.category === 'fashion' ? (
                  // Fashion items - show size category selector
                  <div className="space-y-4">
                    {/* Size Category Selector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Item Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('sizeCategory', 'clothing');
                            handleInputChange('size', ''); // Reset size when changing category
                          }}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            formData.sizeCategory === 'clothing'
                              ? 'bg-accent-500 text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          👕 Top/Bottom
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('sizeCategory', 'footwear');
                            handleInputChange('size', ''); // Reset size when changing category
                          }}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            formData.sizeCategory === 'footwear'
                              ? 'bg-accent-500 text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          👟 Footwear
                        </button>
                      </div>
                    </div>

                    {/* Size Options based on category */}
                    {formData.sizeCategory && (
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                          {formData.sizeCategory === 'clothing' ? 'Clothing Size' : 'Shoe Size'}
                        </label>
                        {formData.sizeCategory === 'clothing' ? (
                          // Clothing sizes - buttons
                          <div className="grid grid-cols-4 gap-2">
                            <button
                              type="button"
                              onClick={() => handleInputChange('size', '')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                formData.size === ''
                                  ? 'bg-accent-500 text-white'
                                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                              }`}
                            >
                              Any
                            </button>
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => handleInputChange('size', size)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  formData.size === size
                                    ? 'bg-accent-500 text-white'
                                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        ) : (
                          // Footwear sizes - buttons with common shoe sizes
                          <div className="space-y-3">
                            <div className="grid grid-cols-4 gap-2">
                              <button
                                type="button"
                                onClick={() => handleInputChange('size', '')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  formData.size === ''
                                    ? 'bg-accent-500 text-white'
                                    : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                                }`}
                              >
                                Any
                              </button>
                              {['6', '7', '8', '9', '10', '11', '12', '13'].map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => handleInputChange('size', size)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    formData.size === size
                                      ? 'bg-accent-500 text-white'
                                      : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">Custom size:</span>
                              <input
                                type="number"
                                value={formData.size && !['6', '7', '8', '9', '10', '11', '12', '13'].includes(formData.size) ? formData.size : ''}
                                onChange={(e) => handleInputChange('size', e.target.value)}
                                placeholder="e.g., 8.5, 9.5"
                                step="0.5"
                                min="4"
                                max="16"
                                className="w-24 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Sports items - show general size options
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleInputChange('size', '')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          formData.size === ''
                            ? 'bg-accent-500 text-white'
                            : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                        }`}
                      >
                        Any
                      </button>
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleInputChange('size', size)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            formData.size === size
                              ? 'bg-accent-500 text-white'
                              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Custom size:</span>
                      <input
                        type="text"
                        value={formData.size && !['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(formData.size) ? formData.size : ''}
                        onChange={(e) => handleInputChange('size', e.target.value)}
                        placeholder="e.g., 28, 30, 32"
                        className="w-24 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Price Field */}
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
                    if (!currentUser) {
                      addToast('warning', 'Sign In Required', 'Please sign in to get price suggestions');
                      return;
                    }
                    
                    if (formData.photos.length === 0) {
                      addToast('warning', 'Photos Required', 'Please upload photos first to get accurate price suggestions');
                      return;
                    }

                    // Client-side rate limiting (5 seconds between requests)
                    const now = Date.now();
                    if (now - lastPriceSuggestionTime < 5000) {
                      const remainingTime = Math.ceil((5000 - (now - lastPriceSuggestionTime)) / 1000);
                      addToast('warning', 'Please Wait', `Please wait ${remainingTime} seconds before requesting another price suggestion.`);
                      return;
                    }
                    
                    setPriceSuggesting(true);
                    setLastPriceSuggestionTime(now);
                    
                    try {
                      console.log('💰 Getting price suggestion with parameters:', {
                        title: formData.title,
                        description: formData.description,
                        category: formData.category,
                        condition: formData.condition,
                        size: formData.size
                      });
                      
                      const response = await fetch('/api/prices/suggest', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          title: formData.title,
                          description: formData.description,
                          category: formData.category,
                          condition: formData.condition,
                          size: formData.size || null
                        }),
                      });
                      
                      const result = await response.json();
                      console.log('💰 Price suggestion result:', result);
                      
                      if (result.success && result.suggestion) {
                        // Extract price from suggestion text
                        const priceMatch = result.suggestion.match(/\$(\d+(?:\.\d{2})?)/);
                        if (priceMatch) {
                          const suggestedPrice = parseFloat(priceMatch[1]);
                          handleInputChange('price', suggestedPrice);
                          console.log('✅ Price suggestion updated:', suggestedPrice);
                          
                          // Show warning if using fallback
                          if (result.source === 'fallback' && result.warning) {
                            console.log('⚠️ Using fallback pricing:', result.warning);
                            addToast('info', 'Using Fallback Pricing', result.warning);
                          } else {
                            addToast('success', 'Price Suggestion Updated', 'AI has suggested a new price for your item');
                          }
                        }
                      } else if (response.status === 429) {
                        // Rate limit exceeded
                        const retryAfter = result.retryAfter || 60;
                        addToast('warning', 'Rate Limit Exceeded', `Too many requests. Please wait ${retryAfter} seconds before trying again.`);
                      } else {
                        console.error('❌ No price suggestion in response:', result);
                        addToast('error', 'Price Suggestion Failed', result.error || 'Unable to get price suggestion. Please try again.');
                      }
                    } catch (error) {
                      console.error('❌ Error getting price suggestion:', error);
                      addToast('error', 'Price Suggestion Error', error instanceof Error ? error.message : 'Unknown error');
                    } finally {
                      setPriceSuggesting(false);
                    }
                  }}
                  className={`btn btn-outline whitespace-nowrap flex items-center gap-2 ${
                    priceSuggesting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!currentUser || formData.photos.length === 0 || priceSuggesting}
                >
                  {priceSuggesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span>Suggest Price</span>
                    </>
                  )}
                </button>
              </div>
              {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
            </div>

            {/* AI Status Indicator */}
            <div className="mb-4">
              <AIStatusIndicator />
            </div>

            {/* AI Market Research Display */}
            {(formData.marketResearch || aiAnalysis) && (
              <div className="bg-dark-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">🤖 AI Market Analysis</h4>
                
                {/* Basic Market Data */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-400">Market Price:</span>
                    <span className="ml-2 text-white">
                      ${(aiAnalysis?.suggestedPrice || formData.marketResearch?.averagePrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Price Range:</span>
                    <span className="ml-2 text-white">
                      ${aiAnalysis?.priceRange?.min || formData.marketResearch?.priceRange?.min || 0} - 
                      ${aiAnalysis?.priceRange?.max || formData.marketResearch?.priceRange?.max || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Demand:</span>
                    <span className={`ml-2 capitalize ${
                      (aiAnalysis?.marketData?.demandLevel || formData.marketResearch?.marketDemand) === 'high' ? 'text-green-400' :
                      (aiAnalysis?.marketData?.demandLevel || formData.marketResearch?.marketDemand) === 'medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiAnalysis?.marketData?.demandLevel || formData.marketResearch?.marketDemand || 'medium'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Competitors:</span>
                    <span className="ml-2 text-white">
                      {aiAnalysis?.marketData?.competitorCount || formData.marketResearch?.competitorCount || 0} listings
                    </span>
                  </div>
                </div>

                {/* Detailed Reasoning */}
                {aiAnalysis?.reasoning && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-300 mb-2">💡 Price Reasoning:</h5>
                    <p className="text-xs text-gray-400 leading-relaxed">{aiAnalysis.reasoning}</p>
                  </div>
                )}

                {/* Platform Research */}
                {aiAnalysis?.platformResearch && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-gray-300 mb-2">🔍 Platform Research:</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {aiAnalysis.platformResearch.eBay && (
                        <div className="text-gray-400">
                          <span className="font-medium">eBay:</span> {aiAnalysis.platformResearch.eBay}
                        </div>
                      )}
                      {aiAnalysis.platformResearch.amazon && (
                        <div className="text-gray-400">
                          <span className="font-medium">Amazon:</span> {aiAnalysis.platformResearch.amazon}
                        </div>
                      )}
                      {aiAnalysis.platformResearch.facebookMarketplace && (
                        <div className="text-gray-400">
                          <span className="font-medium">Facebook:</span> {aiAnalysis.platformResearch.facebookMarketplace}
                        </div>
                      )}
                      {aiAnalysis.platformResearch.craigslist && (
                        <div className="text-gray-400">
                          <span className="font-medium">Craigslist:</span> {aiAnalysis.platformResearch.craigslist}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Factors */}
                {aiAnalysis?.priceFactors && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-300 mb-2">📊 Key Price Factors:</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {aiAnalysis.priceFactors.map((factor: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-gray-500 mr-2">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Location field removed for MVP */}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Final Review & Publish</h3>
              
              <div className="space-y-4">
                {formData.photos && formData.photos.length > 0 && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={formData.photos[0]}
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
                    <span className="ml-2 text-white">${formData.price.toLocaleString()}</span>
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
          <h1 className="text-5xl font-bold text-white mb-2">Sell Your Item</h1>
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
                disabled={loading || aiAnalyzing}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : aiAnalyzing ? 'AI Scanning Photos...' : currentStep === 1 ? 'Analyze with AI' : currentStep === 2 ? 'Review & Edit' : 'Continue'}
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

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={removeToast}
          />
        ))}
      </div>
    </div>
  );
}
