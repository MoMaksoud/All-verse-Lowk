"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, MessageSquare, Heart } from "lucide-react";
import clsx from "clsx";
import { useState, useCallback, useEffect, memo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';
import { MessageInputModal } from '@/components/MessageInputModal';
import { ProfilePicture } from '@/components/ProfilePicture';
import { normalizeImageSrc } from '@marketplace/shared-logic';
import { formatPrice as formatPriceUtil } from '@/lib/format';
import { recordDiscoveryClick } from '@/lib/discoveryHistory';
import { loadFavoriteIds, setFavorite } from '@/lib/favorites';

type SellerProfile = { username?: string; profilePicture?: string; createdAt?: string | Date | { toDate?: () => Date } };

type Props = {
  variant: "grid" | "list";
  id: string;
  title: string;
  description: string;
  price: string | number;
  category: string;
  condition?: string;
  imageUrl?: string | null;
  sellerId?: string;
  sellerProfile?: SellerProfile | null;
  sold?: boolean;
  soldThroughAllVerse?: boolean;
  inventory?: number;
  onAddToCart?: () => void;
  onChat?: () => void;
  onFav?: () => void;
};

function ListingCard({
  variant,
  id,
  title,
  description,
  price,
  category,
  condition,
  imageUrl,
  sellerId,
  sellerProfile: sellerProfileProp,
  sold = false,
  soldThroughAllVerse = false,
  inventory,
  onAddToCart,
  onChat,
  onFav,
}: Props) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    loadFavoriteIds().then((ids) => setIsFavorited(ids.has(id)));
  }, [currentUser, id]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Reset image error when imageUrl changes (e.g. different listing)
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);
  
  // Seller profile: use prop when provided (from API), otherwise fetch
  const [fetchedSellerProfile, setFetchedSellerProfile] = useState<SellerProfile | null>(null);

  useEffect(() => {
    if (sellerProfileProp != null || !sellerId) return;

    const fetchSellerProfile = async () => {
      try {
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet(`/api/profile?userId=${sellerId}`, { requireAuth: false });
        if (response.ok) {
          const data = await response.json();
          setFetchedSellerProfile({
            username: data.data?.username || "Marketplace User",
            profilePicture: data.data?.profilePicture ?? undefined,
            createdAt: data.data?.createdAt,
          });
        } else {
          setFetchedSellerProfile({ username: "Marketplace User" });
        }
      } catch {
        setFetchedSellerProfile({ username: "Marketplace User" });
      }
    };

    fetchSellerProfile();
  }, [sellerId, sellerProfileProp]);

  const sellerProfile = sellerProfileProp ?? fetchedSellerProfile;

  const formatPriceDisplay = (p: string | number): string => formatPriceUtil(p);

  // Helper function to format member since date
  const formatMemberSince = (timestamp: any) => {
    if (!timestamp) return "Member since 2025";
    try {
      // Handle Firestore Timestamp, ISO string, or Date object
      let date: Date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        date = new Date(timestamp);
      }
      
      // Validate date
      if (isNaN(date.getTime())) {
        return "Member since 2025";
      }
      
      return `Member since ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric"
      }).format(date)}`;
    } catch {
      return "Member since 2025";
    }
  };

  const truncateWords = (text: string, count: number) => {
    const words = text.trim().split(" ");
    if (words.length <= count) return text;
    return words.slice(0, count).join(" ") + "...";
  };

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      showError('Please log in to add items to cart');
      return;
    }

    if (!sellerId) {
      showError('Unable to add item to cart');
      return;
    }

    setAddingToCart(true);
    try {
      const priceValue = typeof price === 'number' ? price : parseFloat(price.toString().replace(/[^0-9.-]+/g, ''));
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/carts', {
        listingId: id,
        sellerId: sellerId,
        qty: 1,
        priceAtAdd: priceValue,
      });

      if (response.ok) {
        showSuccess('Item added to cart successfully!');
        onAddToCart?.();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showError(errorData.error || errorData.message || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showError('Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  }, [currentUser, sellerId, id, price, showSuccess, showError, onAddToCart]);

  const handleChatClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      showError('Please log in to start a conversation');
      return;
    }

    if (!sellerId) {
      showError('Unable to start conversation');
      return;
    }

    // Open message input modal instead of auto-sending
    setShowMessageModal(true);
  }, [currentUser, sellerId, showError]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!currentUser || !sellerId) return;

    try {
      await startChat({
        listingId: id,
        sellerId: sellerId,
        listingTitle: title,
        listingPrice: typeof price === 'number' ? price : parseFloat(price.toString().replace(/[^0-9.-]+/g, '')),
        initialMessage: messageText,
        navigateToChat: false, // Don't auto-navigate, let user decide
      });
      showSuccess('Message sent!', 'Your message has been sent to the seller.');
      onChat?.();
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message', 'Please try again.');
      throw error; // Re-throw so modal can handle it
    }
  }, [currentUser, sellerId, id, title, price, startChat, showSuccess, showError, onChat]);

  const handleFavoriteClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) {
      showError('Please log in to favorite items');
      return;
    }

    const next = !isFavorited;
    setIsFavorited(next);
    try {
      await setFavorite(id, next);
      showSuccess(next ? 'Added to favorites' : 'Removed from favorites');
      onFav?.();
    } catch (error) {
      console.error('Error updating favorites:', error);
      setIsFavorited(!next);
      showError('Failed to update favorites');
    }
  }, [currentUser, id, isFavorited, showSuccess, showError, onFav]);

  const listingImageSrc =
    imageError || !normalizeImageSrc(imageUrl || '')
      ? '/fallback-product.png'
      : normalizeImageSrc(imageUrl || '');

  return (
    <>
      <Link
        href={`/listings/${id}`}
        className="block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-4"
        onClick={() => recordDiscoveryClick({ query: title, category, source: 'AllVerse' })}
      >
        <article
        className={clsx(
          variant === "grid"
            ? "group h-full"
            : "rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 transition-colors hover:border-zinc-300"
        )}
      >
        {variant === "grid" ? (
          <div className="flex h-full flex-col">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-zinc-100">
              <Image
                src={listingImageSrc}
                alt={title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                quality={75}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                onError={() => setImageError(true)}
              />

              {sold || inventory === 0 ? (
                <span className="absolute left-2.5 top-2.5 rounded-md bg-zinc-900/85 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
                  {soldThroughAllVerse ? "Sold on AllVerse" : "Sold"}
                </span>
              ) : null}

              <button
                onClick={handleFavoriteClick}
                aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
                aria-pressed={isFavorited}
                className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-zinc-950 active:scale-95"
              >
                <Heart
                  strokeWidth={1.75}
                  className={clsx("h-[18px] w-[18px]", isFavorited && "fill-red-500 text-red-500")}
                />
              </button>

              {!(sold || inventory === 0) && (
                <div className="absolute inset-x-2.5 bottom-2.5 flex gap-2 transition duration-300 ease-out sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    aria-label="Add to cart"
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/95 text-[13px] font-medium text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white active:scale-[0.98] disabled:opacity-60"
                  >
                    <ShoppingCart strokeWidth={1.75} className="h-4 w-4" />
                    <span className="hidden sm:inline">{addingToCart ? "Adding..." : "Add to cart"}</span>
                  </button>
                  <button
                    onClick={handleChatClick}
                    aria-label="Message seller"
                    className="grid h-9 w-9 place-items-center rounded-lg bg-white/95 text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white active:scale-[0.98]"
                  >
                    <MessageSquare strokeWidth={1.75} className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 pt-3">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-800 transition-colors group-hover:text-zinc-950">
                {title}
              </h3>
              <p className="text-xs capitalize text-zinc-500">
                {[category, condition].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-auto pt-1 text-base font-semibold tabular-nums text-zinc-950">
                {formatPriceDisplay(price)}
              </p>
            </div>
          </div>
        ) : (
          // list variant
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-5">
            {/* Image */}
            <div className="w-full sm:w-32 md:w-44 lg:w-56 shrink-0">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-white relative">
                <Image
                  src={listingImageSrc}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  quality={75}
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-zinc-900 line-clamp-2 break-words">
                {title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-zinc-500 break-words">
                {truncateWords(description, 22)}
              </p>

              {/* Seller Info Section for List Variant */}
              {sellerId && (
                <div className="flex items-center gap-3 mt-2 py-2 border-t border-zinc-100">
                  <div className="shrink-0">
                    <ProfilePicture
                      src={sellerProfile?.profilePicture}
                      alt={sellerProfile?.username || 'Seller'}
                      name={sellerProfile?.username}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {sellerProfile?.username || 'Marketplace User'}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {formatMemberSince(sellerProfile?.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-blue-700 font-semibold">
                  {formatPriceDisplay(price)}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">{category}</span>
                {condition ? (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-600/15 text-emerald-700 px-2 py-0.5 text-xs">
                      {condition}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Actions */}
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    aria-label="Add to cart"
                    className="btn btn-primary gap-2 py-2"
                  >
                    <ShoppingCart strokeWidth={1.75} className="h-4 w-4" />
                    Add to cart
                  </button>
                  <button 
                    onClick={handleChatClick}
                    aria-label="Message seller"
                    className="btn btn-outline p-2.5"
                  >
                    <MessageSquare strokeWidth={1.75} className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={handleFavoriteClick}
                    aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
                    aria-pressed={isFavorited}
                    className="btn btn-outline p-2.5"
                  >
                    <Heart strokeWidth={1.75} className={clsx(
                      "h-4 w-4",
                      isFavorited && "fill-red-500 text-red-500"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </article>
      </Link>

      {/* Message Input Modal - Outside Link to avoid event propagation issues */}
      {currentUser && sellerId && (
        <MessageInputModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          onSubmit={handleSendMessage}
          listingTitle={title}
        />
      )}
    </>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <div className="aspect-[4/5] w-full animate-pulse rounded-xl bg-zinc-100" />
      <div className="mt-1 h-4 w-4/5 animate-pulse rounded bg-zinc-100" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
      <div className="h-5 w-1/4 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}

// Export memoized version for better performance
export default memo(ListingCard);
