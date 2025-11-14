'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DynamicBackground } from '@/components/DynamicBackground';
import { DefaultAvatar } from '@/components/DefaultAvatar';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  CreditCard, 
  Lock,
  Smartphone,
  Mail,
  Trash2,
  ChevronRight,
  X,
  Camera
} from 'lucide-react';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  updateProfile as updateFirebaseProfile,
  updateEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

type SettingsSection = 'account' | 'security' | 'billing';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // Account Management states
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const settingsSections = [
    {
      id: 'account' as SettingsSection,
      name: 'Account Management',
      icon: User,
      description: 'Manage your personal information and profile'
    },
    {
      id: 'security' as SettingsSection,
      name: 'Security & Login',
      icon: Shield,
      description: 'Password, 2FA, and device management'
    },
    {
      id: 'billing' as SettingsSection,
      name: 'Billing & Payments',
      icon: CreditCard,
      description: 'View your earnings and spending'
    }
  ];

  useEffect(() => {
    if (currentUser?.uid) {
      fetchProfile();
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/profile');
      
      if (response.status === 404) {
        setProfile(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      if (result.success) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue || '' });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValues({});
    setError('');
    setSuccess('');
  };

  const handleSaveField = async (field: string) => {
    if (!currentUser?.uid) {
      setError('You must be logged in');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const value = editValues[field]?.trim();
      
      if (field === 'username') {
        // Check username availability first
        const { apiGet } = await import('@/lib/api-client');
        const checkResponse = await apiGet(`/api/users/check-username?username=${encodeURIComponent(value)}`);
        const checkData = await checkResponse.json();
        
        if (!checkData.available) {
          setError('This username is already taken. Please choose another one.');
          return;
        }
        
        // Update Firestore profile
        const { apiPut } = await import('@/lib/api-client');
        await apiPut('/api/profile', { username: value });
        setSuccess('Username updated successfully');
      } else if (field === 'displayName') {
        // Update Firebase Auth profile
        await updateFirebaseProfile(currentUser, {
          displayName: value
        });
        // Update Firestore profile
        const { apiPut } = await import('@/lib/api-client');
        await apiPut('/api/profile', { displayName: value });
        setSuccess('Display name updated successfully');
      } else if (field === 'email') {
        if (!value || !value.includes('@')) {
          setError('Please enter a valid email address');
          return;
        }
        // Re-authenticate before changing email
        const currentPassword = prompt('Please enter your current password to change email:');
        if (!currentPassword) {
          setError('Password is required to change email');
          return;
        }
        const credential = EmailAuthProvider.credential(
          currentUser.email!,
          currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updateEmail(currentUser, value);
        setSuccess('Email updated successfully. Please verify your new email.');
      } else if (field === 'phoneNumber') {
        const { apiPut } = await import('@/lib/api-client');
        await apiPut('/api/profile', { phoneNumber: value });
        setSuccess('Phone number updated successfully');
      }

      await fetchProfile();
      setEditingField(null);
      setEditValues({});
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating field:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use');
      } else {
        setError(error?.message || 'Failed to update. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid) return;
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const form = new FormData();
      form.append('photo', file);
      const { apiRequest } = await import('@/lib/api-client');
      const resp = await apiRequest('/api/upload/profile-photo', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser.email || ''
        },
        body: form,
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      const data = await resp.json();
      
      setProfile((p: any) => p ? { ...p, profilePicture: data.photoUrl } : p);
      setSuccess('Profile picture updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Profile photo upload failed:', err);
      const errorMessage = err?.message || 'Failed to upload photo';
      setError(errorMessage);
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasswordChange = async () => {
    if (!currentUser?.email) {
      setPasswordError('User email not found');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError('');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, passwordData.newPassword);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else {
        setPasswordError(error?.message || 'Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const renderAccountManagement = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Personal Details</h2>
        <p className="text-gray-400 mb-4">Manage your personal information and profile details</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {/* Username */}
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Username</h3>
                <p className="text-gray-400 text-sm">Your unique username (like @username)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingField === 'username' ? (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <input
                      type="text"
                      value={editValues.username || ''}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
                        setEditValues({ username: value });
                      }}
                      className="bg-dark-800 border border-dark-600 text-white px-3 py-1 rounded-lg text-sm w-48"
                      placeholder="username"
                      maxLength={30}
                      autoFocus
                    />
                    <span className="text-xs text-gray-500 mt-1">@{editValues.username || 'username'}</span>
                  </div>
                  <button
                    onClick={() => handleSaveField('username')}
                    disabled={saving}
                    className="text-green-400 hover:text-green-300 disabled:opacity-50 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-white mr-2">@{profile?.username || 'not set'}</span>
                  <button 
                    onClick={() => handleEditField('username', profile?.username || '')}
                    className="text-accent-500 hover:text-accent-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Display Name */}
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Display Name</h3>
                <p className="text-gray-400 text-sm">Your public display name (can be reused)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingField === 'displayName' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValues.displayName || ''}
                    onChange={(e) => setEditValues({ displayName: e.target.value })}
                    className="bg-dark-800 border border-dark-600 text-white px-3 py-1 rounded-lg text-sm w-48"
                    placeholder="Your name"
                    maxLength={100}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField('displayName')}
                    disabled={saving}
                    className="text-green-400 hover:text-green-300 disabled:opacity-50 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-white mr-2">{profile?.displayName || currentUser?.displayName || 'Not set'}</span>
                  <button 
                    onClick={() => handleEditField('displayName', profile?.displayName || currentUser?.displayName || '')}
                    className="text-accent-500 hover:text-accent-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Email Address</h3>
                <p className="text-gray-400 text-sm">Your account email address</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingField === 'email' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={editValues.email || ''}
                    onChange={(e) => setEditValues({ email: e.target.value })}
                    className="bg-dark-800 border border-dark-600 text-white px-3 py-1 rounded-lg text-sm w-48"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField('email')}
                    disabled={saving}
                    className="text-green-400 hover:text-green-300 disabled:opacity-50 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-white mr-2">{currentUser?.email || 'Not set'}</span>
                  <button 
                    onClick={() => handleEditField('email', currentUser?.email || '')}
                    className="text-accent-500 hover:text-accent-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Phone Number */}
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Phone Number</h3>
                <p className="text-gray-400 text-sm">Add a phone number for account recovery</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {editingField === 'phoneNumber' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={editValues.phoneNumber || ''}
                    onChange={(e) => setEditValues({ phoneNumber: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="bg-dark-800 border border-dark-600 text-white px-3 py-1 rounded-lg text-sm w-48"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveField('phoneNumber')}
                    disabled={saving}
                    className="text-green-400 hover:text-green-300 disabled:opacity-50 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-white mr-2">{profile?.phoneNumber || 'Not set'}</span>
                  <button 
                    onClick={() => handleEditField('phoneNumber', profile?.phoneNumber || '')}
                    className="text-accent-500 hover:text-accent-400"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Profile Picture</h3>
                <p className="text-gray-400 text-sm">Update your profile photo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                {profile?.profilePicture ? (
                  <img 
                    src={profile.profilePicture} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <DefaultAvatar size={40} name={currentUser?.displayName || currentUser?.email || 'U'} />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="text-accent-500 hover:text-accent-400 disabled:opacity-50 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {saving ? 'Uploading...' : 'Change'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityLogin = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Security & Login</h2>
        <p className="text-gray-400 mb-4">Manage your account security and login settings</p>
      </div>

      {passwordError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {passwordError}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Lock className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Password</h3>
                <p className="text-gray-400 text-sm">Change your account password</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="text-accent-500 hover:text-accent-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Two-Factor Authentication</h3>
                <p className="text-gray-400 text-sm">Add an extra layer of security</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-400 text-sm mr-2">Coming Soon</span>
              <button className="text-accent-500 hover:text-accent-400 opacity-50 cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trash2 className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Delete Account</h3>
                <p className="text-gray-400 text-sm">Permanently delete your account and data</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {deleteError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mt-4">
            {deleteError}
          </div>
        )}
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Billing & Payments</h2>
        <p className="text-gray-400 mb-4">View your earnings and spending</p>
      </div>

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Total Earnings</h3>
                <p className="text-gray-400 text-sm">Money earned from sales</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 text-sm mr-2">$0.00</span>
              <span className="text-gray-500 text-xs">(Coming Soon)</span>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Total Spending</h3>
                <p className="text-gray-400 text-sm">Money spent on purchases</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-red-400 text-sm mr-2">$0.00</span>
              <span className="text-gray-500 text-xs">(Coming Soon)</span>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Payment History</h3>
                <p className="text-gray-400 text-sm">View your past transactions</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400 opacity-50 cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return renderAccountManagement();
      case 'security':
        return renderSecurityLogin();
      case 'billing':
        return renderBilling();
      default:
        return renderAccountManagement();
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicBackground intensity="low" showParticles={true} />
      
      <div className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
          </div>

          {/* Main Content */}
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700">
                <div className="mb-6">
                  <h1 className="text-5xl font-bold text-white">Settings</h1>
                </div>

                <nav className="space-y-2">
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors text-left ${
                          activeSection === section.id
                            ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                            : 'text-gray-300 hover:text-white hover:bg-dark-700/50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <div>
                          <div className="font-medium">{section.name}</div>
                          <div className="text-xs text-gray-400">{section.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700">
                {loadingProfile && activeSection === 'account' ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-gray-400">Loading...</div>
                  </div>
                ) : (
                  renderContent()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-accent-500"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-accent-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-accent-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                disabled={changingPassword}
                className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="flex-1 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-2xl p-6 border border-dark-700 max-w-md w-full">
            <div className="flex items-center mb-4">
              <Trash2 className="w-6 h-6 text-red-500 mr-3" />
              <h2 className="text-xl font-bold text-white">Delete Account</h2>
            </div>
            
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">
                <strong>This will permanently:</strong>
              </p>
              <ul className="text-red-300 text-sm mt-2 list-disc list-inside space-y-1">
                <li>Delete your account and all your data</li>
                <li>Delete all your listings and photos</li>
                <li>Remove your profile from search results</li>
                <li>Prevent others from messaging you</li>
                <li>Archive your chat history (others can still see it)</li>
              </ul>
            </div>

            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setDeleting(true);
                    setDeleteError('');
                    
                    const { apiDelete } = await import('@/lib/api-client');
                    const response = await apiDelete('/api/account/delete');
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || errorData.details || 'Failed to delete account');
                    }
                    
                    // Logout and redirect
                    await logout();
                    router.push('/');
                  } catch (error: any) {
                    console.error('Account deletion error:', error);
                    setDeleteError(error?.message || 'Failed to delete account. Please try again.');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
