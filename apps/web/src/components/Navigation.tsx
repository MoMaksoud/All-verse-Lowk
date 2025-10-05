'use client';

import React, { useState, useEffect, useRef, Suspense, lazy, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Bell, User, Plus, MessageCircle, ShoppingBag, Heart, Bot, LogOut, Settings, ChevronDown, UserCircle, ShoppingCart, Package, List, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@marketplace/types';

// Lazy load heavy components
import { Avatar } from './Avatar';
const DefaultAvatar = lazy(() => import('./DefaultAvatar').then(module => ({ default: module.DefaultAvatar })));

const navigation = [
  { name: 'Home', href: '/', icon: ShoppingBag },
  { name: 'Marketplace', href: '/listings', icon: ShoppingBag },
  { name: 'AI Assistant', href: '/ai', icon: Bot },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
];

const Navigation = memo(function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New message from John Doe', time: '2 minutes ago', read: false },
    { id: 2, message: 'Your listing "iPhone 14 Pro" got a new offer', time: '1 hour ago', read: false },
    { id: 3, message: 'Welcome to All Verse! Start exploring our marketplace.', time: '1 day ago', read: true },
  ]);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();

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

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Fetch cart item count with caching
  const fetchCartCount = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      const response = await fetch('/api/carts', {
        headers: {
          'x-user-id': currentUser.uid, 'Cache-Control': 'max-age=60' },
          cache: 'no-store',  
      });
      
      if (response.ok) {
        const cart = await response.json();
        const totalItems = cart.items?.reduce((sum: number, item: any) => sum + item.qty, 0) || 0;
        setCartItemCount(totalItems);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  }, [currentUser?.uid]);


  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch profile data for avatar
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        const response = await fetch('/api/profile', {
          headers: {
            'x-user-id': currentUser.uid,
          },
        });
        const result = await response.json();
        
        if (result.success) {
          setProfile(result.data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [currentUser]);

  return (
    <nav className="glass border-b border-dark-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Logo size="md" />
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center space-x-6 flex-1 justify-center">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 rounded-xl px-3 py-2 ${
                    pathname === item.href
                      ? 'text-accent-400 bg-dark-700/50'
                      : 'text-gray-300 hover:text-white hover:bg-dark-700/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-3 flex-shrink-0">
            {currentUser ? (
              <>
                {/* Favorites Heart */}
                <button 
                  onClick={() => router.push('/favorites')}
                  className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50 transition-colors"
                  title="Favorites"
                >
                  <Heart className="w-5 h-5" />
                </button>
                
                {/* Notification Bell */}
                <button 
                  onClick={() => {
                    setShowNotifications(true);
                    // Mark all notifications as read when bell is clicked
                    markAllNotificationsAsRead();
                  }}
                  className="relative btn-ghost p-2 rounded-xl hover:bg-dark-700/50 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
                  )}
                </button>

                {/* Shopping Cart */}
                <Link
                  href="/cart"
                  className="relative btn-ghost p-2 rounded-xl hover:bg-dark-700/50 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </Link>
                
                <Link
                  href="/sell"
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Sell
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50 flex items-center gap-2"
                  >
                    {(profile?.profilePictureUrl || currentUser?.photoURL) ? (
                      <Suspense fallback={<div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse" />}>
                        <Avatar
                          src={profile?.profilePictureUrl || currentUser?.photoURL}
                          alt={currentUser.displayName || "Profile"}
                          size="sm"
                        />
                      </Suspense>
                    ) : (
                      <Suspense fallback={<div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse" />}>
                        <DefaultAvatar
                          name={currentUser?.displayName || undefined}
                          email={currentUser?.email || undefined}
                          size="sm"
                        />
                      </Suspense>
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-dark-800 rounded-lg shadow-xl border border-dark-600 py-2 z-50">
                      {/* Profile Header */}
                      <div className="px-4 py-3 border-b border-dark-600">
                        <div className="flex items-center space-x-3">
                          {(profile?.profilePictureUrl || currentUser?.photoURL) ? (
                            <Suspense fallback={<div className="w-10 h-10 bg-gray-600 rounded-full animate-pulse" />}>
                              <Avatar
                                src={profile?.profilePictureUrl || currentUser?.photoURL}
                                alt={currentUser.displayName || "Profile"}
                                size="md"
                              />
                            </Suspense>
                          ) : (
                            <Suspense fallback={<div className="w-10 h-10 bg-gray-600 rounded-full animate-pulse" />}>
                              <DefaultAvatar
                                name={currentUser?.displayName || undefined}
                                email={currentUser?.email || undefined}
                                size="md"
                              />
                            </Suspense>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {currentUser.displayName || "User"}
                            </p>
                            <p className="text-sm text-gray-400 truncate">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <UserCircle className="w-4 h-4 mr-3" />
                          View Profile
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Settings
                        </Link>
                        <Link
                          href="/sell"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <Plus className="w-4 h-4 mr-3" />
                          Sell Item
                        </Link>
                        <Link
                          href="/my-listings"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <List className="w-4 h-4 mr-3" />
                          My Listings
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <Package className="w-4 h-4 mr-3" />
                          My Orders
                        </Link>
                        <Link
                          href="/favorites"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <Heart className="w-4 h-4 mr-3" />
                          Favorites
                        </Link>
                        <Link
                          href="/help"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <HelpCircle className="w-4 h-4 mr-3" />
                          Help & Support
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-dark-600 pt-2">
                        <button
                          onClick={() => {
                            handleLogout();
                            setShowProfileDropdown(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="btn-ghost px-4 py-2 rounded-xl hover:bg-dark-700/50"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn btn-primary px-4 py-2 rounded-xl"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Tablet Actions - Show fewer items */}
          <div className="hidden md:flex lg:hidden items-center space-x-3 flex-shrink-0">
            {currentUser ? (
              <>
                <button 
                  onClick={() => router.push('/favorites')}
                  className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50 transition-colors"
                  title="Favorites"
                >
                  <Heart className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={() => {
                    setShowNotifications(true);
                    markAllNotificationsAsRead();
                  }}
                  className="relative btn-ghost p-2 rounded-xl hover:bg-dark-700/50 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
                  )}
                </button>

                <Link
                  href="/cart"
                  className="relative btn-ghost p-2 rounded-xl hover:bg-dark-700/50 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </Link>
                
                <Link
                  href="/sell"
                  className="btn btn-primary flex items-center gap-1 px-3 py-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Sell</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="btn-ghost px-3 py-2 text-sm rounded-xl hover:bg-dark-700/50"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn btn-primary px-3 py-2 text-sm rounded-xl"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex-shrink-0">
            <button
              type="button"
              className="btn-ghost p-2 rounded-xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden glass rounded-xl mt-2 mb-4">
            <div className="px-4 py-3 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                      pathname === item.href
                        ? 'text-accent-400 bg-dark-700/50'
                        : 'text-gray-300 hover:text-white hover:bg-dark-700/30'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
              {/* Action Buttons */}
              <div className="pt-4 border-t border-dark-600">
                <div className="space-y-1">
                  {currentUser ? (
                    <>
                      <button 
                        onClick={() => {
                          router.push('/favorites');
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700/30 w-full text-left"
                      >
                        <Heart className="w-5 h-5" />
                        Favorites
                      </button>

                      <button 
                        onClick={() => {
                          router.push('/cart');
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700/30 w-full text-left"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Cart {cartItemCount > 0 && `(${cartItemCount})`}
                      </button>
                      
                      <button 
                        onClick={() => {
                          setShowNotifications(true);
                          markAllNotificationsAsRead();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700/30 w-full text-left relative"
                      >
                        <Bell className="w-5 h-5" />
                        Notifications
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute right-3 w-2 h-2 bg-accent-500 rounded-full"></span>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signin"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700/30 w-full text-left"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="w-5 h-5" />
                        Sign In
                      </Link>
                      <Link
                        href="/signup"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-white bg-accent-500 hover:bg-accent-600 w-full text-left"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Plus className="w-5 h-5" />
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Profile Section */}
              {currentUser && (
                <div className="pt-4 border-t border-dark-600">
                  <div className="flex items-center px-3 py-3">
                    {(profile?.profilePictureUrl || currentUser?.photoURL) ? (
                      <Avatar
                        src={profile?.profilePictureUrl || currentUser?.photoURL}
                        alt={currentUser.displayName || "Profile"}
                        size="sm"
                      />
                    ) : (
                      <DefaultAvatar
                        name={currentUser?.displayName || undefined}
                        email={currentUser?.email || undefined}
                        size="sm"
                      />
                    )}
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">
                        {currentUser.displayName || "User"}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Link
                      href="/profile"
                      className="block px-3 py-2 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700/30"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/sell"
                      className="block px-3 py-2 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-dark-700/30"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sell Item
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
    </nav>
  );
});

export { Navigation };
