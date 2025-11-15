import Image from 'next/image';

interface SellerInfoProps {
  seller?: {
    name?: string;
    since?: string;
    id?: string;
    profilePicture?: string | null;
  };
  onContactClick?: () => void;
  currentUserId?: string;
}

export function SellerInfo({ seller, onContactClick, currentUserId }: SellerInfoProps) {
  // Guard: don't render if current user is the seller
  if (currentUserId && seller?.id && currentUserId === seller.id) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-[#1b2230] text-white overflow-hidden">
      {/* Top: avatar + name */}
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 overflow-hidden">
          {seller?.profilePicture ? (
            <Image
              src={seller.profilePicture}
              alt={seller.name || 'Seller'}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/70">
              <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4.33 0-8 2.17-8 4.5V21h16v-2.5c0-2.33-3.67-4.5-8-4.5Z"/>
            </svg>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base sm:text-lg font-semibold">
              {seller?.name || "Marketplace User"}
            </h3>
          </div>
          <p className="text-sm text-white/60">Member since {seller?.since || "2025"}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onContactClick?.(); }}
          className="w-full rounded-xl bg-[#2f5cf6] hover:bg-[#2c53da] transition-colors px-4 py-3 text-center text-[15px] font-semibold"
        >
          Contact Seller
        </button>
      </div>
    </section>
  );
}