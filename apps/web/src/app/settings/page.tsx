'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { DynamicBackground } from '@/components/DynamicBackground';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Eye, 
  Palette, 
  CreditCard, 
  Link as LinkIcon,
  Settings,
  Lock,
  Smartphone,
  Mail,
  Globe,
  Trash2,
  ChevronRight
} from 'lucide-react';

type SettingsSection = 'account' | 'security' | 'privacy' | 'preferences' | 'billing' | 'integrations';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const { currentUser, logout } = useAuth();
  const router = useRouter();

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
      id: 'privacy' as SettingsSection,
      name: 'Privacy & Data',
      icon: Eye,
      description: 'Data sharing and privacy controls'
    },
    {
      id: 'preferences' as SettingsSection,
      name: 'App Preferences',
      icon: Palette,
      description: 'Theme, language, and display settings'
    },
    {
      id: 'billing' as SettingsSection,
      name: 'Billing & Payments',
      icon: CreditCard,
      description: 'Subscription and payment methods'
    },
    {
      id: 'integrations' as SettingsSection,
      name: 'Integrations',
      icon: LinkIcon,
      description: 'Connected services and third-party apps'
    }
  ];

  const renderAccountManagement = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Personal Details</h2>
        <p className="text-gray-400 mb-4">Manage your personal information and profile details</p>
      </div>

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Display Name</h3>
                <p className="text-gray-400 text-sm">Your public display name</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-2">{currentUser?.displayName || 'Not set'}</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Email Address</h3>
                <p className="text-gray-400 text-sm">Your account email address</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-2">{currentUser?.email || 'Not set'}</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Phone Number</h3>
                <p className="text-gray-400 text-sm">Add a phone number for account recovery</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-gray-400 mr-2">Not set</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Profile Picture</h3>
                <p className="text-gray-400 text-sm">Update your profile photo</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-accent-500 rounded-full mr-2"></div>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
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
            <button className="text-accent-500 hover:text-accent-400">
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
              <span className="text-red-400 text-sm mr-2">Disabled</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Connected Devices</h3>
                <p className="text-gray-400 text-sm">Manage devices logged into your account</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
              <ChevronRight className="w-4 h-4" />
            </button>
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
            <button className="text-red-500 hover:text-red-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );


  const renderPrivacyData = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Privacy & Data Controls</h2>
        <p className="text-gray-400 mb-4">Manage how your data is used and shared</p>
      </div>

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Profile Visibility</h3>
                <p className="text-gray-400 text-sm">Control who can see your profile</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 text-sm mr-2">Public</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Data Sharing</h3>
                <p className="text-gray-400 text-sm">Control how your data is shared with partners</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="relative">
                <input type="checkbox" className="sr-only" />
                <div className="w-10 h-6 bg-gray-600 rounded-full shadow-inner"></div>
                <div className="absolute w-4 h-4 bg-white rounded-full shadow top-1 left-1 transition-transform"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Cookie Preferences</h3>
                <p className="text-gray-400 text-sm">Manage cookies and tracking</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Download Your Data</h3>
                <p className="text-gray-400 text-sm">Request a copy of your data</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">App/Website Preferences</h2>
        <p className="text-gray-400 mb-4">Customize your experience</p>
      </div>

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Palette className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Theme</h3>
                <p className="text-gray-400 text-sm">Choose your preferred theme</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-2">Dark</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Language</h3>
                <p className="text-gray-400 text-sm">Select your preferred language</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-2">English</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Time Zone</h3>
                <p className="text-gray-400 text-sm">Set your local time zone</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-white mr-2">UTC-5 (EST)</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Billing & Payments</h2>
        <p className="text-gray-400 mb-4">Manage your subscription and payment methods</p>
      </div>

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Subscription Plan</h3>
                <p className="text-gray-400 text-sm">Your current subscription details</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-green-400 text-sm mr-2">Free Plan</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Payment Methods</h3>
                <p className="text-gray-400 text-sm">Manage your payment methods</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Billing History</h3>
                <p className="text-gray-400 text-sm">View your past invoices and payments</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Integrations & Connections</h2>
        <p className="text-gray-400 mb-4">Manage your connected services and third-party apps</p>
      </div>

      <div className="space-y-4">
        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LinkIcon className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Google Account</h3>
                <p className="text-gray-400 text-sm">Connect your Google account</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-red-400 text-sm mr-2">Not Connected</span>
              <button className="text-accent-500 hover:text-accent-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LinkIcon className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">Social Media</h3>
                <p className="text-gray-400 text-sm">Connect your social media accounts</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LinkIcon className="w-5 h-5 text-accent-500 mr-3" />
              <div>
                <h3 className="text-white font-medium">API Access</h3>
                <p className="text-gray-400 text-sm">Manage your API keys and access</p>
              </div>
            </div>
            <button className="text-accent-500 hover:text-accent-400">
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
      case 'privacy':
        return renderPrivacyData();
      case 'preferences':
        return renderPreferences();
      case 'billing':
        return renderBilling();
      case 'integrations':
        return renderIntegrations();
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
            <div className="flex-1"></div> {/* Spacer for centering */}
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
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
