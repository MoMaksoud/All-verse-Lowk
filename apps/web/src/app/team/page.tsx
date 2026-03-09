'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { TeamMemberCard } from '@/components/TeamMemberCard';
import { teamMembers } from '@/data/team';

export default function TeamPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen home-page">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="h-10 w-48 bg-white/10 rounded animate-pulse mb-6" />
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto bg-white/10 rounded-2xl mb-4 animate-pulse" />
            <div className="h-8 w-48 mx-auto bg-white/10 rounded mb-2 animate-pulse" />
            <div className="h-5 w-64 mx-auto bg-white/10 rounded animate-pulse" />
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-6 sm:p-8">
            <div className="h-6 w-40 bg-white/10 rounded mb-6 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-white/5 rounded-xl border border-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen home-page">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link
          href="/about"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-accent-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to About</span>
        </Link>

        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-primary-500 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Our Team
          </h1>
          <p className="text-gray-400 text-lg">
            Meet the people building AllVerse GPT
          </p>
        </div>

        <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sm:p-8 md:p-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Full team directory
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <TeamMemberCard key={member.name} member={member} showDescription />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
