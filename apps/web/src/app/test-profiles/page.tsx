'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/Navigation';
import { DefaultAvatar } from '@/components/DefaultAvatar';
import { useToast } from '@/contexts/ToastContext';

export default function TestProfilesPage() {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllProfiles = async () => {
      try {
        setLoading(true);
        // This would normally be an admin endpoint
        // For demo purposes, we'll fetch a few test profiles
        const testProfiles = [
          { userId: 'user-1', bio: 'Test user 1 bio', location: 'San Francisco, CA' },
          { userId: 'user-2', bio: 'Test user 2 bio', location: 'New York, NY' },
          { userId: currentUser?.uid || 'current-user', bio: 'Your current profile', location: 'Your location' },
        ];
        setProfiles(testProfiles);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProfiles();
  }, [currentUser]);

  const createTestProfile = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.uid,
        },
        body: JSON.stringify({
          bio: `Test bio for ${currentUser.displayName || currentUser.email}`,
          location: 'Test Location',
          rating: 4.5,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Profile Created!', 'Test profile created successfully!');
        // Refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating test profile:', error);
      showError('Creation Failed', 'Error creating test profile');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-dark-950">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Firestore Profile Test</h1>
            <p className="text-lg text-gray-400">Test how user data is linked to Firebase users</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Current Firebase User</h2>
            {currentUser ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <DefaultAvatar
                    name={currentUser.displayName || undefined}
                    email={currentUser.email || undefined}
                    size="lg"
                  />
                  <div className="space-y-2">
                    <p className="text-gray-300"><strong>UID:</strong> {currentUser.uid}</p>
                    <p className="text-gray-300"><strong>Email:</strong> {currentUser.email}</p>
                    <p className="text-gray-300"><strong>Display Name:</strong> {currentUser.displayName || 'Not set'}</p>
                    <p className="text-gray-300"><strong>Created:</strong> {currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleString() : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No user signed in</p>
            )}
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Test Profile Actions</h2>
              <button
                onClick={createTestProfile}
                className="btn btn-primary"
                disabled={!currentUser}
              >
                Create Test Profile
              </button>
            </div>
            
            <p className="text-gray-400 mb-4">
              Click the button above to create a test profile linked to your Firebase user ID.
              This will save data to Firestore with your unique user ID.
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">How User Data Linking Works</h2>
            
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <h3 className="text-green-400 font-semibold mb-2">✅ Each Firebase User Gets Unique Data</h3>
                <p className="text-gray-300 text-sm">
                  When you sign in with different Firebase accounts, each account will have its own profile data 
                  stored in Firestore with their unique user ID as the document ID.
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h3 className="text-blue-400 font-semibold mb-2">🔄 Real-time Sync</h3>
                <p className="text-gray-300 text-sm">
                  Changes to your profile are saved to Firestore and will sync across all your devices 
                  when you sign in with the same Firebase account.
                </p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                <h3 className="text-purple-400 font-semibold mb-2">🔒 Secure & Persistent</h3>
                <p className="text-gray-300 text-sm">
                  Your profile data is securely stored in Firestore and persists even if you clear your browser cache 
                  or use a different device.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/profile"
              className="btn btn-outline"
            >
              Go to Profile Page
            </a>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
