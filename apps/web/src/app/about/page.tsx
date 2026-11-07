import Link from 'next/link';
import { teamMembers } from '@/data/team';

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">About AllVerse</h1>
        <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-zinc-600">
          AllVerse is a marketplace for secondhand things. Sellers add photos and the AI drafts the listing and suggests a price. Buyers pay through Stripe.
        </p>
      </header>

      <section className="mt-12 border-t border-zinc-200 pt-10">
        <h2 className="text-lg font-semibold text-zinc-950">What it does today</h2>
        <ul className="mt-4 space-y-3 text-zinc-700">
          <li>Drafts a title, description, category and condition from your photos, then asks about anything the photos don’t show.</li>
          <li>Suggests a price from comparable listings, and shows how many listings it’s based on.</li>
          <li>Handles checkout and payouts through Stripe. Listing is free; the seller fee is 4.5% of the item price when it sells.</li>
          <li>Lets buyers and sellers message each other about a listing.</li>
        </ul>
      </section>

      <section className="mt-12 border-t border-zinc-200 pt-10">
        <h2 className="text-lg font-semibold text-zinc-950">Team</h2>
        <p className="mt-2 text-zinc-600">The people building AllVerse.</p>
        <ul className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
          {teamMembers.map((member) => (
            <li key={member.name} className="flex items-center gap-4 py-4 sm:gap-5">
              {member.image ? (
                <img
                  src={member.image.startsWith('/') ? member.image : `/${member.image}`}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600" aria-hidden="true">
                  {member.name.split(' ').map((n) => n[0]).join('')}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-950">{member.name}</p>
                <p className="text-sm text-zinc-500">{member.role}</p>
              </div>
              {member.linkedin && (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  LinkedIn
                </a>
              )}
            </li>
          ))}
        </ul>
        <Link href="/team" className="mt-6 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
          More about the team
        </Link>
      </section>
    </div>
  );
}
