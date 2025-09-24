'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Upload, X, Brain, Zap, Edit, Send } from 'lucide-react';
import { SimpleListingCreate } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { PhotoUpload, AIListingAssistant } from '@/components/DynamicImports';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreServices } from '@/lib/services/firestore';
import { Toast, ToastType } from '@/components/Toast';
import { AIStatusIndicator } from '@/components/AIStatusIndicator';

const steps = [
  { id: 1, title: 'Photo Upload', description: 'Upload your item photo', icon: Upload },
  { id: 2, title: 'AI Analysis', description: 'AI analyzes your item', icon: Brain },
  { id: 3, title: 'Complete Info', description: 'AI asks for missing details', icon: Zap },
  { id: 4, title: 'Review & Edit', description: 'Review and edit your listing', icon: Edit },
  { id: 5, title: 'Publish', description: 'Final review and publish', icon: Send },
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
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiAssistantComplete, setAiAssistantComplete] = useState(false);
  const [formData, setFormData] = useState<Omit<SimpleListingCreate, 'price'> & {
    price: string;
    marketResearch?: {
      averagePrice: number;
      priceRange: { min: number; max: number };
      marketDemand: 'high' | 'medium' | 'low';
      competitorCount: number;
    };
    condition?: string;
    size?: string;
    sizeCategory?: 'clothing' | 'footwear';
    location?: string;
  }>({
    title: '',
    description: '',
    price: '',
    category: '',
    photos: [],
    condition: '',
    size: '',
    sizeCategory: undefined,
    location: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    console.log('Sell page auth check:', { currentUser: !!currentUser, uid: currentUser?.uid });
    if (!currentUser) {
      console.log('No user found, redirecting to signin');
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
        if (!formData.price || parseFloat(formData.price) <= 0) stepErrors.price = 'Valid price is required';
        // Location not required for MVP
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        // Just move to AI analysis step - no listing creation yet
        setCurrentStep(2);
        // Start AI analysis with uploaded photos
        await performAIAnalysis();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, steps.length));
      }
    }
  };



  const testFallbackAnalysis = async () => {
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
          listingId: null // No listing ID since we haven't created one yet
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Fallback test failed: ${response.status}`);
      }
      
      const result = await response.json();
      const analysis = result.analysis;
      
      console.log('🧪 Fallback analysis result:', analysis);
      
      // Update form data with fallback data (no database save yet)
      const aiData = {
        title: analysis.title,
        description: analysis.description,
        category: analysis.category,
        price: analysis.suggestedPrice,
        condition: analysis.condition,
        marketResearch: analysis.marketResearch,
      };
      
      // Update form data to show fallback results
      setFormData(prev => ({ ...prev, ...aiData }));
      setCurrentStep(3);
      console.log('🧪 Form updated with fallback analysis');
      
      // Show success toast
      addToast('success', 'Fallback Analysis Complete', 'Product details generated using fallback analysis!');
      
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

  const performAIAnalysis = async () => {
    if (!currentUser || !formData.photos.length) {
      console.error('❌ AI Analysis aborted: missing user or photos');
      return;
    }

    try {
      setAiAnalyzing(true);
      console.log('🤖 Starting AI analysis for uploaded photos');
      console.log('🤖 Photos to analyze:', formData.photos);
      
      // Verify photos are accessible URLs
      const validPhotos = formData.photos.filter(url => 
        url && (url.startsWith('http') || url.startsWith('https'))
      );
      
      if (validPhotos.length === 0) {
        console.error('❌ No valid HTTP/HTTPS photo URLs found:', formData.photos);
        throw new Error('Photos must be uploaded to cloud storage before AI analysis');
      }
      
      console.log('🤖 Valid photos for AI analysis:', validPhotos);
      
      // Call real AI analysis API
      const response = await fetch('/api/ai/analyze-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify({
          imageUrls: validPhotos, // Use only valid URLs
          listingId: null, // No listing ID since we haven't created one yet
          location: formData.location // Include location for regional pricing
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI analysis failed');
      }
      
      const result = await response.json();
      const analysis = result.analysis;
      
      // Update form data with AI-generated data (no database save yet)
      const aiData = {
        title: analysis.title,
        description: analysis.description,
        category: analysis.category,
        price: analysis.suggestedPrice ? analysis.suggestedPrice.toString() : '',
        condition: analysis.condition,
        marketResearch: analysis.marketResearch,
      };
      
      console.log('🤖 AI Data to update form:', aiData);
      console.log('🤖 Analysis condition:', analysis.condition);
      console.log('🤖 Current formData.condition:', formData.condition);
      
      // Update form data to show AI results
      setFormData(prev => {
        const updated = { ...prev, ...aiData };
        console.log('🤖 Updated formData.condition:', updated.condition);
        return updated;
      });
      
      // Store the analysis for the AI assistant
      setAiAnalysis(analysis);
      
      // Check if there's missing information that needs user input
      if (analysis.missingInfo && analysis.missingInfo.length > 0) {
        console.log('🤖 Missing information detected:', analysis.missingInfo);
        setShowAIAssistant(true);
        setCurrentStep(3); // Go to AI assistant step
        addToast('info', 'AI Assistant Ready', 'The AI needs some additional information to complete your listing.');
      } else {
        setCurrentStep(3); // Go to review step
        addToast('success', 'AI Analysis Complete', 'Product details have been generated successfully!');
      }
      
    } catch (error) {
      console.error('❌ Error in AI analysis:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ AI Analysis error details:', errorMessage);
      
      if (errorMessage.includes('cloud storage')) {
        // Photo upload issue
        addToast('error', 'Photo Upload Issue', 'Photos need to be properly uploaded before AI analysis. Please try uploading again.');
        setCurrentStep(1); // Go back to photo upload step
      } else {
        // General AI analysis failure
        setErrors({ submit: 'AI analysis failed. You can still edit manually.' });
        setCurrentStep(3);
        addToast('error', 'AI Analysis Failed', 'Using fallback analysis. You can edit the details manually.');
      }
    } finally {
      setAiAnalyzing(false);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // AI Assistant handlers
  const handleAIAssistantUpdate = (updatedData: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedPrice: number;
  }) => {
    console.log('🤖 AI Assistant updated listing:', updatedData);
    setFormData(prev => ({
      ...prev,
      title: updatedData.title,
      description: updatedData.description,
      category: updatedData.category,
      condition: updatedData.condition,
      price: updatedData.suggestedPrice.toString(),
    }));
  };

  const handleAIAssistantComplete = () => {
    console.log('🤖 AI Assistant completed');
    setShowAIAssistant(false);
    setAiAssistantComplete(true);
    setCurrentStep(4); // Move to review & edit step
    addToast('success', 'Listing Complete!', 'All information has been gathered. Review and edit your listing before publishing!');
  };

  const suggestAIPrice = async () => {
    if (!formData.title || !formData.category) {
      addToast('error', 'Missing Information', 'Please fill in title and category before getting AI price suggestions');
      return;
    }

    // Basic US location validation
    if (formData.location && !formData.location.match(/^[A-Za-z\s]+,\s*[A-Z]{2}$/)) {
      addToast('warning', 'Location Format', 'Please use format: "City, ST" (e.g., Tampa, FL)');
      return;
    }

    // Rate limiting - prevent too frequent requests
    const now = Date.now();
    if (now - lastPriceSuggestionTime < 5000) { // 5 seconds cooldown
      addToast('warning', 'Please Wait', 'Please wait a moment before requesting another price analysis');
      return;
    }

    try {
      setPriceSuggesting(true);
      setLastPriceSuggestionTime(now);
      
      console.log('💰 Starting AI market analysis for pricing...');
      
      const response = await fetch('/api/ai/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition,
          location: formData.location || 'United States',
          brand: aiAnalysis?.brand || 'Unknown',
          model: aiAnalysis?.model || 'Unknown'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Market analysis failed');
      }
      
      const result = await response.json();
      console.log('💰 AI market analysis result:', result);
      
      if (result.success && result.data?.marketAnalysis) {
        const marketData = result.data.marketAnalysis;
        
        // Update form data with market research
        setFormData(prev => ({
          ...prev,
          price: marketData.suggestedPrice.toString(),
          marketResearch: {
            averagePrice: marketData.suggestedPrice,
            priceRange: marketData.priceRange,
            marketDemand: marketData.marketDemand,
            competitorCount: marketData.competitorCount
          }
        }));
        
        addToast('success', 'AI Price Analysis Complete!', 
          `Price updated to $${marketData.suggestedPrice} (${marketData.marketDemand} demand, range: $${marketData.priceRange.min}-$${marketData.priceRange.max})`);
      } else {
        throw new Error('Invalid market analysis response');
      }
      
    } catch (error) {
      console.error('💰 Error in AI price suggestion:', error);
      addToast('error', 'Price Analysis Failed', 'Unable to get AI price suggestions. Please try again.');
    } finally {
      setPriceSuggesting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!currentUser) {
      setErrors({ submit: 'User not authenticated' });
      return;
    }
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Price must be greater than 0';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.photos.length) newErrors.photos = 'At least one photo is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Create listing with final data (this is when it actually gets saved)
      const listingData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        photos: formData.photos,
        condition: formData.condition || 'good',
        inventory: 1,
        isActive: true,
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
        const errorData = await response.text();
        throw new Error(`Failed to create listing: ${response.status} - ${errorData}`);
      }
      
      const result = await response.json();
      
      // Show success message
      addToast('success', 'Listing Published!', 'Your listing has been successfully created and published.');
      router.push(`/listings/${result.id}`);
      
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
                listingId={`temp-${Date.now()}`}
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
                        onClick={() => performAIAnalysis()}
                        disabled={aiAnalyzing}
                        className="btn btn-primary w-full"
                      >
                        {aiAnalyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
                      </button>
                      
                      <button
                        onClick={() => testFallbackAnalysis()}
                        disabled={aiAnalyzing}
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
            {showAIAssistant && aiAnalysis ? (
              <AIListingAssistant
                initialAnalysis={{
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  condition: formData.condition || 'good',
                  suggestedPrice: parseFloat(formData.price),
                  missingInfo: aiAnalysis.missingInfo || []
                }}
                onUpdate={handleAIAssistantUpdate}
                onComplete={handleAIAssistantComplete}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Review & Edit AI Suggestions</h3>
                  <p className="text-gray-400 text-sm">Review the AI-generated details and make any adjustments</p>
                  {formData.title && formData.description && formData.price && parseFloat(formData.price) > 0 && formData.category && (
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
                    onChange={(e) => handleInputChange('price', e.target.value)}
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

            {/* Price Validation Warning */}
            {(formData.marketResearch || aiAnalysis) && formData.price && parseFloat(formData.price) > 0 && (
              (() => {
                const suggestedPrice = aiAnalysis?.suggestedPrice || formData.marketResearch?.averagePrice || 0;
                const minPrice = aiAnalysis?.priceRange?.min || formData.marketResearch?.priceRange?.min || 0;
                const maxPrice = aiAnalysis?.priceRange?.max || formData.marketResearch?.priceRange?.max || 0;
                const currentPrice = parseFloat(formData.price);
                
                if (currentPrice < minPrice || currentPrice > maxPrice) {
                  return (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-black font-bold">!</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-yellow-400 mb-1">Price Outside Suggested Range</h4>
                          <p className="text-sm text-yellow-200 mb-2">
                            Your current price (${currentPrice}) is outside the AI-suggested range of ${minPrice} - ${maxPrice}.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, price: suggestedPrice.toString() }))}
                              className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md transition-colors"
                            >
                              Use AI Suggested Price (${suggestedPrice})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, price: minPrice.toString() }))}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors"
                            >
                              Use Min Price (${minPrice})
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}

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
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Review & Edit Your Listing</h3>
              <p className="text-gray-400 text-sm">Review all the details and make any final adjustments before publishing</p>
            </div>

            {/* Product Preview */}
            <div className="card p-6 mb-6">
              <h4 className="text-md font-semibold text-white mb-4">Product Preview</h4>
              
              <div className="flex gap-6">
                {formData.photos && formData.photos.length > 0 && (
                  <div className="flex-shrink-0">
                    <img
                      src={formData.photos[0]}
                      alt="Item preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h5 className="font-medium text-white text-lg">{formData.title}</h5>
                    <p className="text-gray-400 text-sm mt-1">{formData.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <span className="ml-2 text-white capitalize">{formData.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Condition:</span>
                      <span className="ml-2 text-white">{formData.condition}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <span className="ml-2 text-white font-semibold">${formData.price.toLocaleString()}</span>
                    </div>
                    {formData.size && (
                      <div>
                        <span className="text-gray-400">Size:</span>
                        <span className="ml-2 text-white">{formData.size}</span>
                      </div>
                    )}
                    {formData.location && (
                      <div>
                        <span className="text-gray-400">Location:</span>
                        <span className="ml-2 text-white">{formData.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
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
                  rows={4}
                  className={`input resize-none ${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <option value="toys">Toys</option>
                    <option value="beauty">Beauty</option>
                    <option value="appliances">Appliances</option>
                    <option value="books">Books</option>
                    <option value="tools">Tools</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Condition
                  </label>
                  <select
                    value={formData.condition || ''}
                    onChange={(e) => handleInputChange('condition', e.target.value)}
                    className={`input ${errors.condition ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select condition</option>
                    <option value="new">New</option>
                    <option value="like-new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                  {errors.condition && <p className="text-red-400 text-sm mt-1">{errors.condition}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Price ($)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`input flex-1 ${errors.price ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={suggestAIPrice}
                    disabled={priceSuggesting || !formData.title || !formData.category}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {priceSuggesting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        AI Price
                      </>
                    )}
                  </button>
                </div>
                {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                {formData.marketResearch && (
                  <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="text-sm text-blue-400">
                      <div className="flex justify-between items-center mb-1">
                        <span>AI Suggested Price:</span>
                        <span className="font-semibold">${formData.marketResearch.averagePrice}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-300">
                        <span>Market Range:</span>
                        <span>${formData.marketResearch.priceRange.min} - ${formData.marketResearch.priceRange.max}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-300">
                        <span>Demand:</span>
                        <span className="capitalize">{formData.marketResearch.marketDemand}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Location <span className="text-gray-400 text-sm">(US Only)</span>
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Tampa, FL or New York, NY"
                  className="input"
                  list="us-locations"
                />
                <datalist id="us-locations">
                  <option value="New York, NY" />
                  <option value="Los Angeles, CA" />
                  <option value="Chicago, IL" />
                  <option value="Houston, TX" />
                  <option value="Phoenix, AZ" />
                  <option value="Philadelphia, PA" />
                  <option value="San Antonio, TX" />
                  <option value="San Diego, CA" />
                  <option value="Dallas, TX" />
                  <option value="San Jose, CA" />
                  <option value="Austin, TX" />
                  <option value="Jacksonville, FL" />
                  <option value="Fort Worth, TX" />
                  <option value="Columbus, OH" />
                  <option value="Charlotte, NC" />
                  <option value="San Francisco, CA" />
                  <option value="Indianapolis, IN" />
                  <option value="Seattle, WA" />
                  <option value="Denver, CO" />
                  <option value="Washington, DC" />
                  <option value="Boston, MA" />
                  <option value="El Paso, TX" />
                  <option value="Nashville, TN" />
                  <option value="Detroit, MI" />
                  <option value="Oklahoma City, OK" />
                  <option value="Portland, OR" />
                  <option value="Las Vegas, NV" />
                  <option value="Memphis, TN" />
                  <option value="Louisville, KY" />
                  <option value="Baltimore, MD" />
                  <option value="Milwaukee, WI" />
                  <option value="Albuquerque, NM" />
                  <option value="Tucson, AZ" />
                  <option value="Fresno, CA" />
                  <option value="Sacramento, CA" />
                  <option value="Mesa, AZ" />
                  <option value="Kansas City, MO" />
                  <option value="Atlanta, GA" />
                  <option value="Long Beach, CA" />
                  <option value="Colorado Springs, CO" />
                  <option value="Raleigh, NC" />
                  <option value="Miami, FL" />
                  <option value="Virginia Beach, VA" />
                  <option value="Omaha, NE" />
                  <option value="Oakland, CA" />
                  <option value="Minneapolis, MN" />
                  <option value="Tulsa, OK" />
                  <option value="Arlington, TX" />
                  <option value="Tampa, FL" />
                </datalist>
                <p className="text-gray-400 text-xs mt-1">Enter your US city and state for accurate regional pricing</p>
              </div>

              {formData.size && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={formData.size || ''}
                    onChange={(e) => handleInputChange('size', e.target.value)}
                    placeholder="e.g., Large, 10, 32x34"
                    className="input"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 5:
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
          <div className="flex items-center justify-center">
            <div className="flex items-center">
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
        </div>

        {/* Form Content */}
        <div className="card p-8 no-hover">
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
                {loading ? 'Creating...' : aiAnalyzing ? 'AI Scanning Photos...' : 
                 currentStep === 1 ? 'Analyze with AI' : 
                 currentStep === 2 ? 'Complete Info' : 
                 currentStep === 3 ? 'Review & Edit' : 
                 currentStep === 4 ? 'Publish' : 'Continue'}
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
