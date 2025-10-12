'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Phone, Mail, Star, MapPin, Calendar, Shield, Flag } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  rating: number;
  reviewCount: number;
  memberSince: string;
  isVerified: boolean;
  listings: any[];
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const profileResponse = await fetch(`/api/profile?userId=${params.userId}`, {
          headers: {
            'x-user-id': params.userId as string,
          },
        });

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        
        // Fetch user's listings
        const listingsResponse = await fetch(`/api/my-listings`, {
          headers: {
            'x-user-id': params.userId as string,
          },
        });

        let listings = [];
        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          listings = listingsData.data || [];
        }

        // Transform profile data to match UserProfile interface
        const userProfile: UserProfile = {
          id: params.userId as string,
          name: profileData.data?.username || 'Unknown User',
          email: '', // Email is not exposed in public profiles
          avatar: profileData.data?.profilePicture || '',
          bio: profileData.data?.bio || '',
          location: profileData.data?.location || '',
          rating: profileData.data?.rating || 0,
          reviewCount: 0, // This would need to be calculated from reviews
          memberSince: profileData.data?.createdAt || new Date().toISOString(),
          isVerified: false, // This would need verification logic
          listings: listings.map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            price: listing.price,
            currency: 'USD',
            photos: listing.photos || [],
            createdAt: listing.createdAt,
          })),
        };

        setProfile(userProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (params.userId) {
      fetchProfile();
    }
  }, [params.userId]);

  const handleMessage = () => {
    router.push(`/messages?user=${profile?.id}`);
  };

  const handleCall = () => {
    showToast('Initiating call...', 'success');
  };

  const handleEmail = () => {
    showToast('Opening email client...', 'success');
  };

  const handleReport = () => {
    showToast('Report submitted', 'success');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
        </div>

        {/* Profile Header */}
        <div className="card mb-8">
          <div className="p-8">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                  {profile.isVerified && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 mb-4 text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm">{profile.rating}</span>
                    <span className="text-sm">({profile.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Member since {formatDate(profile.memberSince)}</span>
                  </div>
                </div>

                <p className="text-gray-300 mb-6">{profile.bio}</p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleMessage}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                  <button
                    onClick={handleCall}
                    className="btn btn-outline flex items-center space-x-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </button>
                  <button
                    onClick={handleEmail}
                    className="btn btn-outline flex items-center space-x-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={handleReport}
                    className="btn btn-ghost text-red-400 hover:text-red-300 flex items-center space-x-2"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="border-b border-dark-600">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('listings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'listings'
                    ? 'border-accent-500 text-accent-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Listings ({profile.listings.length})
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-accent-500 text-accent-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Reviews ({profile.reviewCount})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'listings' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.listings.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="bg-dark-700 rounded-lg overflow-hidden cursor-pointer hover:bg-dark-600 transition-colors"
                  >
                    <div className="aspect-square relative">
                      <img
                        src={listing.photos[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-medium mb-2 line-clamp-2">
                        {listing.title}
                      </h3>
                      <p className="text-accent-400 font-semibold">
                        {formatCurrency(listing.price, listing.currency)}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Listed {formatDate(listing.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mock Reviews */}
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="border-b border-dark-600 pb-4 last:border-b-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <img
                        src={`https://images.unsplash.com/photo-${15000000 + i}?w=40&h=40&fit=crop&crop=face`}
                        alt="Reviewer"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-white text-sm font-medium">User {i + 1}</p>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }, (_, star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star < 4 ? 'text-yellow-500 fill-current' : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Great seller! Fast communication and item was exactly as described. Highly recommend!
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      {formatDate(new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString())}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
