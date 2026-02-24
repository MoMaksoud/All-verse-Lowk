'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { TeamMemberCard } from '@/components/TeamMemberCard';

export interface TeamMember {
  name: string;
  role: string;
  description: string;
  image?: string;
  linkedin?: string;
  github?: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: 'Dustin Harrell',
    role: 'Chief Executive Officer',
    description: 'Founder and CEO who originated the vision for the platform, leads product strategy, and drives overall execution across teams.',
    linkedin: 'https://www.linkedin.com/in/dustin-harrell-43a540249/',
    image: 'team/img/DH.jpg',
  },
  {
    name: 'Christopher Derys',
    role: 'Chief Operating Officer',
    description: 'Oversees daily operations, workflow efficiency, and user-seller interactions.',
    linkedin: '',
  },
  {
    name: 'Alex Mohamed',
    role: 'Chief Financial Officer',
    description: 'Handles financial strategy, investor communication, and platform sustainability.',
    linkedin: 'https://www.linkedin.com/in/alexk-mohamed/',
    image: 'team/img/AM.jpg',
  },
  {
    name: 'Noah ',
    role: 'Chief Technology Officer',
    description: 'Leads the platform’s technical vision, overseeing architecture, scalability, and the engineering roadmap.',
    linkedin: 'https://www.linkedin.com/in/alexk-mohamed/',
    image: 'team/img/N.jpg',
  },
  {
    name: 'Mohamed Abdelmaksoud',
    role: 'Developer',
    description: 'Leads full-stack development, building the UI, integrating core systems, and deploying the platform live.',
    linkedin: 'https://www.linkedin.com/in/mohamed-abdelmaksoud-6b416b295/',
    github: 'https://github.com/MoMaksoud',
    image: 'team/img/MA.png',
  },
  {
    name: 'Mario Sinclair',
    role: 'Developer',
    description: 'Designs and manages the database, contributes to the UI, and drives mobile app development toward App Store release.',
    linkedin: 'https://www.linkedin.com/in/mario-sinclair/',
    github: 'https://github.com/MarioSinclair',
    image: 'team/img/MS.jpg',
  },
  {
    name: 'Yengner Bermudez',
    role: 'Developer',
    description: 'Strengthens backend architecture and infrastructure to improve performance, reliability, and scalability.',
    linkedin: 'https://www.linkedin.com/in/yengner-bermudez/',
    github: 'https://github.com/Yengner',
    image: 'team/img/YB.jpg',
  },
  {
    name: 'Fahada Alathel',
    role: 'Developer',
    description: 'Optimizes database systems and enhances backend efficiency for faster, more resilient data operations.',
    linkedin: 'https://www.linkedin.com/in/fahada-alathel/',
    github: 'https://github.com/ffalathel',
    image: 'team/img/FA.jpg',
  },
  {
    name: 'Mark Halim',
    role: 'Developer',
    description: 'Builds and maintains core platform features, ensuring performance, scalability, and a seamless user experience.',
    linkedin: 'https://www.linkedin.com/in/mark-halim-287446268/',
    github: '',
    image: 'team/img/MH.jpeg'
  },
];

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
