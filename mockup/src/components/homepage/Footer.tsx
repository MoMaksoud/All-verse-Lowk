import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { footerColumns, footerLegalLinks } from "@/lib/mock-data";

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-3.11-1.32V15.5a5.68 5.68 0 1 1-4.9-5.63v2.63a3.05 3.05 0 1 0 2.4 2.98V2h2.6a4.28 4.28 0 0 0 3.01 3.72z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-[#FAFAFA] pt-14 pb-8">
      <div className="mx-auto max-w-[1600px] px-8">
        <div className="grid grid-cols-4 gap-8">
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-sm font-bold text-[#111827]">
                {column.heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#6B7280] transition-colors hover:text-[#2563EB]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-bold text-[#111827]">
              Download the App
            </h3>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#111827">
                  <path d="M2 2h9v9H2zm11 0h9v9h-9zM2 13h9v9H2zm11 0h4v4h-4zm5 0h4v4h-4zm-5 5h4v4h-4zm5 0h4v4h-4z" />
                </svg>
              </div>
              <p className="text-xs text-[#6B7280]">
                List faster, track your orders, and never miss a beat. On iOS
                and Android.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Link href="#" aria-label="X" className="text-[#6B7280] transition-colors hover:text-[#111827]">
                <XIcon />
              </Link>
              <Link href="#" aria-label="Instagram" className="text-[#6B7280] transition-colors hover:text-[#111827]">
                <InstagramIcon />
              </Link>
              <Link href="#" aria-label="TikTok" className="text-[#6B7280] transition-colors hover:text-[#111827]">
                <TikTokIcon />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-[#E5E7EB] pt-6">
          <button
            type="button"
            className="flex items-center gap-1 text-[13px] text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            United States
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <ul className="flex items-center gap-6">
            {footerLegalLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-[13px] text-[#6B7280] transition-colors hover:text-[#111827]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
