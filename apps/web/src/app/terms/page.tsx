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

            {/* Marketplace Transactions */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7. Marketplace Transactions</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">7.1 Listing and Selling</h3>
              <p className="text-gray-300 leading-relaxed">
                Users may list items or services for sale on the App's marketplace. By listing an item or service, you represent and warrant that you have the right to sell the item or service and that the listing is accurate, legal, and complete.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">7.2 Purchasing</h3>
              <p className="text-gray-300 leading-relaxed">
                When purchasing an item or service through the App, you agree to pay all charges associated with the transaction, including any applicable taxes and fees. All Verse GPT LLC is not responsible for the quality, safety, legality, or delivery of the items or services sold by users.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">7.3 Disputes</h3>
              <p className="text-gray-300 leading-relaxed">
                Any disputes arising from marketplace transactions are solely between the buyer and seller. All Verse GPT LLC may, at its discretion, assist in resolving disputes but has no obligation to do so.
              </p>
            </section>

            {/* AI-Generated Content */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8. AI-Generated Content</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">8.1 Nature of AI Content</h3>
              <p className="text-gray-300 leading-relaxed">
                The App may provide content generated by artificial intelligence ("AI"). While All Verse GPT LLC strives for accuracy, AI-generated content may not always be accurate or reliable. You acknowledge and agree that any reliance on AI-generated content is at your own risk.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">8.2 No Professional Advice</h3>
              <p className="text-gray-300 leading-relaxed">
                AI-generated content is provided for informational purposes only and should not be construed as professional advice (including but not limited to financial, legal, medical, or other professional advice). Always seek the advice of a qualified professional with any questions you may have regarding a particular subject matter.
              </p>
            </section>

            {/* Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9. Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Your use of the App is subject to All Verse GPT LLC's Privacy Policy, which outlines how we collect, use, and protect your personal information. By using the App, you consent to the collection and use of your information as described in the Privacy Policy.
              </p>
            </section>

            {/* Intellectual Property Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">10. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">10.1 Ownership</h3>
              <p className="text-gray-300 leading-relaxed">
                All Verse GPT LLC and its licensors own all rights, title, and interest in and to the App, including all associated intellectual property rights. These Terms do not grant you any rights to use any trademarks, logos, or service marks displayed on the App.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">10.2 User Content</h3>
              <p className="text-gray-300 leading-relaxed">
                You retain ownership of any intellectual property rights that you hold in the Content you post on the App. By posting Content, you grant All Verse GPT LLC the rights described in Section 6.2 of these Terms.
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">11. Disclaimers</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">11.1 No Warranty</h3>
              <p className="text-gray-300 leading-relaxed">
                The App and all Content and Services provided through it are provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. All Verse GPT LLC disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">11.2 No Liability for User Conduct</h3>
              <p className="text-gray-300 leading-relaxed">
                All Verse GPT LLC is not responsible or liable for the conduct of any user or for any Content posted by users. You assume all risk when using the App and interacting with other users.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">12. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed">
                To the fullest extent permitted by applicable law, All Verse GPT LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from: • Your access to or use of or inability to access or use the App. • Any conduct or Content of any third party on the App. • Any Content obtained from the App. • Unauthorized access, use, or alteration of your transmissions or Content.
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">13. Indemnification</h2>
              <p className="text-gray-300 leading-relaxed">
                You agree to indemnify, defend, and hold harmless All Verse GPT LLC, its affiliates, officers, directors, employees, agents, and licensors from and against any and all claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with: • Your access to or use of the App. • Your violation of these Terms. • Your infringement of any rights of another party, including intellectual property or privacy rights.
              </p>
            </section>

            {/* Contact Information */}
            <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
              <div className="text-gray-300 space-y-2">
                <p><strong className="text-white">Email:</strong> info@allversegpt.com</p>
                <p><strong className="text-white">Website:</strong> <a href="https://allversegpt.com" className="text-accent-400 hover:text-accent-300 transition-colors">https://allversegpt.com</a></p>
              </div>
            </div>

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

