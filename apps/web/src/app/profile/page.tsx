'use client';

import React, { useEffect, useState, useRef } from 'react';
import { User, Settings, Edit, Camera, Save, X, Bell, Eye, EyeOff } from 'lucide-react';
import { mockApi } from '@marketplace/lib';
import { User as UserType, Profile } from '@marketplace/types';
import { Navigation } from '@/components/Navigation';
import { Logo } from '@/components/Logo';

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New message from John Doe', time: '2 minutes ago', read: false },
    { id: 2, message: 'Your listing "iPhone 14 Pro" got a new offer', time: '1 hour ago', read: false },
    { id: 3, message: 'Welcome to All Verse! Start exploring our marketplace.', time: '1 day ago', read: true },
  ]);
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userResponse, profileResponse] = await Promise.all([
          mockApi.getCurrentUser(),
          mockApi.updateProfile({}), // This will return the current profile
        ]);

        setUser(userResponse.data);
        setProfile(profileResponse.data);
        setFormData({
          bio: profileResponse.data.bio || '',
          location: profileResponse.data.location || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      const updatedProfile = await mockApi.updateProfile(formData);
      setProfile(updatedProfile.data);
      setEditing(false);
      // Show success notification
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      bio: profile?.bio || '',
      location: profile?.location || '',
    });
    setEditing(false);
  };

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newAvatarUrl = e.target?.result as string;
        setUser(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
        showToast('Profile picture updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNotificationClick = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setShowNotifications(false);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">Unable to load your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation />
      
      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowNotifications(false)}>
          <div className="absolute top-16 right-4 w-80 bg-dark-800 rounded-lg shadow-xl border border-dark-600 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.read 
                        ? 'bg-dark-700 text-gray-400' 
                        : 'bg-accent-500/20 text-white border border-accent-500/30'
                    }`}
                  >
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No notifications</p>
              )}
            </div>
            
            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="w-full mt-4 btn btn-outline text-sm"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="md" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-lg text-gray-400">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                <div className="flex items-center space-x-2">
                  {/* Notification Button */}
                  <button
                    onClick={() => setShowNotifications(true)}
                    className="relative btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
                  >
                    <Bell className="w-5 h-5 text-gray-400" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
                    )}
                  </button>
                  
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="btn btn-outline flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={user.avatar || 'https://via.placeholder.com/80x80/1e293b/64748b?text=U'}
                      alt={user.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-2 bg-accent-500 rounded-full hover:bg-accent-600 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                    <p className="text-gray-400">{user.email}</p>
                    <p className="text-sm text-gray-500">Member since {new Date(user.createdAt).getFullYear()}</p>
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bio
                  </label>
                  {editing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="input resize-none"
                    />
                  ) : (
                    <p className="text-gray-300">
                      {profile?.bio || 'No bio added yet.'}
                    </p>
                  )}
                </div>

                {/* Location Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, State"
                      className="input"
                    />
                  ) : (
                    <p className="text-gray-300">
                      {profile?.location || 'No location set.'}
                    </p>
                  )}
                </div>

                {/* Rating Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(profile?.rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-gray-300">{profile?.rating || 0} / 5</span>
                  </div>
                </div>

                {/* Edit Actions */}
                {editing && (
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleCancel}
                      className="btn btn-outline flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Stats */}
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Listings</span>
                  <span className="text-white font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sales</span>
                  <span className="text-white font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reviews</span>
                  <span className="text-white font-medium">0</span>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => showToast('Account settings coming soon!', 'success')}
                  className="w-full btn btn-outline flex items-center justify-start gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </button>
                <button 
                  onClick={() => showToast('Privacy settings coming soon!', 'success')}
                  className="w-full btn btn-outline flex items-center justify-start gap-2"
                >
                  <User className="w-4 h-4" />
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
