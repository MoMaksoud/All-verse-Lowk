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
import { normalizeImageSrc } from '@/lib/image-utils';

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
  sold?: boolean;
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
  sold = false,
  inventory,
  onAddToCart,
  onChat,
  onFav,
}: Props) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return favorites.includes(id);
      } catch {
        return false;
      }
    }
    return false;
  });
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Seller profile state
  const [sellerProfile, setSellerProfile] = useState<{
    username?: string;
    profilePicture?: string;
    createdAt?: string;
  } | null>(null);

  // Fetch seller profile when sellerId is available - using useEffect (no render-phase updates)
  useEffect(() => {
    if (!sellerId) return;

    const fetchSellerProfile = async () => {
      try {
        const { apiGet } = await import('@/lib/api-client');
        const response = await apiGet(`/api/profile?userId=${sellerId}`, { 
          requireAuth: false 
        });
        
        if (response.ok) {
          const data = await response.json();
          setSellerProfile({
            username: data.data?.username || 'Marketplace User',
            profilePicture: data.data?.profilePicture || null,
            createdAt: data.data?.createdAt || null,
          });
        } else if (response.status === 404) {
          // Profile not found - expected behavior, use fallback
          setSellerProfile({
            username: 'Marketplace User',
            profilePicture: null,
            createdAt: null,
          });
        } else {
          // Set fallback on other errors
          setSellerProfile({
            username: 'Marketplace User',
            profilePicture: null,
            createdAt: null,
          });
        }
      } catch (error) {
        // Silently set fallback - fetch errors are expected
        setSellerProfile({
          username: 'Marketplace User',
          profilePicture: null,
          createdAt: null,
        });
      }
    };

    fetchSellerProfile();
  }, [sellerId]);

  // Helper function to format price with commas
  const formatPrice = (price: string | number): string => {
    if (typeof price === 'number') {
      return `$${price.toLocaleString()}`;
    }
    // If it's a string, try to parse it
    const numPrice = parseFloat(price.toString().replace(/[^0-9.-]+/g, ''));
    if (!isNaN(numPrice)) {
      return `$${numPrice.toLocaleString()}`;
    }
    return price.toString(); // Fallback to original if parsing fails
  };

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

    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const isCurrentlyFavorited = favorites.includes(id);
      
      let updatedFavorites;
      if (isCurrentlyFavorited) {
        updatedFavorites = favorites.filter((favId: string) => favId !== id);
        setIsFavorited(false);
        showSuccess('Removed from favorites');
      } else {
        updatedFavorites = [...favorites, id];
        setIsFavorited(true);
        showSuccess('Added to favorites');
      }
      
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      onFav?.();
    } catch (error) {
      console.error('Error updating favorites:', error);
      showError('Failed to update favorites');
    }
  }, [currentUser, id, showSuccess, showError, onFav]);

  const listingImageSrc =
    normalizeImageSrc(imageUrl || '') || '/default-avatar.png';

  return (
    <>
      <Link href={`/listings/${id}`} className="block">
        <article
        className={clsx(
          "rounded-3xl border border-white/10 bg-[#0B1220] shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
          variant === "grid" ? "overflow-hidden" : "p-4 md:p-5"
        )}
      >
        {variant === "grid" ? (
          <div className="flex flex-col h-full">
            {/* Image */}
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#0E1526] relative">
              {(() => {
                return (
                  <Image
                    src={listingImageSrc}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                );
              })()}
            </div>

            {/* Content */}
            <div className="p-2 sm:p-3 lg:p-4 space-y-1 sm:space-y-2 flex-1 flex flex-col">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-zinc-100 line-clamp-2">
                {title}
              </h3>
              <p className="hidden sm:block text-xs sm:text-sm text-zinc-300/90 flex-1">
                {truncateWords(description, 22)}
              </p>

              {/* Seller Info Section */}
              {sellerId && (
                <div className="flex items-center gap-2 sm:gap-3 py-2 border-t border-white/5 mt-1">
                  <div className="shrink-0">
                    <ProfilePicture
                      src={sellerProfile?.profilePicture}
                      alt={sellerProfile?.username || 'Seller'}
                      name={sellerProfile?.username}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
                      {sellerProfile?.username || 'Marketplace User'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatMemberSince(sellerProfile?.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <span className="text-blue-400 font-semibold">
                  {formatPrice(price)}
                </span>
                <span className="hidden sm:inline text-zinc-400">•</span>
                <span className="hidden sm:inline text-zinc-300/90 text-xs truncate">{category}</span>
                {condition ? (
                  <>
                    <span className="hidden lg:inline text-zinc-400">•</span>
                    <span className="hidden lg:inline-flex items-center rounded-full bg-emerald-600/15 text-emerald-300 px-2 py-0.5 text-xs">
                      {condition}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Actions */}
              <div className="mt-2 sm:mt-3">
                {sold || inventory === 0 ? (
                  <div className="flex items-center justify-center rounded-xl sm:rounded-2xl border border-red-500/30 bg-red-500/10 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3">
                    <span className="text-sm sm:text-base font-semibold text-red-400">SOLD</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-[#0E1526] px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3">
                    <button 
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="p-1 sm:p-1.5 lg:p-2 hover:opacity-80 disabled:opacity-50"
                    >
                      <ShoppingCart className="h-4 w-4 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-zinc-200" />
                    </button>
                    <button 
                      onClick={handleChatClick}
                      className="p-1 sm:p-1.5 lg:p-2 hover:opacity-80"
                    >
                      <MessageSquare className="h-4 w-4 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-zinc-200" />
                    </button>
                    <button 
                      onClick={handleFavoriteClick}
                      className={clsx(
                        "p-1 sm:p-1.5 lg:p-2 hover:opacity-80",
                        isFavorited ? "text-red-500" : "text-zinc-200"
                      )}
                    >
                      <Heart className={clsx(
                        "h-4 w-4 sm:h-4 sm:w-4 lg:h-5 lg:w-5",
                        isFavorited ? "fill-current" : ""
                      )} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // list variant
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-5">
            {/* Image */}
            <div className="w-full sm:w-32 md:w-44 lg:w-56 shrink-0">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#0E1526] relative">
                {(() => {
                  return (
                    <Image
                      src={listingImageSrc}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                    />
                  );
                })()}
              </div>
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-zinc-100 line-clamp-2 break-words">
                {title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-zinc-300/90 break-words">
                {truncateWords(description, 22)}
              </p>

              {/* Seller Info Section for List Variant */}
              {sellerId && (
                <div className="flex items-center gap-3 mt-2 py-2 border-t border-white/5">
                  <div className="shrink-0">
                    <ProfilePicture
                      src={sellerProfile?.profilePicture}
                      alt={sellerProfile?.username || 'Seller'}
                      name={sellerProfile?.username}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {sellerProfile?.username || 'Marketplace User'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatMemberSince(sellerProfile?.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-blue-400 font-semibold">
                  {formatPrice(price)}
                </span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-300/90">{category}</span>
                {condition ? (
                  <>
                    <span className="text-zinc-400">•</span>
                    <span className="inline-flex items-center rounded-full bg-emerald-600/15 text-emerald-300 px-2 py-0.5 text-xs">
                      {condition}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Actions */}
              <div className="mt-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0E1526] px-4 py-3">
                  <button 
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="p-2 hover:opacity-80 disabled:opacity-50"
                  >
                    <ShoppingCart className="h-5 w-5 text-zinc-200" />
                  </button>
                  <button 
                    onClick={handleChatClick}
                    className="p-2 hover:opacity-80"
                  >
                    <MessageSquare className="h-5 w-5 text-zinc-200" />
                  </button>
                  <button 
                    onClick={handleFavoriteClick}
                    className={clsx(
                      "p-2 hover:opacity-80",
                      isFavorited ? "text-red-500" : "text-zinc-200"
                    )}
                  >
                    <Heart className={clsx(
                      "h-5 w-5",
                      isFavorited ? "fill-current" : ""
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

// Export memoized version for better performance
export default memo(ListingCard);