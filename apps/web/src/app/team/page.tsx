import Link from 'next/link';
import { teamMembers } from '@/data/team';

export default function TeamPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <Link href="/about" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
        ← About AllVerse
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-950">The team</h1>
      <p className="mt-3 text-zinc-600">The people building AllVerse.</p>

      <ul className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
        {teamMembers.map((member) => {
          const photo = member.image
            ? member.image.startsWith('/') ? member.image : `/${member.image}`
            : null;
          return (
            <li key={member.name} className="flex gap-5 py-6">
              {photo ? (
                <img src={photo} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-zinc-100 text-lg font-semibold text-zinc-600" aria-hidden="true">
                  {member.name.split(' ').map((n) => n[0]).join('')}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="font-semibold text-zinc-950">{member.name}</h2>
                  <p className="text-sm text-zinc-500">{member.role}</p>
                </div>
                <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-zinc-600">{member.description}</p>
                <div className="mt-3 flex gap-4 text-sm font-medium">
                  {member.linkedin && (
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                      LinkedIn
                    </a>
                  )}
                  {member.github && (
                    <a href={member.github} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
