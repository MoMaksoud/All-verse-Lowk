'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, MessageCircle, ArrowRight, Sparkles } from 'lucide-react';

export function AIWidget() {
  return (
    <div className="bg-gradient-to-br from-dark-800/90 to-dark-900/90 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:border-accent-500/50 transition-all duration-300 group shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">AI Assistant</h3>
            <p className="text-white text-sm" style={{textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'}}>Your intelligent marketplace guide</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-400 animate-pulse" />
        </div>
      </div>

      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-400">24/7</p>
            <p className="text-xs text-white" style={{textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'}}>Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">Smart</p>
            <p className="text-xs text-white" style={{textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'}}>Search</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">Free</p>
            <p className="text-xs text-white" style={{textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'}}>To Use</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Link
            href="/ai"
            className="flex items-center justify-between p-3 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 rounded-xl transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-accent-400" />
              <span className="text-white text-sm font-medium">Chat with AI</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white hover:text-accent-400 transition-colors" />
          </Link>
        </div>

        {/* Call to Action */}
        <div className="pt-4 border-t border-white/20">
          <Link
            href="/ai"
            className="w-full bg-accent-500/90 hover:bg-accent-600 backdrop-blur-md text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 group border border-accent-400/30 shadow-lg"
          >
            <Bot className="w-4 h-4" />
            Start AI Chat
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
