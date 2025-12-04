'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Upload, X, Brain, Zap, Edit, Send } from 'lucide-react';
import { SimpleListingCreate } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import { PhotoUpload } from '@/components/PhotoUpload';
import { AIListingAssistant } from '@/components/AIListingAssistant';
import Select from '@/components/Select';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreServices } from '@/lib/services/firestore';
import { Toast, ToastType } from '@/components/Toast';
import { isCloudUrl } from '@/types/photos';
import { uploadListingPhotoFile } from '@/lib/storage';

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

  // Photo state management
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [listingId, setListingId] = useState<string | undefined>(undefined);
  
  // Photo change handler - memoized to prevent infinite re-renders
  const handlePhotoChange = useCallback((urls: string[]) => {
    setPhotoUrls(urls);
    // Update formData.photos to maintain compatibility
    setFormData(prev => ({ ...prev, photos: urls }));
  }, []);

  // Create temporary listing ID for photo uploads
  useEffect(() => {
    if (!listingId && currentUser?.uid) {
      // Generate a temporary listing ID for photo uploads
      const tempId = `temp-${currentUser.uid}-${Date.now()}`;
      setListingId(tempId);
    }
  }, [currentUser, listingId]);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingLabel, setUploadingLabel] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [priceSuggesting, setPriceSuggesting] = useState(false);
  const [lastPriceSuggestionTime, setLastPriceSuggestionTime] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; title: string; message?: string }>>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiAssistantComplete, setAiAssistantComplete] = useState(false);
  const [initialEvidence, setInitialEvidence] = useState<any>(null);
  
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
    shipping?: {
      weight?: string;
      length?: string;
      width?: string;
      height?: string;
      labelScanUrl?: string;
    };
  }>({
    title: '',
    description: '',
    price: '',
    category: '',
    photos: [],
    condition: '',
    size: '',
    sizeCategory: undefined,
    shipping: {
      weight: '',
      length: '',
      width: '',
      height: '',
      labelScanUrl: undefined,
    },
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

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  }, []);

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!photoUrls?.length) stepErrors.photos = 'At least one photo is required';
        else if (!photoUrls.every(url => isCloudUrl(url))) stepErrors.photos = 'Photos must be uploaded to cloud storage';
        break;
      case 2:
        // AI will fill this automatically, so we'll skip validation for now
        break;
      case 3:
        if (!formData.title?.trim()) stepErrors.title = 'Title is required';
        if (!formData.description?.trim()) stepErrors.description = 'Description is required';
        if (!formData.category) stepErrors.category = 'Category is required';
        if (!formData.price || parseFloat(formData.price) <= 0) stepErrors.price = 'Valid price is required';
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

  // Removed legacy fallback analysis tester (no corresponding API route)

  const performAIAnalysis = async () => {
    console.log('🔥 PERFORM AI ANALYSIS FUNCTION CALLED!');
    console.log('🔥 Current user:', currentUser);
    console.log('🔥 Photo URLs:', photoUrls);
    
    if (!currentUser || !photoUrls.length) {
      console.error('❌ AI Analysis aborted: missing user or photos');
      return;
    }

    // Block if photos are not cloud URLs
    if (!photoUrls.every(url => isCloudUrl(url))) {
      throw new Error('Photos must be uploaded to cloud storage before AI analysis');
    }

    try {
      setAiAnalyzing(true);
      console.log('🤖 Starting AI analysis for uploaded photos');
      console.log('🤖 Current user:', currentUser.uid);
      console.log('🤖 Photos to analyze:', photoUrls);
      
      console.log('🤖 Valid photos for AI analysis:', photoUrls);
      
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/ai/analyze-product', {
        imageUrls: photoUrls, // Use only cloud URLs
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🤖 API error response:', errorText);
        throw new Error(`AI analysis failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🤖 API response result:', result);
      const analysis = result.analysis;
      
      // Store initial evidence for Phase 2 - use the full evidence object if available
      setInitialEvidence(analysis._evidence || {
        brand: analysis.brand,
        model: analysis.model,
        product_type: analysis.category,
        visible_features: analysis.features,
        model_exact: analysis.model,
        model_range: analysis.model
      });
      
      // Store the analysis for the AI assistant
      setAiAnalysis(analysis);
      
      // Check if there's missing information that needs user input
      if (analysis.missingInfo && analysis.missingInfo.length > 0) {
        console.log('🤖 Missing information detected:', analysis.missingInfo);
        setShowAIAssistant(true);
        setCurrentStep(3); // Go to AI assistant step
        addToast('info', 'Additional Info Needed', 'Please answer a few questions to complete your listing.');
      } else {
        // No missing info, use initial analysis
        const aiData = {
          title: analysis.title,
          description: analysis.description,
          category: analysis.category,
          price: analysis.suggestedPrice ? analysis.suggestedPrice.toString() : '',
          condition: analysis.condition,
          marketResearch: analysis.marketResearch,
        };
        setFormData(prev => ({ ...prev, ...aiData }));
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

  const handleAIAssistantComplete = async (userAnswers?: Record<string, string>) => {
    console.log('🤖 AI Assistant completed with answers:', userAnswers);
    console.log('🤖 Initial evidence:', initialEvidence);
    console.log('🤖 Photo URLs count:', photoUrls.length);
    
    // If we have user answers and initial evidence, generate final listing
    if (userAnswers && Object.keys(userAnswers).length > 0 && initialEvidence && photoUrls.length > 0) {
      try {
        setAiAnalyzing(true);
        const { apiPost } = await import('@/lib/api-client');
        const response = await apiPost('/api/ai/analyze-product', {
          imageUrls: photoUrls,
          phase: 'final',
          userAnswers,
          initialEvidence
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🤖 Phase 2 API error:', errorText);
          throw new Error(`Failed to generate final listing: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.analysis) {
          console.error('🤖 Invalid Phase 2 response:', result);
          throw new Error('Invalid response from Phase 2');
        }
        
        const finalAnalysis = result.analysis;
        console.log('🤖 Final analysis received:', finalAnalysis);

        // Update form with final, polished listing
        setFormData(prev => ({
          ...prev,
          title: finalAnalysis.title,
          description: finalAnalysis.description,
          category: finalAnalysis.category,
          price: finalAnalysis.suggestedPrice ? finalAnalysis.suggestedPrice.toString() : '',
          condition: finalAnalysis.condition,
          marketResearch: finalAnalysis.marketResearch,
        }));
        setAiAnalysis(finalAnalysis);
        setShowAIAssistant(false);
        setAiAssistantComplete(true);
        setCurrentStep(4);
        addToast('success', 'Listing Ready!', 'Your listing has been generated with all the details.');
      } catch (error) {
        console.error('❌ Error generating final listing:', error);
        addToast('error', 'Generation Failed', error instanceof Error ? error.message : 'Could not generate final listing. Using initial analysis.');
        setShowAIAssistant(false);
        setAiAssistantComplete(true);
        setCurrentStep(4);
      } finally {
        setAiAnalyzing(false);
      }
    } else {
      console.warn('⚠️ Missing data for Phase 2:', { 
        hasUserAnswers: !!userAnswers, 
        userAnswersCount: userAnswers ? Object.keys(userAnswers).length : 0,
        hasInitialEvidence: !!initialEvidence,
        photoUrlsCount: photoUrls.length 
      });
      setShowAIAssistant(false);
      setAiAssistantComplete(true);
      setCurrentStep(4);
      addToast('success', 'Listing Complete!', 'All information has been gathered. Review and edit your listing before publishing!');
    }
  };

  const suggestAIPrice = async () => {
    if (!formData.title || !formData.category) {
      addToast('error', 'Missing Information', 'Please fill in title and category before getting AI price suggestions');
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
      
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/ai/market-analysis', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        brand: aiAnalysis?.brand || 'Unknown',
        model: aiAnalysis?.model || 'Unknown'
      }, { requireAuth: false });
      
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
    if (!photoUrls.length) newErrors.photos = 'At least one photo is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setLoading(true);
      
      // First, create the listing without photos
      const listingData: any = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        images: photoUrls, // Use cloud URLs directly
        condition: formData.condition || 'good',
        inventory: 1,
        isActive: true,
        sellerId: currentUser?.uid || '',
      };

      // Add shipping information if provided
      if (formData.shipping && (
        formData.shipping.weight || 
        formData.shipping.length || 
        formData.shipping.width || 
        formData.shipping.height || 
        formData.shipping.labelScanUrl
      )) {
        listingData.shipping = {
          weight: formData.shipping.weight ? parseFloat(formData.shipping.weight) : undefined,
          length: formData.shipping.length ? parseFloat(formData.shipping.length) : undefined,
          width: formData.shipping.width ? parseFloat(formData.shipping.width) : undefined,
          height: formData.shipping.height ? parseFloat(formData.shipping.height) : undefined,
          labelScanUrl: formData.shipping.labelScanUrl || undefined,
        };
      }
      
      const { apiPost: apiPostListing } = await import('@/lib/api-client');
      const response = await apiPostListing('/api/listings', listingData);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create listing: ${response.status} - ${errorData}`);
      }
      
      const result = await response.json();
      const listingId = result.id;
      
      // Photos are already uploaded via PhotoUpload component
      console.log('📸 Listing created with photos:', photoUrls.length);
      
      // Show success message
      addToast('success', 'Listing Published!', 'Your listing has been successfully created and published.');
      router.push(`/listings/${listingId}`);
      
    } catch (error) {
      console.error('Error creating listing:', error);
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
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4">Upload Your Item Photos</h2>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6 sm:p-8">
                {currentUser ? (
                  <PhotoUpload
                    uid={currentUser.uid}
                    listingId={listingId || ''}
                    max={10}
                    initial={[]}
                    onChange={handlePhotoChange}
                    className="max-w-2xl mx-auto"
                  />
                ) : (
                  <div className="text-center p-8 text-zinc-400">
                    <p>Please sign in to upload photos</p>
                  </div>
                )}
                {errors.photos && <p className="text-red-400 text-sm mt-3">{errors.photos}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Brain className="mx-auto h-16 w-16 text-blue-400 mb-4" />
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-2">AI Analysis</h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-7 mb-6">Let our AI analyze your photos and generate product details</p>
              
              {photoUrls.length === 0 ? (
                <div className="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-400">Please upload photos first to enable AI analysis</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiAnalyzing ? (
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <span className="text-zinc-400">Title</span>
                        <span className="text-zinc-100 animate-pulse">Analyzing photos...</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <span className="text-zinc-400">Category</span>
                        <span className="text-zinc-100 animate-pulse">Identifying product...</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <span className="text-zinc-400">Price</span>
                        <span className="text-zinc-100 animate-pulse">Calculating market value...</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <span className="text-zinc-400">Description</span>
                        <span className="text-zinc-100 animate-pulse">Generating details...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                        <p className="text-zinc-400 text-sm mb-2">Photos uploaded: {photoUrls.length}</p>
                        <p className="text-zinc-100 text-sm">Ready for AI analysis</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => {
                            performAIAnalysis();
                          }}
                          disabled={aiAnalyzing || isUploadingPhotos || !photoUrls.every(url => isCloudUrl(url))}
                          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-1"
                        >
                          {aiAnalyzing ? 'Analyzing...' : 
                           isUploadingPhotos ? 'Uploading Photos...' :
                           !photoUrls.every(url => isCloudUrl(url)) ? 'Photos Must Be Uploaded' :
                           'Analyze with AI'}
                        </button>
                        
                        {/* Removed legacy Test Fallback Analysis button */}
                        
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                        >
                          Skip AI Analysis
                        </button>
                      </div>
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
                  <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-2">Review & Edit AI Suggestions</h2>
                  <p className="text-sm sm:text-base text-zinc-300 leading-7">Review the AI-generated details and make any adjustments</p>
                  {formData.title && formData.description && formData.price && parseFloat(formData.price) > 0 && formData.category && (
                    <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">✅ Ready to Post!</span>
                      </div>
                      <p className="text-green-300 text-xs mt-1">All required fields are filled. You can post your listing now.</p>
                    </div>
                  )}
                </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="What are you selling?"
                className={`rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-zinc-100 placeholder-zinc-500 w-full ${errors.title ? 'border-red-500' : ''}`}
              />
              {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your item in detail..."
                rows={4}
                className={`rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-zinc-100 placeholder-zinc-500 w-full resize-none ${errors.description ? 'border-red-500' : ''}`}
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                Category
              </label>
              <Select
                value={formData.category || null}
                onChange={(value) => handleInputChange('category', value)}
                options={[
                  { value: '', label: 'Select a category' },
                  { value: 'electronics', label: 'Electronics' },
                  { value: 'fashion', label: 'Fashion' },
                  { value: 'home', label: 'Home' },
                  { value: 'sports', label: 'Sports' },
                  { value: 'automotive', label: 'Automotive' },
                  { value: 'other', label: 'Other' }
                ]}
                placeholder="Select a category"
                className={errors.category ? 'border-red-500' : ''}
              />
              {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Condition Field */}
            <div>
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                Condition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'].map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => handleInputChange('condition', condition)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      formData.condition === condition
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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
              <label className="block text-sm font-medium text-zinc-100 mb-2">
                Price
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 pl-8 text-zinc-100 placeholder-zinc-500 w-full ${errors.price ? 'border-red-500' : ''}`}
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
                      
                      const { apiPost: apiPostPrice } = await import('@/lib/api-client');
                      const response = await apiPostPrice('/api/prices/suggest', {
                        title: formData.title,
                        description: formData.description,
                        category: formData.category,
                        condition: formData.condition,
                        size: formData.size || null
                      }, { requireAuth: false });
                      
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
                  className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors whitespace-nowrap ${
                    priceSuggesting ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={!currentUser || formData.photos.length === 0 || priceSuggesting}
                >
                  {priceSuggesting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
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
                        <div className="h-5 w-5 rounded-full bg-yellow-500 flex items-center justify-center shrink-0 mt-0.5">
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
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
                <h4 className="text-sm font-medium text-zinc-100 mb-4">🤖 AI Market Analysis</h4>
                
                {/* Basic Market Data */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-zinc-400">Market Price:</span>
                    <span className="ml-2 text-zinc-100">
                      ${(aiAnalysis?.suggestedPrice || formData.marketResearch?.averagePrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Price Range:</span>
                    <span className="ml-2 text-zinc-100">
                      ${aiAnalysis?.priceRange?.min || formData.marketResearch?.priceRange?.min || 0} - 
                      ${aiAnalysis?.priceRange?.max || formData.marketResearch?.priceRange?.max || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Demand:</span>
                    <span className={`ml-2 capitalize ${
                      (aiAnalysis?.marketData?.demandLevel || formData.marketResearch?.marketDemand) === 'high' ? 'text-green-400' :
                      (aiAnalysis?.marketData?.demandLevel || formData.marketResearch?.marketDemand) === 'medium' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {aiAnalysis?.marketData?.demandLevel || formData.marketResearch?.marketDemand || 'medium'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Competitors:</span>
                    <span className="ml-2 text-zinc-100">
                      {aiAnalysis?.marketData?.competitorCount || formData.marketResearch?.competitorCount || 0} listings
                    </span>
                  </div>
                </div>

                {/* Detailed Reasoning */}
                {aiAnalysis?.reasoning && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-zinc-300 mb-2">💡 Price Reasoning:</h5>
                    <p className="text-xs text-zinc-400 leading-relaxed">{aiAnalysis.reasoning}</p>
                  </div>
                )}

                {/* Platform Research */}
                {aiAnalysis?.platformResearch && (
                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-zinc-300 mb-2">🔍 Platform Research:</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {aiAnalysis.platformResearch.eBay && (
                        <div className="text-zinc-400">
                          <span className="font-medium">eBay:</span> {aiAnalysis.platformResearch.eBay}
                        </div>
                      )}
                      {aiAnalysis.platformResearch.amazon && (
                        <div className="text-zinc-400">
                          <span className="font-medium">Amazon:</span> {aiAnalysis.platformResearch.amazon}
                        </div>
                      )}
                      {aiAnalysis.platformResearch.facebookMarketplace && (
                        <div className="text-zinc-400">
                          <span className="font-medium">Facebook:</span> {aiAnalysis.platformResearch.facebookMarketplace}
                        </div>
                      )}
                      {aiAnalysis.platformResearch.craigslist && (
                        <div className="text-zinc-400">
                          <span className="font-medium">Craigslist:</span> {aiAnalysis.platformResearch.craigslist}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Price Factors */}
                {aiAnalysis?.priceFactors && (
                  <div>
                    <h5 className="text-xs font-medium text-zinc-300 mb-2">📊 Key Price Factors:</h5>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      {aiAnalysis.priceFactors.map((factor: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="text-zinc-500 mr-2">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Location field removed for MVP */}

            {/* Shipping Information Section */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Shipping Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-100 mb-2">
                    Package Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={formData.shipping?.weight || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shipping: {
                        ...prev.shipping,
                        weight: e.target.value,
                      }
                    }))}
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                    className="rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-zinc-100 placeholder-zinc-500 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100 mb-2">
                    Package Length (inches)
                  </label>
                  <input
                    type="number"
                    value={formData.shipping?.length || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shipping: {
                        ...prev.shipping,
                        length: e.target.value,
                      }
                    }))}
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                    className="rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-zinc-100 placeholder-zinc-500 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100 mb-2">
                    Package Width (inches)
                  </label>
                  <input
                    type="number"
                    value={formData.shipping?.width || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shipping: {
                        ...prev.shipping,
                        width: e.target.value,
                      }
                    }))}
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                    className="rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-zinc-100 placeholder-zinc-500 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-100 mb-2">
                    Package Height (inches)
                  </label>
                  <input
                    type="number"
                    value={formData.shipping?.height || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      shipping: {
                        ...prev.shipping,
                        height: e.target.value,
                      }
                    }))}
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                    className="rounded-xl bg-zinc-900/60 border border-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-4 py-3 text-zinc-100 placeholder-zinc-500 w-full"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-100 mb-2">
                  Shipping Label Scan
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="label-scan-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !currentUser || !listingId) return;
                      
                      try {
                        setUploadingLabel(true);
                        const result = await uploadListingPhotoFile({
                          uid: currentUser.uid,
                          listingId,
                          file,
                        });
                        setFormData(prev => ({
                          ...prev,
                          shipping: {
                            ...prev.shipping,
                            labelScanUrl: result.url,
                          }
                        }));
                        addToast('success', 'Label Scan Uploaded', 'Shipping label scan has been uploaded successfully.');
                      } catch (error) {
                        console.error('Error uploading label scan:', error);
                        addToast('error', 'Upload Failed', 'Failed to upload shipping label scan. Please try again.');
                      } finally {
                        setUploadingLabel(false);
                        // Reset the input
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('label-scan-upload');
                      input?.click();
                    }}
                    disabled={uploadingLabel || loading || !currentUser || !listingId}
                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {formData.shipping?.labelScanUrl ? 'Replace Label Scan' : 'Scan Label'}
                  </button>
                  {formData.shipping?.labelScanUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={formData.shipping.labelScanUrl}
                        alt="Shipping label scan"
                        className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          shipping: {
                            ...prev.shipping,
                            labelScanUrl: undefined,
                          }
                        }))}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-2">Review & Edit Your Listing</h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-7">Review all the details and make any final adjustments before publishing</p>
            </div>

            {/* Product Preview */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6 mb-6">
              <h4 className="text-md font-semibold text-zinc-100 mb-4">Product Preview</h4>
              
              <div className="flex gap-6">
                {photoUrls && photoUrls.length > 0 && (
                  <div className="shrink-0">
                    <img
                      src={photoUrls[0]}
                      alt="Item preview"
                      className="w-32 h-32 object-cover rounded-xl"
                    />
                  </div>
                )}
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h5 className="font-medium text-zinc-100 text-lg">{formData.title}</h5>
                    <p className="text-zinc-400 text-sm mt-1">{formData.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-400">Category:</span>
                      <span className="ml-2 text-zinc-100 capitalize">{formData.category}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Condition:</span>
                      <span className="ml-2 text-zinc-100">{formData.condition}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Price:</span>
                      <span className="ml-2 text-zinc-100 font-semibold">${formData.price.toLocaleString()}</span>
                    </div>
                    {formData.size && (
                      <div>
                        <span className="text-zinc-400">Size:</span>
                        <span className="ml-2 text-zinc-100">{formData.size}</span>
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
                  <Select
                    value={formData.category || null}
                    onChange={(value) => handleInputChange('category', value)}
                    options={[
                      { value: '', label: 'Select a category' },
                      { value: 'electronics', label: 'Electronics' },
                      { value: 'fashion', label: 'Fashion' },
                      { value: 'home', label: 'Home' },
                      { value: 'sports', label: 'Sports' },
                      { value: 'automotive', label: 'Automotive' },
                      { value: 'toys', label: 'Toys' },
                      { value: 'beauty', label: 'Beauty' },
                      { value: 'appliances', label: 'Appliances' },
                      { value: 'books', label: 'Books' },
                      { value: 'tools', label: 'Tools' },
                      { value: 'other', label: 'Other' }
                    ]}
                    placeholder="Select a category"
                    className={errors.category ? 'border-red-500' : ''}
                  />
                  {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Condition
                  </label>
                  <Select
                    value={formData.condition || null}
                    onChange={(value) => handleInputChange('condition', value)}
                    options={[
                      { value: '', label: 'Select condition' },
                      { value: 'new', label: 'New' },
                      { value: 'like-new', label: 'Like New' },
                      { value: 'good', label: 'Good' },
                      { value: 'fair', label: 'Fair' },
                      { value: 'poor', label: 'Poor' }
                    ]}
                    placeholder="Select condition"
                    className={errors.condition ? 'border-red-500' : ''}
                  />
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
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4">Final Review & Publish</h2>
              
              <div className="space-y-4">
                {photoUrls && photoUrls.length > 0 && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={photoUrls[0]}
                      alt="Item preview"
                      className="w-32 h-32 object-cover rounded-xl"
                    />
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-zinc-100">{formData.title}</h4>
                  <p className="text-zinc-400 text-sm">{formData.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">Category:</span>
                    <span className="ml-2 text-zinc-100">{formData.category}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Price:</span>
                    <span className="ml-2 text-zinc-100">${formData.price.toLocaleString()}</span>
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
      
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        {/* Header Hero */}
        <header className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300">
            <img src="/logo.png" alt="" className="object-cover rounded-xl" style={{ width: "auto", height: "auto" }} />
            ALL VERSE GPT
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-100">Sell Your Item</h1>
          <p className="text-sm sm:text-base text-zinc-300 leading-7">Upload a photo and let AI do the work for you</p>
        </header>

        {/* Stepper */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isUpcoming = currentStep < step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                    <div 
                      className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-600 text-white' 
                          : isCompleted 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-zinc-800 text-zinc-300'
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-center sm:text-left">
                      <div className={`text-sm font-medium ${
                        isActive || isCompleted ? 'text-zinc-100' : 'text-zinc-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-zinc-500">{step.description}</div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block w-12 h-0.5 mx-4 transition-all duration-200 ${
                      isCompleted ? 'bg-blue-500' : 'bg-zinc-800'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur shadow-lg p-6 sm:p-8">
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={nextStep}
                disabled={loading || aiAnalyzing}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed gap-2"
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
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed gap-2"
              >
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            )}
          </div>
        </div>
      </section>

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
