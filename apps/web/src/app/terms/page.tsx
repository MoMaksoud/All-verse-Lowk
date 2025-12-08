'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
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
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10 space-y-8">
          <div className="prose prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                Welcome to All Verse GPT LLC (the "App"), an AI-powered marketplace and social hub. By accessing or using the App, you agree to comply with and be bound by these Terms and Conditions ("Terms"). If you do not agree with any part of these Terms, please refrain from using the App.
              </p>
            </section>

            {/* Definitions */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2. Definitions</h2>
              <div className="text-gray-300 leading-relaxed space-y-3">
                <p><strong className="text-white">"User":</strong> Any individual or entity accessing or using the App.</p>
                <p><strong className="text-white">"Content":</strong> Any information, data, text, graphics, photos, videos, or other materials uploaded, downloaded, or appearing on the App.</p>
                <p><strong className="text-white">"Services":</strong> The functionalities and features provided by the App, including but not limited to AI-generated content, marketplace transactions, and social interactions.</p>
              </div>
            </section>

            {/* User Eligibility */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Eligibility</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                By using the App, you represent and warrant that:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>You are at least 18 years old or have reached the age of majority in your jurisdiction.</li>
                <li>You have the legal capacity to enter into binding contracts.</li>
                <li>Your use of the App does not violate any applicable laws or regulations.</li>
              </ul>
            </section>

            {/* User Account */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4. User Account</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">4.1 Registration</h3>
              <p className="text-gray-300 leading-relaxed">
                To access certain features of the App, you may be required to create a user account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">4.2 Account Security</h3>
              <p className="text-gray-300 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify All Verse GPT LLC immediately of any unauthorized use of your account or any other breach of security.
              </p>
            </section>

            {/* User Conduct */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5. User Conduct</h2>
              <p className="text-gray-300 leading-relaxed mb-3">
                By using the App, you agree not to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Post, transmit, or share Content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.</li>
                <li>Use the App for any illegal or unauthorized purpose, including but not limited to violating any intellectual property rights or privacy rights.</li>
                <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
                <li>Interfere with or disrupt the operation of the App or servers or networks connected to the App, or engage in any activity that could damage, disable, overburden, or impair the App's functionality.</li>
              </ul>
            </section>

            {/* User-Generated Content */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6. User-Generated Content</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">6.1 Responsibility for Content</h3>
              <p className="text-gray-300 leading-relaxed">
                You are solely responsible for the Content you post, upload, or otherwise make available through the App. By doing so, you represent and warrant that you own or have the necessary licenses, rights, consents, and permissions to use and authorize All Verse GPT LLC to use such Content.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">6.2 License Grant</h3>
              <p className="text-gray-300 leading-relaxed">
                By posting Content on the App, you grant All Verse GPT LLC a worldwide, non-exclusive, royalty-free, transferable, sub-licensable license to use, reproduce, distribute, prepare derivative works of, display, and perform the Content in connection with the App and All Verse GPT LLC's business.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">6.3 Monitoring and Removal</h3>
              <p className="text-gray-300 leading-relaxed">
                All Verse GPT LLC reserves the right, but is not obligated, to monitor, edit, or remove any Content that violates these Terms or is otherwise objectionable.
              </p>
            </section>

            {/* Footer Note */}
            <div className="mt-12 pt-6 border-t border-white/10">
              <p className="text-gray-400 text-sm text-center">
                By using All Verse GPT, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

