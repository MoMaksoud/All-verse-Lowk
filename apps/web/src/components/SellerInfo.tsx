import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  
  // Guard: don't render if current user is the seller
  if (currentUserId && seller?.id && currentUserId === seller.id) {
    return null;
  }

  const handleProfileClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (seller?.id) {
      console.log('Navigating to profile:', seller.id);
      router.push(`/profile/${seller.id}`);
    } else {
      console.warn('No seller ID available');
    }
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-[#1b2230] text-white overflow-hidden">
      {/* Top: avatar + name */}
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <button
          onClick={(e) => handleProfileClick(e)}
          className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
          aria-label={`View ${seller?.name}'s profile`}
          type="button"
        >
          <ProfilePicture
            src={seller?.profilePicture}
            alt={seller?.name || 'Seller'}
            name={seller?.name}
            size="lg"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleProfileClick(e)}
              className="truncate text-base sm:text-lg font-semibold cursor-pointer hover:text-blue-400 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              type="button"
            >
              {seller?.name || "Marketplace User"}
            </button>
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