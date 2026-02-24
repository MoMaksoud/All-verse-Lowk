'use client';

import React from 'react';
import { Linkedin, Github } from 'lucide-react';
import type { TeamMember } from '@/app/team/page';

function hasImage(member: TeamMember): boolean {
  return Boolean(member.image && member.image.trim());
}

export function TeamMemberCard({
  member,
  showDescription = false,
}: {
  member: TeamMember;
  showDescription?: boolean;
}) {
  const showPhoto = hasImage(member);

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex flex-col hover:border-accent-500/30 transition-colors">
      {/* Image section: full-width 1:1 square, no padding inside wrapper */}
      <div className="w-full aspect-square overflow-hidden rounded-t-2xl bg-white/10">
        {showPhoto ? (
          <img
            src={member.image!}
            alt={member.name}
            className="block w-full h-full object-cover object-center"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-semibold text-accent-400 bg-white/10 border-b border-white/10">
            {member.name.split(' ').map((n) => n[0]).join('')}
          </span>
        )}
      </div>
      {/* Bottom section: name on one line, then role left + icons right */}
      <div className="p-5 flex-1 flex flex-col border-t border-white/10">
        <h3 className="font-bold text-lg text-white mb-2 leading-tight">
          {member.name}
        </h3>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-accent-400">
            {member.role}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {member.linkedin ? (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-accent-400 hover:bg-accent-500/20 transition-colors"
                aria-label={`${member.name} on LinkedIn`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            ) : (
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 cursor-default" aria-hidden>
                <Linkedin className="w-4 h-4" />
              </span>
            )}
            {member.role === 'Developer' && (
              member.github ? (
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-accent-400 hover:bg-accent-500/20 transition-colors"
                  aria-label={`${member.name} on GitHub`}
                >
                  <Github className="w-4 h-4" />
                </a>
              ) : (
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 cursor-default" aria-hidden>
                  <Github className="w-4 h-4" />
                </span>
              )
            )}
          </div>
        </div>
        {showDescription && member.description && (
          <p className="text-sm text-gray-400 leading-relaxed">
            {member.description}
          </p>
        )}
      </div>
    </div>
  );
}
