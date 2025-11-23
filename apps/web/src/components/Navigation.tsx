'use client';

import React, { useState, useEffect, useRef, Suspense, lazy, useCallback, memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
// Optimized lucide-react imports - only import what's actually used
import { 
  Menu, 
  X, 
  User, 
  Plus, 
  MessageCircle, 
  ShoppingBag, 
  Heart, 
  Bot, 
  LogOut, 
  Settings, 
  ChevronDown, 
  UserCircle, 
  ShoppingCart, 
  Package, 
  List, 
  TrendingUp
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useChatContext } from '@/contexts/ChatContext';
import { Profile } from '@marketplace/types';
import { useChats } from '@/hooks/useChats';

// Lazy load heavy components
const DefaultAvatar = lazy(() => import('./DefaultAvatar').then(module => ({ default: module.DefaultAvatar })));

const navigation = [
  { name: 'Home', href: '/', icon: ShoppingBag },
  { name: 'Marketplace', href: '/listings', icon: ShoppingBag },
  { name: 'AI Assistant', href: '/ai', icon: Bot },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
];

const Navigation = memo(function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { chats } = useChats();
  const { currentChatId, setCurrentChatId } = useChatContext();

  // Track last opened timestamp in state to avoid hydration issues
  const [lastOpenedTimestamp, setLastOpenedTimestamp] = useState(0);

  // Load last opened timestamp from localStorage (client-side only)
  useEffect(() => {
    if (!currentUser?.uid || typeof window === 'undefined') return;
    
    try {
      const lastOpenedMessagesPageAt = localStorage.getItem(`lastOpenedMessagesPageAt_${currentUser.uid}`);
      setLastOpenedTimestamp(lastOpenedMessagesPageAt ? parseInt(lastOpenedMessagesPageAt, 10) : 0);
    } catch (error) {
      console.error('Error reading localStorage:', error);
      setLastOpenedTimestamp(0);
    }
  }, [currentUser?.uid]);

  // Calculate total unread messages count (WhatsApp-like: based on timestamps)
  const unreadMessageCount = useMemo(() => {
    if (!currentUser?.uid || !chats || typeof window === 'undefined') return 0;
    
    // Count chats with messages newer than last time Messages page was last opened
    return chats.reduce((total, chat) => {
      if (!chat.lastMessage?.timestamp) return total;
      
      // Convert Firestore Timestamp to milliseconds
      const lastMessageTime = chat.lastMessage.timestamp.toDate ? 
        chat.lastMessage.timestamp.toDate().getTime() : 
        (chat.lastMessage.timestamp as any).seconds * 1000;
      
      // Show unread if last message is newer than when Messages page was last opened
      // AND if the chat hasn't been opened since then
      const chatLastOpenedAt = chat.lastOpenedAt?.[currentUser.uid];
      const chatLastOpenedTime = chatLastOpenedAt ? 
        (chatLastOpenedAt.toDate ? chatLastOpenedAt.toDate().getTime() : (chatLastOpenedAt as any).seconds * 1000) : 
        0;
      
      // Chat is unread if:
      // 1. Last message is newer than when Messages page was last opened, OR
      // 2. Last message is newer than when this specific chat was last opened
      const isUnread = lastMessageTime > Math.max(lastOpenedTimestamp, chatLastOpenedTime);
      
      return isUnread ? total + 1 : total;
    }, 0);
  }, [chats, currentUser?.uid, lastOpenedTimestamp]);

  // Fetch cart item count with caching - debounced to reduce API calls
  const fetchCartCount = useCallback(async () => {
    if (!currentUser?.uid) return;
    
    try {
      const { apiGet } = await import('@/lib/api-client');
      const response = await apiGet('/api/carts', {
        headers: {
          'Cache-Control': 'max-age=10'
        },
        cache: 'no-store' as RequestCache,  
      });
      
      if (response.ok) {
        const data = await response.json();
        const cart = data.data || data;
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

  // Handle clicking outside dropdowns
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

  // Fetch profile data for avatar - only when dropdown is opened
  useEffect(() => {
    if (!showProfileDropdown || profile || !currentUser?.uid) return;
    
    const fetchProfile = async () => {
      try {
        // Wait a bit to ensure auth token is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { apiGet } = await import('@/lib/api-client');
        // Use default requireAuth: true since dropdown only shows for authenticated users
        const response = await apiGet('/api/profile');
        
        // Silently handle errors - profile might not exist yet or auth might be in progress
        if (!response.ok) {
          // Don't log 400/401/404 errors as they're expected scenarios
          // 400: Missing userId (shouldn't happen if auth is working)
          // 401: Invalid/expired token (user needs to re-authenticate)
          // 404: Profile doesn't exist yet (user needs to create profile)
          if (response.status !== 400 && response.status !== 401 && response.status !== 404) {
            console.error('Error fetching profile:', response.status);
          }
          return;
        }
        
        const result = await response.json();
        
        if (result.success) {
          setProfile(result.data);
        }
      } catch (error) {
        // Silently handle errors - don't spam console with expected errors
        // Only log unexpected errors
        if (error instanceof Error && !error.message.includes('fetch')) {
          console.error('Error fetching profile:', error);
        }
      }
    };

    fetchProfile();
  }, [currentUser, showProfileDropdown, profile]);

  return (
    <nav className="glass border-b border-dark-700/50 sticky top-0 z-50 safe-area-top" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
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
              const isMessages = item.name === 'Messages';
              // Show badge only if has unread messages AND not currently inside a chat
              const showBadge = isMessages && unreadMessageCount > 0 && currentChatId === null;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // When clicking Messages tab, set currentChatId to null (not inside a chat)
                    if (isMessages) {
                      setCurrentChatId(null);
                    }
                  }}
                  prefetch={true}
                  className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-200 rounded-xl px-3 py-2 ${
                    pathname === item.href
                      ? 'text-accent-400 bg-dark-700/50'
                      : 'text-gray-300 hover:text-white hover:bg-dark-700/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
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
                    {(profile?.profilePicture || currentUser?.photoURL) ? (
                      <img
                        src={(profile?.profilePicture || currentUser?.photoURL) as string}
                        alt={currentUser?.displayName || 'Avatar'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
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
                          {(profile?.profilePicture || currentUser?.photoURL) ? (
                            <img
                              src={(profile?.profilePicture || currentUser?.photoURL) as string}
                              alt={currentUser?.displayName || 'Avatar'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
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
                          href="/sales"
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-dark-700/50"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <TrendingUp className="w-4 h-4 mr-3" />
                          My Sales
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
                const isMessages = item.name === 'Messages';
                // Show badge only if has unread messages AND not currently inside a chat
                const showBadge = isMessages && unreadMessageCount > 0 && currentChatId === null;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                      pathname === item.href
                        ? 'text-accent-400 bg-dark-700/50'
                        : 'text-gray-300 hover:text-white hover:bg-dark-700/30'
                    }`}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      // When clicking Messages tab, set currentChatId to null (not inside a chat)
                      if (isMessages) {
                        setCurrentChatId(null);
                      }
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                    {showBadge && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </span>
                    )}
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
                    {(profile?.profilePicture || currentUser?.photoURL) ? (
                      <img
                        src={(profile?.profilePicture || currentUser?.photoURL) as string}
                        alt={currentUser?.displayName || 'Avatar'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <Suspense fallback={<div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse" />}>
                        <DefaultAvatar
                          name={currentUser?.displayName || undefined}
                          email={currentUser?.email || undefined}
                          size="sm"
                        />
                      </Suspense>
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
    </nav>
  );
});

export { Navigation };
export default Navigation;
