'use client';

import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Info, Mail } from 'lucide-react';
import Link from 'next/link';
import { teamMembers } from '@/data/team';
import { TeamMemberCard } from '@/components/TeamMemberCard';

export default function AboutPage() {
  return (
    <div className="min-h-screen home-page">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            About Us
          </h1>
        </div>

        <div className="space-y-12">
          {/* Who We Are */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Who We Are</h2>
            <p className="text-gray-300 leading-relaxed text-base sm:text-lg">
              AllVerse GPT is an AI-driven marketplace and interaction hub. The core idea is simple: technology should make trading smarter, safer, and easier for both buyers and sellers. We blend software and intelligent tools to remove the guesswork from pricing, communication, and product discovery. Instead of spending time bouncing between apps, you get a single streamlined place to browse, chat, and make decisions confidently.
            </p>
          </section>

          {/* What We Do */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">What We Do</h2>
            <p className="text-gray-300 leading-relaxed text-base sm:text-lg mb-4">
              On the platform, users can:
            </p>
            <ul className="space-y-3 text-gray-300 text-base sm:text-lg">
              <li className="flex items-start gap-3">
                <span className="text-accent-400 mt-1">•</span>
                <span>Talk directly with sellers through Smart Chat.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-400 mt-1">•</span>
                <span>Get AI-assisted offer suggestions for faster negotiation.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-400 mt-1">•</span>
                <span>Explore fair price guidance using real-time market insights.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-400 mt-1">•</span>
                <span>Discover products efficiently through smart search and listing previews.</span>
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed text-base sm:text-lg mt-6">
              Our tools are built to feel natural, fast, and helpful. Whether you're listing an item or making an offer, the AI works quietly in the background giving you clarity so you can focus on the decision, not the process.
            </p>
          </section>

          {/* Our Team */}
          <section className="bg-white/5 backdrop-blur-sm p-6 sm:p-8 md:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Our Team</h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  We're a group of engineers, creators, and digital builders working together to push practical AI into real world marketplace interactions.
                </p>
              </div>
              <Link 
                href="/team"
                className="mt-4 sm:mt-0 whitespace-nowrap text-accent-400 hover:text-accent-300 transition-colors text-sm sm:text-base font-medium"              >
              View Full Team →
              </Link>
            </div>
            <h3 className="text-xl font-semibold text-white mb-6">Leadership</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.name} member={member} showDescription={false} />
              ))}
            </div>
          </section>

          {/* Homepage Engagement Overview */}
          <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Homepage Engagement Overview</h2>
            <p className="text-gray-300 leading-relaxed text-base sm:text-lg">
              We designed the homepage to reflect interactivity first. Every core feature card routes to a real page or placeholder so you can plug in your flows without clutter. The UI favors user engagement, clear actions, and real routing over decoration. No distractions, no dead buttons.
            </p>
            <div className="mt-6">
              <Link 
                href="/contact"
                className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 transition-colors font-medium"
              >
                <Mail className="w-4 h-4" />
                Get in Touch
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

