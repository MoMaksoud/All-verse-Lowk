'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';

const FOOTER_LINKS = [
  { heading: 'Shop', links: [['Browse listings', '/listings'], ['Search', '/search'], ['AI assistant', '/ai']] },
  { heading: 'Sell', links: [['List an item', '/sell'], ['Pricing', '/pricing'], ['Help center', '/help']] },
  { heading: 'Company', links: [['About', '/about'], ['FAQ', '/faq'], ['Contact', '/contact']] },
];

// Full-height app screens and auth pages have no footer.
const HIDDEN_PREFIXES = ['/signin', '/signup', '/verify', '/messages', '/ai'];

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr] lg:px-8">
        <div className="col-span-2 md:col-span-1">
          <Logo size="sm" />
          <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-zinc-500">
            A marketplace for secondhand things, priced against the whole resale market.
          </p>
          <a
            href="mailto:info@allversegpt.com"
            className="mt-4 inline-block text-sm font-medium text-zinc-900 hover:text-primary-700"
          >
            info@allversegpt.com
          </a>
        </div>
        {FOOTER_LINKS.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-zinc-950">{col.heading}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-zinc-500 transition hover:text-zinc-950">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} All Verse GPT</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-zinc-950">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-950">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
