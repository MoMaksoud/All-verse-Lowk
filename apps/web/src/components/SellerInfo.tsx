import { ProfilePicture } from './ProfilePicture';

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
        <ProfilePicture
          src={seller?.profilePicture}
          alt={seller?.name || 'Seller'}
          name={seller?.name}
          size="lg"
          className="w-12 h-12"
        />

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