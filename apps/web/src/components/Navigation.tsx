'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Search, Bell, User, Plus, MessageCircle, ShoppingBag } from 'lucide-react';
import { Avatar } from '@marketplace/ui';
import { Logo } from './Logo';

const navigation = [
  { name: 'Home', href: '/', icon: ShoppingBag },
  { name: 'Marketplace', href: '/listings', icon: ShoppingBag },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Sell', href: '/sell', icon: Plus },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'New message from John Doe', time: '2 minutes ago', read: false },
    { id: 2, message: 'Your listing "iPhone 14 Pro" got a new offer', time: '1 hour ago', read: false },
    { id: 3, message: 'Welcome to AllVerse! Start exploring our marketplace.', time: '1 day ago', read: true },
  ]);
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <nav className="glass border-b border-dark-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Logo size="md" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => router.push('/listings')}
              className="btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
              title="Search marketplace"
            >
              <Search className="w-5 h-5" />
            </button>
            
            {/* Notification Bell */}
            <button 
              onClick={() => {
                setShowNotifications(true);
                // Mark all notifications as read when bell is clicked
                markAllNotificationsAsRead();
              }}
              className="relative btn-ghost p-2 rounded-xl hover:bg-dark-700/50"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
              )}
            </button>
            
            <Link
              href="/sell"
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Sell
            </Link>
            <Link href="/profile" className="flex items-center">
              <Avatar
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                alt="Profile"
                size="sm"
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
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
              <div className="pt-4 border-t border-dark-600">
                <div className="flex items-center px-3 py-3">
                  <Avatar
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                    alt="Profile"
                    size="sm"
                  />
                  <div className="ml-3">
                    <div className="text-base font-medium text-white">
                      John Doe
                    </div>
                    <div className="text-sm font-medium text-gray-400">
                      john@example.com
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
                </div>
              </div>
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
}
