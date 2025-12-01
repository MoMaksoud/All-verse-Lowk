'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
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

        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Contact Us
          </h1>
          <p className="text-gray-400 text-lg">
            Get in touch with our team
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Email</h2>
              <a 
                href="mailto:info@allversegpt.com"
                className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 transition-colors text-lg"
              >
                <Send className="w-5 h-5" />
                info@allversegpt.com
              </a>
            </div>
            
            <div className="pt-6 border-t border-white/10">
              <p className="text-gray-300 mb-4">
                Have a question, suggestion, or need support? We'd love to hear from you.
              </p>
              <p className="text-gray-400 text-sm">
                Our team typically responds within 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

