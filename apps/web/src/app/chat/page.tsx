'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <div className="min-h-screen home-page">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Smart Chat
          </h1>
          <p className="text-gray-400 text-lg">
            AI-powered conversations with sellers
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
          <p className="text-gray-300 mb-6 text-lg">
            Connect with sellers through intelligent AI-assisted conversations.
          </p>
          <p className="text-gray-400 mb-6">
            This feature is coming soon. In the meantime, try our AI Assistant for marketplace guidance.
          </p>
          <Link 
            href="/ai"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-accent-500 to-primary-500 hover:from-accent-600 hover:to-primary-600 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30 hover:scale-105 active:scale-95 text-lg"
          >
            <MessageCircle className="w-5 h-5" />
            Try AI Assistant
          </Link>
        </div>
      </div>
    </div>
  );
}

