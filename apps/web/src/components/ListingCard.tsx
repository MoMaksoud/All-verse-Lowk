"use client";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, MessageSquare, Heart } from "lucide-react";
import clsx from "clsx";
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';

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
  onAddToCart?: () => void;
  onChat?: () => void;
  onFav?: () => void;
};

export default function ListingCard({
  variant,
  id,
  title,
  description,
  price,
  category,
  condition,
  imageUrl,
  sellerId,
  onAddToCart,
  onChat,
  onFav,
}: Props) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();
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

    try {
      await startChat({
        listingId: id,
        sellerId: sellerId,
        listingTitle: title,
        listingPrice: typeof price === 'number' ? price : parseFloat(price.toString().replace(/[^0-9.-]+/g, '')),
      });
      onChat?.();
    } catch (error) {
      console.error('Error starting chat:', error);
      showError('Failed to start conversation');
    }
  }, [currentUser, sellerId, id, title, price, startChat, showError, onChat]);

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

  return (
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
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#0E1526]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={title}
                  width={800}
                  height={800}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs">
                  No Image
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-2 sm:p-3 lg:p-4 space-y-1 sm:space-y-2 flex-1 flex flex-col">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-zinc-100 line-clamp-2">
                {title}
              </h3>
              <p className="hidden sm:block text-xs sm:text-sm text-zinc-300/90 line-clamp-2 flex-1">
                {description}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <span className="text-blue-400 font-semibold">
                  {typeof price === "number" ? `$${price}` : price}
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
              </div>
            </div>
          </div>
        ) : (
          // list variant
          <div className="flex gap-4 md:gap-5">
            {/* Image */}
            <div className="w-44 md:w-56 shrink-0">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#0E1526]">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={title}
                    width={800}
                    height={450}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                    No Image
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-xl font-semibold text-zinc-100 line-clamp-2">
                {title}
              </h3>
              <p className="mt-1 text-sm text-zinc-300/90 line-clamp-3">
                {description}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-blue-400 font-semibold">
                  {typeof price === "number" ? `$${price}` : price}
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
  );
}