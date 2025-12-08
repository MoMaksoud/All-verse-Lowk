'use client';

import Navigation from '@/components/Navigation';
import { Mail, ShoppingBag, Package, Shield, CreditCard, Clock, MessageCircle, Search, Edit, DollarSign } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen home-page">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 mb-6">
            <MessageCircle className="w-5 h-5 text-accent-400" />
            <span className="text-sm font-medium text-accent-400">Help Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            All Verse GPT – Help Center
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            We're here to support you as you buy, sell, and manage listings across the All Verse GPT platform.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600/10 border border-blue-500/20 rounded-xl">
            <Mail className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300">Need help? Contact us at <a href="mailto:info@allversegpt.com" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">info@allversegpt.com</a></span>
          </div>
        </div>

        {/* Help Sections */}
        <div className="space-y-6">
          {/* Getting Started */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Search className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Getting Started</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 mt-1">•</span>
                    <span>Create an account using your email.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 mt-1">•</span>
                    <span>Verify your email (check spam if not received).</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 mt-1">•</span>
                    <span>Start listing items instantly using our Smart Pricing Engine.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Managing Your Listings */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Edit className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Managing Your Listings</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Edit title, description, price, and photos anytime.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Use recommended pricing to stay competitive.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Deactivate or delete listings if the item is sold.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Buying Items */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Buying Items</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Browse listings or search using keywords.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Message sellers directly inside the app.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Request additional photos or negotiate price.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Shipping & Delivery */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Shipping & Delivery</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Sellers can ship items through integrated carriers.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Tracking numbers update automatically inside your dashboard.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>For damaged or missing orders, contact support immediately.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Account & Security */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Account & Security</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Reset your password anytime from the login page.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Two-factor authentication is coming soon.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 mt-1">•</span>
                    <span>Report suspicious users at <a href="mailto:info@allversegpt.com" className="text-red-400 hover:text-red-300 font-medium transition-colors">info@allversegpt.com</a>.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Payments */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Payments</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>Secure checkout powered by our payment partners.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>Sellers receive payouts after item confirmation.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span>For payout issues, email us with your order ID.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Support Response Times */}
          <section className="bg-gradient-to-r from-accent-500/10 to-primary-500/10 backdrop-blur-sm rounded-2xl border border-accent-500/20 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-4">Support Response Times</h2>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-accent-400 mt-1">•</span>
                    <span>Typical response: 1–12 hours.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-accent-400 mt-1">•</span>
                    <span>Priority for disputes, payment issues, and safety concerns.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 px-8 py-6">
            <p className="text-lg font-semibold text-white mb-2">
              Thank you for choosing All Verse GPT.
            </p>
            <p className="text-gray-400">
              Still need help? We're just an email away at{' '}
              <a href="mailto:info@allversegpt.com" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">
                info@allversegpt.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

