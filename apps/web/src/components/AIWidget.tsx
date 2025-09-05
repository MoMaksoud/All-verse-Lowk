'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, MessageCircle, TrendingUp, BarChart3, ArrowRight, Sparkles } from 'lucide-react';

export function AIWidget() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-600 rounded-2xl p-6 hover:border-accent-500/50 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">AI Assistant</h3>
            <p className="text-gray-400 text-sm">Your intelligent marketplace guide</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-400 animate-pulse" />
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-400">24/7</p>
            <p className="text-xs text-gray-400">Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">Smart</p>
            <p className="text-xs text-gray-400">Search</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">Free</p>
            <p className="text-xs text-gray-400">To Use</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Link
            href="/ai"
            className="flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-accent-400" />
              <span className="text-white text-sm">Chat with AI</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-accent-400 transition-colors" />
          </Link>
          
          <Link
            href="/ai"
            className="flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-accent-400" />
              <span className="text-white text-sm">View Analytics</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-accent-400 transition-colors" />
          </Link>
          
          <Link
            href="/ai"
            className="flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-accent-400" />
              <span className="text-white text-sm">Market Insights</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-accent-400 transition-colors" />
          </Link>
        </div>

        {/* Call to Action */}
        <div className="pt-4 border-t border-dark-600">
          <Link
            href="/ai"
            className="w-full bg-accent-500 hover:bg-accent-600 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 group"
          >
            <Bot className="w-4 h-4" />
            Access AI Command Center
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
