'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';
import ListingGalleryEditor from '@/components/ListingGalleryEditor';
import Select from '@/components/Select';
import { useAuth } from '@/contexts/AuthContext';
import { Toast, ToastType } from '@/components/Toast';

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const { currentUser } = useAuth();
  const listingId = params.id as string;

  // All state declarations
  const [loading, setLoading] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; title: string; message?: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'good' as const,
  });

  // All hooks must be declared before any conditional returns
  useEffect(() => {
    console.log("[EditPage] mounted");
    return () => console.log("[EditPage] unmounted");
  }, []);

  useEffect(() => {
    const onVis = () => console.log("[EditPage] visibilitychange:", document.visibilityState);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const handlePhotoChange = useCallback((newPhotoUrls: string[]) => {
    setPhotoUrls(newPhotoUrls);
  }, []);

  const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    // no-op
  }, []);

  // Toast helper functions
  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Load listing data
  useEffect(() => {
    const loadListing = async () => {
      if (!listingId || !currentUser) return;

      try {
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet(`/api/listings/${listingId}`, { requireAuth: false });
        if (!response.ok) {
          throw new Error('Failed to load listing');
        }

        const listingData = await response.json();
        
        // Check if user owns this listing
        if (listingData.sellerId !== currentUser.uid) {
          addToast('error', 'Access Denied', 'You can only edit your own listings.');
          router.push('/my-listings');
          return;
        }

        setListing(listingData);
        setFormData({
          title: listingData.title,
          description: listingData.description,
          price: listingData.price.toString(),
          category: listingData.category,
          condition: listingData.condition || 'good',
        });
        
        setPhotoUrls(listingData.photos || listingData.images || []);
      } catch (error) {
        console.error('Error loading listing:', error);
        addToast('error', 'Error', 'Failed to load listing data.');
      }
    };

    loadListing();
  }, [listingId, currentUser, router, addToast]);

  // Owner check
  const isOwner = currentUser?.uid && listing?.sellerId && currentUser.uid === listing.sellerId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Block submits while busy
    if (busy) {
      return;
    }
    
    if (!currentUser || !listing) {
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
      
      const { apiPut } = await import('@/lib/api-client');
      const response = await apiPut(`/api/listings/${listingId}`, {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: photoUrls,
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update listing: ${response.status} - ${errorData}`);
      }
      
      addToast('success', 'Listing Updated!', 'Your listing has been successfully updated.');
      router.push(`/listings/${listingId}`);
      
    } catch (error) {
      console.error('Error updating listing:', error);
      setErrors({ submit: 'Failed to update listing. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Early return after all hooks are declared
  if (!listing) {
    return (
      <div className="min-h-screen bg-dark-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Listing</h1>
              <p className="text-gray-400">Update your listing details</p>
            </div>
          </div>

          {/* Photos (outside the form to avoid implicit submits) */}
          <ListingGalleryEditor
            uid={currentUser.uid}
            listingId={listingId}
            urls={photoUrls}
            onChangeUrls={handlePhotoChange}
            onBusyChange={setBusy}
          />
          {errors.photos && <p className="text-red-400 text-sm mt-2">{errors.photos}</p>}

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-8">

            {/* Basic Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Enter listing title"
                  />
                  {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Category *
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    options={[
                      { value: '', label: 'Select category' },
                      { value: 'electronics', label: 'Electronics' },
                      { value: 'fashion', label: 'Fashion' },
                      { value: 'home', label: 'Home & Garden' },
                      { value: 'sports', label: 'Sports & Outdoors' },
                      { value: 'books', label: 'Books & Media' },
                      { value: 'vehicles', label: 'Vehicles' },
                      { value: 'other', label: 'Other' }
                    ]}
                    placeholder="Select category"
                  />
                  {errors.category && <p className="text-red-400 text-sm mt-1">{errors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Condition
                  </label>
                  <Select
                    value={formData.condition}
                    onChange={(value) => setFormData(prev => ({ ...prev, condition: value as any }))}
                    options={[
                      { value: 'new', label: 'New' },
                      { value: 'like-new', label: 'Like New' },
                      { value: 'good', label: 'Good' },
                      { value: 'fair', label: 'Fair' }
                    ]}
                    placeholder="Select condition"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="Describe your item..."
                />
                {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || busy}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : busy ? 'Processing...' : 'Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-outline flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>

            {errors.submit && (
              <div className="text-red-400 text-sm">{errors.submit}</div>
            )}
          </form>
        </div>
      </div>

      {/* Toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Crop removed */}
    </div>
  );
}
