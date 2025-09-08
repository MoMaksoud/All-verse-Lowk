'use client';

import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  CreditCard, 
  Globe, 
  Smartphone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  Camera,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'profile',
    title: 'Profile & Account',
    icon: User,
    description: 'Manage your personal information and account details'
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: Shield,
    description: 'Control your privacy settings and security preferences'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Customize how and when you receive notifications'
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    description: 'Personalize your interface and theme preferences'
  },
  {
    id: 'payment',
    title: 'Payment & Billing',
    icon: CreditCard,
    description: 'Manage payment methods and billing information'
  },
  {
    id: 'preferences',
    title: 'Preferences',
    icon: Globe,
    description: 'Set your general app preferences and language'
  }
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Form states
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'I love buying and selling on All Verse!',
    location: 'Tampa, FL',
    website: 'https://johndoe.com'
  });

  const [privacyData, setPrivacyData] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    twoFactorAuth: false,
    dataSharing: false
  });

  const [notificationData, setNotificationData] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    listingUpdates: true,
    messageAlerts: true,
    priceAlerts: true,
    securityAlerts: true
  });

  const [appearanceData, setAppearanceData] = useState({
    theme: 'dark',
    language: 'en',
    fontSize: 'medium',
    animations: true,
    compactMode: false
  });

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Handle account deletion
    console.log('Account deletion requested');
    setShowDeleteModal(false);
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-accent-500 to-primary-500 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <button className="absolute -bottom-1 -right-1 bg-accent-500 hover:bg-accent-600 text-white p-1.5 rounded-full transition-colors">
            <Camera className="w-3 h-3" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
          <p className="text-sm text-gray-400">Click to upload a new photo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
          <input
            type="text"
            value={profileData.firstName}
            onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
          <input
            type="text"
            value={profileData.lastName}
            onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
        <input
          type="email"
          value={profileData.email}
          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
        <input
          type="tel"
          value={profileData.phone}
          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
        <textarea
          value={profileData.bio}
          onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
          rows={3}
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
          <input
            type="text"
            value={profileData.location}
            onChange={(e) => setProfileData({...profileData, location: e.target.value})}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
          <input
            type="url"
            value={profileData.website}
            onChange={(e) => setProfileData({...profileData, website: e.target.value})}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Profile Visibility</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={privacyData.profileVisibility === 'public'}
              onChange={(e) => setPrivacyData({...privacyData, profileVisibility: e.target.value})}
              className="text-accent-500"
            />
            <span className="text-gray-300">Public - Anyone can see your profile</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={privacyData.profileVisibility === 'private'}
              onChange={(e) => setPrivacyData({...privacyData, profileVisibility: e.target.value})}
              className="text-accent-500"
            />
            <span className="text-gray-300">Private - Only you can see your profile</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Show email address</span>
            <input
              type="checkbox"
              checked={privacyData.showEmail}
              onChange={(e) => setPrivacyData({...privacyData, showEmail: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Show phone number</span>
            <input
              type="checkbox"
              checked={privacyData.showPhone}
              onChange={(e) => setPrivacyData({...privacyData, showPhone: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Allow direct messages</span>
            <input
              type="checkbox"
              checked={privacyData.allowMessages}
              onChange={(e) => setPrivacyData({...privacyData, allowMessages: e.target.checked})}
              className="text-accent-500"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Two-factor authentication</span>
            <input
              type="checkbox"
              checked={privacyData.twoFactorAuth}
              onChange={(e) => setPrivacyData({...privacyData, twoFactorAuth: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Data sharing for analytics</span>
            <input
              type="checkbox"
              checked={privacyData.dataSharing}
              onChange={(e) => setPrivacyData({...privacyData, dataSharing: e.target.checked})}
              className="text-accent-500"
            />
          </label>
        </div>
      </div>

      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
        </div>
        <p className="text-gray-300 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Notification Channels</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Email notifications</span>
            <input
              type="checkbox"
              checked={notificationData.emailNotifications}
              onChange={(e) => setNotificationData({...notificationData, emailNotifications: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Push notifications</span>
            <input
              type="checkbox"
              checked={notificationData.pushNotifications}
              onChange={(e) => setNotificationData({...notificationData, pushNotifications: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">SMS notifications</span>
            <input
              type="checkbox"
              checked={notificationData.smsNotifications}
              onChange={(e) => setNotificationData({...notificationData, smsNotifications: e.target.checked})}
              className="text-accent-500"
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Notification Types</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Listing updates</span>
            <input
              type="checkbox"
              checked={notificationData.listingUpdates}
              onChange={(e) => setNotificationData({...notificationData, listingUpdates: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">New messages</span>
            <input
              type="checkbox"
              checked={notificationData.messageAlerts}
              onChange={(e) => setNotificationData({...notificationData, messageAlerts: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Price alerts</span>
            <input
              type="checkbox"
              checked={notificationData.priceAlerts}
              onChange={(e) => setNotificationData({...notificationData, priceAlerts: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Security alerts</span>
            <input
              type="checkbox"
              checked={notificationData.securityAlerts}
              onChange={(e) => setNotificationData({...notificationData, securityAlerts: e.target.checked})}
              className="text-accent-500"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Marketing emails</span>
            <input
              type="checkbox"
              checked={notificationData.marketingEmails}
              onChange={(e) => setNotificationData({...notificationData, marketingEmails: e.target.checked})}
              className="text-accent-500"
            />
          </label>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Theme</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={appearanceData.theme === 'light'}
              onChange={(e) => setAppearanceData({...appearanceData, theme: e.target.value})}
              className="text-accent-500"
            />
            <span className="text-gray-300">Light</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={appearanceData.theme === 'dark'}
              onChange={(e) => setAppearanceData({...appearanceData, theme: e.target.value})}
              className="text-accent-500"
            />
            <span className="text-gray-300">Dark</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={appearanceData.theme === 'system'}
              onChange={(e) => setAppearanceData({...appearanceData, theme: e.target.value})}
              className="text-accent-500"
            />
            <span className="text-gray-300">System</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
        <select
          value={appearanceData.language}
          onChange={(e) => setAppearanceData({...appearanceData, language: e.target.value})}
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
        <select
          value={appearanceData.fontSize}
          onChange={(e) => setAppearanceData({...appearanceData, fontSize: e.target.value})}
          className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-gray-300">Enable animations</span>
          <input
            type="checkbox"
            checked={appearanceData.animations}
            onChange={(e) => setAppearanceData({...appearanceData, animations: e.target.checked})}
            className="text-accent-500"
          />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-gray-300">Compact mode</span>
          <input
            type="checkbox"
            checked={appearanceData.compactMode}
            onChange={(e) => setAppearanceData({...appearanceData, compactMode: e.target.checked})}
            className="text-accent-500"
          />
        </label>
      </div>
    </div>
  );

  const renderPaymentSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-accent-400" />
              <span className="text-gray-300">**** **** **** 1234</span>
            </div>
            <button className="text-red-400 hover:text-red-300">Remove</button>
          </div>
          <button className="w-full p-3 border-2 border-dashed border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent-500 transition-colors">
            + Add Payment Method
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-accent-400" />
              <span className="text-gray-300">Download my data</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </button>
          <button className="w-full flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-accent-400" />
              <span className="text-gray-300">Import data</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">App Preferences</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Auto-save drafts</span>
            <input type="checkbox" defaultChecked className="text-accent-500" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Show online status</span>
            <input type="checkbox" defaultChecked className="text-accent-500" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Enable location services</span>
            <input type="checkbox" defaultChecked className="text-accent-500" />
          </label>
        </div>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'privacy':
        return renderPrivacySection();
      case 'notifications':
        return renderNotificationsSection();
      case 'appearance':
        return renderAppearanceSection();
      case 'payment':
        return renderPaymentSection();
      case 'preferences':
        return renderPreferencesSection();
      default:
        return renderProfileSection();
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-xl p-4">
              <nav className="space-y-2">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-accent-500 text-white'
                          : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-dark-800 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                  {settingsSections.find(s => s.id === activeSection)?.title}
                </h2>
                <p className="text-gray-400">
                  {settingsSections.find(s => s.id === activeSection)?.description}
                </p>
              </div>

              {renderActiveSection()}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-dark-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {saveStatus === 'saved' && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">Settings saved successfully!</span>
                      </>
                    )}
                    {saveStatus === 'error' && (
                      <>
                        <X className="w-5 h-5 text-red-400" />
                        <span className="text-red-400">Failed to save settings</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
