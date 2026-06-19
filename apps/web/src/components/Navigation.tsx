'use client';

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
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
  ChevronDown, 
  UserCircle, 
  ShoppingCart, 
  Package, 
  List, 
  TrendingUp
} from 'lucide-react';
import { Logo } from './Logo';
import { ProfilePicture } from './ProfilePicture';
import { useAuth } from '@/contexts/AuthContext';
import { useChatContext } from '@/contexts/ChatContext';
import { Profile } from '@marketplace/types';
import { useChats } from '@/hooks/useChats';

const navigation = [
  { name: 'Home', href: '/', icon: ShoppingBag },
  { name: 'Marketplace', href: '/listings', icon: ShoppingBag },
  { name: 'AI Assistant', href: '/ai', icon: Bot },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
];

const Navigation = memo(function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [resolvedPathname, setResolvedPathname] = useState(pathname);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { currentUser, logout, userProfile, userProfilePic } = useAuth();
  const { chats } = useChats();
  const { currentChatId, setCurrentChatId } = useChatContext();

  // Track last opened timestamp in state to avoid hydration issues
  const [lastOpenedTimestamp, setLastOpenedTimestamp] = useState(0);

  // Ensure client-only rendering to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setResolvedPathname(pathname);
  }, [pathname]);

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
  // Only calculate on client to prevent hydration mismatch
  const unreadMessageCount = useMemo(() => {
    if (!isMounted || !currentUser?.uid || !chats || typeof window === 'undefined') return 0;
    
    // Count chats with messages newer than last time Messages page was last opened
    return chats.reduce((total, chat) => {
      if (!chat.lastMessage?.timestamp) return total;
      // Never count a message the current user sent as unread
      if (chat.lastMessage.senderId === currentUser.uid) return total;
      
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
  }, [chats, currentUser?.uid, lastOpenedTimestamp, isMounted]);

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
  // Use userProfile from AuthContext instead of fetching to avoid 404 errors
  useEffect(() => {
    if (!showProfileDropdown || profile || !currentUser?.uid) return;
    
    // Prefer userProfile from AuthContext (already loaded) to avoid unnecessary API calls
    if (userProfile) {
      setProfile(userProfile);
      return;
    }
    
    // Only fetch if userProfile is not available in context
    const fetchProfile = async () => {
      try {
        // Wait a bit to ensure auth token is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet('/api/profile');
        
        // Silently handle 404 - profile might not exist yet (expected scenario)
        if (!response.ok) {
          // Don't log 404 errors - profile doesn't exist yet is expected
          if (response.status !== 404) {
            // Only log non-404 errors
            if (response.status !== 400 && response.status !== 401) {
              console.error('Error fetching profile:', response.status);
            }
          }
          return;
        }
        
        const result = await response.json();
        
        if (result.success) {
          setProfile(result.data);
        }
      } catch (error) {
        // Silently handle errors - don't spam console
        // Only log unexpected errors (not network/fetch errors)
        if (error instanceof Error && !error.message.includes('fetch') && !error.message.includes('404')) {
          console.error('Error fetching profile:', error);
        }
      }
    };

    fetchProfile();
  }, [currentUser, showProfileDropdown, profile, userProfile]);

  // Shared active/inactive classes for nav links
  const navLinkClass = (href: string) => {
    const isActive = href === '/' ? resolvedPathname === '/' : resolvedPathname.startsWith(href);
    return `relative flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 py-1 ${
      isActive
        ? 'text-[#60a5fa]'
        : 'text-[#94a3b8] hover:text-white'
    }`;
  };

  return (
    <>
    <nav className="backdrop-blur-md bg-[#020617]/92 border-b border-white/[0.07] sticky top-0 z-50 safe-area-top h-[56px] flex items-center justify-between px-5 lg:px-8 w-full">
      {/* Logo */}
      <Link href="/" className="flex items-center shrink-0 gap-2.5 mr-6">
        <img src="/logo.png" alt="AllVerse" width={28} height={28} className="rounded-lg object-contain" />
        <span className="font-bold text-[#f1f5f9] text-sm tracking-tight hidden sm:block" style={{ fontFamily: 'var(--font-display, var(--font-inter))' }}>
          AllVerse
        </span>
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-5 flex-1 min-w-0">
        {navigation.map((item) => {
          const isMessages = item.name === 'Messages';
          const showBadge = isMessages && unreadMessageCount > 0 && currentChatId === null;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => { if (isMessages) setCurrentChatId(null); }}
              prefetch={true}
              className={navLinkClass(item.href)}
            >
              {item.name}
              {isMounted && showBadge && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[#3b82f6] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Desktop Actions */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {currentUser ? (
          <>
            <button
              onClick={() => router.push('/favorites')}
              className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.06] transition-colors"
              title="Favorites"
            >
              <Heart className="w-[18px] h-[18px]" />
            </button>

            <Link
              href="/cart"
              className="relative p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.06] transition-colors"
            >
              <ShoppingCart className="w-[18px] h-[18px]" />
              {isMounted && cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#3b82f6] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>

            <Link
              href="/sell"
              className="ml-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
              style={{ background: '#3b82f6', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
            >
              <Plus className="w-3.5 h-3.5" />
              Sell
            </Link>

            <div className="relative shrink-0 ml-1" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <ProfilePicture
                  src={(profile?.profilePicture || currentUser?.photoURL) as string | null}
                  alt={currentUser?.displayName || 'Avatar'}
                  name={currentUser?.displayName || undefined}
                  email={currentUser?.email || undefined}
                  size="sm"
                  currentUser={currentUser}
                  userProfilePic={userProfilePic}
                />
                <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
              </button>

              {showProfileDropdown && (
                <div className="fixed w-60 bg-[#0f172a] rounded-xl shadow-2xl border border-white/[0.10] overflow-hidden z-[200]" style={{ top: '60px', right: '20px' }}>
                  <div className="px-4 py-3 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3">
                      <ProfilePicture
                        src={profile?.profilePicture || userProfile?.profilePicture}
                        alt={currentUser?.displayName || 'Avatar'}
                        name={currentUser?.displayName || undefined}
                        email={currentUser?.email || undefined}
                        size="md"
                        currentUser={currentUser}
                        userProfilePic={userProfilePic}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#f1f5f9] truncate">{currentUser.displayName || "User"}</p>
                        <p className="text-xs text-[#94a3b8] truncate">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    {[
                      { href: '/profile',     Icon: UserCircle, label: 'View Profile'  },
                      { href: '/my-listings', Icon: List,       label: 'My Listings'   },
                      { href: '/orders',      Icon: Package,    label: 'My Orders'     },
                      { href: '/sales',       Icon: TrendingUp, label: 'My Sales'      },
                      { href: '/settings',    Icon: UserCircle, label: 'Settings'      },
                    ].map(({ href, Icon, label }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.05] transition-colors"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.07]">
                    <button
                      onClick={() => { handleLogout(); setShowProfileDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/signin" className="px-4 py-1.5 rounded-lg text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.06] transition-colors font-medium">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
              style={{ background: '#3b82f6', color: '#ffffff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
            >
              Sign up
            </Link>
          </div>
        )}
      </div>

      {/* Tablet Actions */}
      <div className="hidden md:flex lg:hidden items-center gap-2 shrink-0">
        {currentUser ? (
          <>
            <Link href="/cart" className="relative p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.06] transition-colors">
              <ShoppingCart className="w-[18px] h-[18px]" />
              {isMounted && cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#3b82f6] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold"
              style={{ background: '#3b82f6', color: '#ffffff' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Sell
            </Link>
          </>
        ) : (
          <>
            <Link href="/signin" className="px-3 py-1.5 rounded-lg text-sm text-[#94a3b8] hover:text-[#f1f5f9] font-medium transition-colors">Sign in</Link>
            <Link href="/signup" className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: '#3b82f6', color: '#ffffff' }}>Sign up</Link>
          </>
        )}
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden shrink-0 ml-auto">
        <button
          type="button"
          className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.06] transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
    </nav>

    {/* Mobile Navigation Overlay */}
    {mobileMenuOpen && (
      <div className="md:hidden fixed inset-0 bg-[#020617] z-[60] overflow-y-auto">
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
              <img src="/logo.png" alt="AllVerse" width={28} height={28} className="rounded-lg object-contain" />
              <span className="font-bold text-[#f1f5f9] text-sm">AllVerse</span>
            </Link>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-[#94a3b8] hover:text-[#f1f5f9]" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 mb-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isMessages = item.name === 'Messages';
              const showBadge = isMessages && unreadMessageCount > 0 && currentChatId === null;
              const isActive = item.href === '/' ? resolvedPathname === '/' : resolvedPathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                    isActive ? 'text-[#60a5fa] bg-[#3b82f6]/[0.10]' : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.05]'
                  }`}
                  onClick={() => { setMobileMenuOpen(false); if (isMessages) setCurrentChatId(null); }}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.name}
                  {showBadge && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-[#3b82f6] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-white/[0.07] pt-6 space-y-1">
            {currentUser ? (
              <>
                <button onClick={() => { router.push('/favorites'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.05] w-full text-left">
                  <Heart className="w-5 h-5 shrink-0" /> Favorites
                </button>
                <button onClick={() => { router.push('/cart'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.05] w-full text-left">
                  <ShoppingCart className="w-5 h-5 shrink-0" />
                  Cart {isMounted && cartItemCount > 0 && `(${cartItemCount})`}
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.05]" onClick={() => setMobileMenuOpen(false)}>
                  <User className="w-5 h-5 shrink-0" /> Sign in
                </Link>
                <Link href="/signup" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-semibold text-[#0c0c0b] bg-[#c8f135]" onClick={() => setMobileMenuOpen(false)}>
                  <Plus className="w-5 h-5 shrink-0" /> Sign up
                </Link>
              </>
            )}
          </div>

          {currentUser && (
            <div className="border-t border-white/[0.07] mt-6 pt-6">
              <div className="flex items-center gap-3 px-3 mb-4">
                <ProfilePicture
                  src={profile?.profilePicture || userProfile?.profilePicture}
                  alt={currentUser?.displayName || 'Avatar'}
                  name={currentUser?.displayName || undefined}
                  email={currentUser?.email || undefined}
                  size="sm"
                  currentUser={currentUser}
                  userProfilePic={userProfilePic}
                />
                <div>
                  <p className="text-sm font-semibold text-[#f1f5f9]">{currentUser.displayName || "User"}</p>
                  <p className="text-xs text-[#94a3b8]">{currentUser.email}</p>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { href: '/profile',     label: 'View Profile' },
                  { href: '/my-listings', label: 'My Listings'  },
                  { href: '/orders',      label: 'My Orders'    },
                  { href: '/sales',       label: 'My Sales'     },
                  { href: '/sell',        label: 'Sell an Item' },
                  { href: '/settings',    label: 'Settings'     },
                ].map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="block px-3 py-2.5 rounded-xl text-[15px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/[0.05]"
                    onClick={() => setMobileMenuOpen(false)}>
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-[15px] font-medium text-red-400 hover:bg-red-500/[0.08]">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    </>
  );
});

export { Navigation };
export default Navigation;
