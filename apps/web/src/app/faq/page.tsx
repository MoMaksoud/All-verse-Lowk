'use client';

import Navigation from '@/components/Navigation';
import { HelpCircle, Mail } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      question: "Why didn't I receive a verification email?",
      answer: 'Check your spam or junk folder. Mark it as "Not Spam" so future emails go to your inbox.'
    },
    {
      question: "How do I list an item?",
      answer: 'Go to "Create Listing," upload photos, add details, and use our Smart Pricing Engine for instant price guidance.'
    },
    {
      question: "Can I negotiate prices?",
      answer: "Yes. Buyers and sellers can negotiate directly through the in-app messaging system."
    },
    {
      question: "How does the Smart Pricing Engine work?",
      answer: "It analyzes market listings, recent sale trends, and condition data to suggest accurate pricing ranges."
    },
    {
      question: "How do I report a problem with a seller or buyer?",
      answer: (
        <>
          Email us at <a href="mailto:info@allversegpt.com" className="text-accent-400 hover:text-accent-300 font-semibold transition-colors">info@allversegpt.com</a> with screenshots and the order ID.
        </>
      )
    },
    {
      question: "What payment methods are supported?",
      answer: "We support major debit cards, credit cards, and integrated wallet options."
    },
    {
      question: "When do sellers receive payouts?",
      answer: "After the buyer confirms the item has arrived and matches the description."
    },
    {
      question: "What happens if my item arrives damaged?",
      answer: "Contact support immediately. Provide photos and we will start a dispute resolution process."
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Settings → Account → Delete Account. You may also request removal by emailing support."
    },
    {
      question: "How do I update my email or password?",
      answer: 'You can change both under "Account Settings."'
    }
  ];

  return (
    <div className="min-h-screen home-page">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 mb-6">
            <HelpCircle className="w-5 h-5 text-accent-400" />
            <span className="text-sm font-medium text-accent-400">Frequently Asked Questions</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            All Verse GPT – FAQ
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Find quick answers to common questions about using All Verse GPT
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-6 mb-12">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all duration-200"
            >
              <h2 className="text-xl font-semibold text-white mb-3 flex items-start gap-3">
                <span className="text-accent-400 flex-shrink-0">{index + 1}.</span>
                <span>{faq.question}</span>
              </h2>
              <div className="text-gray-300 leading-relaxed pl-8">
                {faq.answer}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12">
          <div className="bg-gradient-to-r from-accent-500/10 to-primary-500/10 backdrop-blur-sm rounded-2xl border border-accent-500/20 p-8 text-center">
            <Mail className="w-12 h-12 text-accent-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-white mb-2">
              Still have questions?
            </p>
            <p className="text-gray-300 mb-4">
              If your question is not listed, email us at{' '}
              <a 
                href="mailto:info@allversegpt.com" 
                className="text-accent-400 hover:text-accent-300 font-semibold transition-colors"
              >
                info@allversegpt.com
              </a>
            </p>
            <a
              href="mailto:info@allversegpt.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-accent-500/25"
            >
              <Mail className="w-5 h-5" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

