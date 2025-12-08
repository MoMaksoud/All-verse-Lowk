'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
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
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10 space-y-8">
          <div className="prose prose-invert max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <p className="text-gray-300 leading-relaxed">
                All Verse GPT ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our marketplace platform and services.
              </p>
            </section>

            {/* 1. Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Information We Collect
              </h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                1.1 Information You Provide
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>Account Information:</strong> Name, email address, phone number, username, password</li>
                <li><strong>Profile Information:</strong> Profile picture, bio, interests, buying/selling preferences</li>
                <li><strong>Listing Information:</strong> Product photos, descriptions, prices, categories, condition details</li>
                <li><strong>Payment Information:</strong> Payment method details (processed securely through Stripe)</li>
                <li><strong>Communication Data:</strong> Messages between buyers and sellers, customer support inquiries</li>
                <li><strong>Shipping Information:</strong> Delivery addresses, package dimensions, tracking details</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                1.2 Information Collected Automatically
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages viewed, features used, time spent, click patterns</li>
                <li><strong>Location Data:</strong> Approximate location based on IP address (for shipping and local listings)</li>
                <li><strong>Cookies and Similar Technologies:</strong> To enhance your experience and remember preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                1.3 AI-Generated Information
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>AI Analysis:</strong> Product descriptions, titles, categories, and pricing suggestions generated from your uploaded photos</li>
                <li><strong>Chat Interactions:</strong> Conversations with our AI assistant for listing creation and support</li>
                <li><strong>Market Insights:</strong> AI-generated market research and pricing recommendations</li>
              </ul>
            </section>

            {/* 2. How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. How We Use Your Information
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li>Create and manage your account</li>
                <li>Process transactions and payments</li>
                <li>Enable buying, selling, and communication between users</li>
                <li>Provide AI-powered features (product analysis, pricing suggestions, chat assistance)</li>
                <li>Send transactional notifications (order updates, messages, account alerts)</li>
                <li>Improve our services and develop new features</li>
                <li>Prevent fraud and enhance security</li>
                <li>Comply with legal obligations</li>
                <li>Send marketing communications (with your consent)</li>
              </ul>
            </section>

            {/* 3. Information Sharing and Disclosure */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Information Sharing and Disclosure
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may share your information with:
              </p>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.1 Other Users
              </h3>
              <p className="text-gray-300 leading-relaxed">
                When you create a listing or send a message, certain information (username, profile picture, listing details) becomes visible to other users.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.2 Service Providers
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>Firebase/Google Cloud:</strong> Database, authentication, and storage services</li>
                <li><strong>Stripe:</strong> Payment processing (they have their own privacy policy)</li>
                <li><strong>Google Gemini AI:</strong> AI-powered product analysis and chat features</li>
                <li><strong>Vercel:</strong> Hosting and deployment services</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.3 Legal Requirements
              </h3>
              <p className="text-gray-300 leading-relaxed">
                We may disclose your information if required by law, court order, or governmental authority, or to protect our rights, users' safety, or prevent fraud.
              </p>
            </section>

            {/* 4. Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Data Security
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure Firebase authentication</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular security audits and updates</li>
                <li>PCI-compliant payment processing through Stripe</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            {/* 5. Your Rights and Choices */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Your Rights and Choices
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct your information through your account settings</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails (transactional emails will continue)</li>
                <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format</li>
                <li><strong>Withdrawal of Consent:</strong> Withdraw consent for data processing where applicable</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                To exercise these rights, please contact us at <a href="mailto:allversegpt@gmail.com" className="text-accent-400 hover:text-accent-300">allversegpt@gmail.com</a> or through your account settings.
              </p>
            </section>

            {/* 6. Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Data Retention
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for:
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside mt-4">
                <li>Legal compliance and dispute resolution</li>
                <li>Fraud prevention and security</li>
                <li>Backup and archival purposes</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Transaction records may be retained for up to 7 years for tax and accounting purposes.
              </p>
            </section>

            {/* 7. Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Children's Privacy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are not intended for users under 18 years of age. We do not knowingly collect information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.
              </p>
            </section>

            {/* 8. International Data Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. International Data Transfers
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We use Google Cloud/Firebase infrastructure, which complies with international data protection standards including GDPR.
              </p>
            </section>

            {/* 9. Cookies and Tracking */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Cookies and Tracking Technologies
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li>Remember your preferences and login status</li>
                <li>Analyze site traffic and usage patterns</li>
                <li>Personalize your experience</li>
                <li>Improve our services</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                You can control cookies through your browser settings, but disabling cookies may affect functionality.
              </p>
            </section>

            {/* 10. Third-Party Links */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Third-Party Links
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these sites. We encourage you to read their privacy policies.
              </p>
            </section>

            {/* 11. Changes to This Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* 12. Contact Us */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Contact Us
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-gray-300">
                  <strong className="text-white">All Verse GPT</strong><br />
                  Email: <a href="mailto:allversegpt@gmail.com" className="text-accent-400 hover:text-accent-300">allversegpt@gmail.com</a><br />
                  Website: <a href="https://www.allversegpt.com" className="text-accent-400 hover:text-accent-300">www.allversegpt.com</a>
                </p>
              </div>
            </section>

            {/* GDPR Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                13. Additional Rights for EU Users (GDPR)
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you are in the European Economic Area (EEA), you have additional rights under GDPR:
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li>Right to object to processing of your personal data</li>
                <li>Right to restriction of processing</li>
                <li>Right to data portability</li>
                <li>Right to lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Our legal basis for processing your data includes: consent, contract performance, legitimate interests, and legal obligations.
              </p>
            </section>

            {/* California Privacy Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                14. California Privacy Rights (CCPA)
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                California residents have additional rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
                <li>Right to deletion</li>
                <li>Right to non-discrimination for exercising your rights</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

