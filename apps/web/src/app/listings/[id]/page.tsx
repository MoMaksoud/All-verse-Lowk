'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Heart, MessageCircle, ChevronRight, ShieldCheck, Sparkles, Pencil, Trash2,
  ShoppingBag, Check, PackageX, Loader2,
} from 'lucide-react';
import { SimpleListing } from '@marketplace/types';

import ListingCard, { ListingCardSkeleton } from '@/components/ListingCard';
import { ProfilePicture } from '@/components/ProfilePicture';
import { loadFavoriteIds, setFavorite } from '@/lib/favorites';
import ShareMenu from '@/components/ShareMenu';
import { ListingGallery } from '@/components/ListingGallery';
import { MessageInputModal } from '@/components/MessageInputModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useStartChatFromListing } from '@/lib/messaging';
import { formatPrice } from '@/lib/format';
import { categoryLabel } from '@/lib/categories';

type Seller = { username: string; profilePicture: string | null; createdAt: unknown };

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// createdAt may be a Firestore Timestamp, ISO string or Date
const memberSince = (value: unknown) => {
  const v = value as { toDate?: () => Date } | string | Date | null | undefined;
  const date = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : v?.toDate?.();
  if (!date || isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
};

const stripMarkdown = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .trim();

const conditionLabel = (c?: string) => (c ? c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ') : null);

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const { startChat } = useStartChatFromListing();

  const [listing, setListing] = useState<SimpleListing | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [similar, setSimilar] = useState<SimpleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [isFavorited, setIsFavorited] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cartState, setCartState] = useState<'idle' | 'adding' | 'added'>('idle');
  const [priceCheck, setPriceCheck] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; text?: string }>({ status: 'idle' });

  const isOwner = !!currentUser?.uid && currentUser.uid === listing?.sellerId;
  const isSold = listing?.sold === true || listing?.inventory === 0;

  useEffect(() => {
    if (!currentUser || !params.id) return;
    loadFavoriteIds().then((ids) => setIsFavorited(ids.has(params.id as string)));
  }, [currentUser, params.id]);

  const fetchData = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setPageError(null);

    try {
      const { apiGet } = await import('@/lib/api-client');

      const listingRes = await apiGet(`/api/listings/${params.id}`, { requireAuth: false });
      if (!listingRes.ok) {
        if (listingRes.status === 404) throw new Error('not-found');
        const errorData = await listingRes.json().catch(() => ({}));
        throw new Error(errorData?.message || errorData?.error || 'We couldn’t load this listing.');
      }
      const raw = await listingRes.json();
      const listingData: SimpleListing = raw?.data || raw;
      if (!listingData?.id) throw new Error('not-found');

      const [sellerRes, similarRes] = await Promise.all([
        apiGet(`/api/profile?userId=${listingData.sellerId}`, { requireAuth: false }),
        apiGet(`/api/listings?category=${encodeURIComponent(listingData.category)}&limit=6`, { requireAuth: false }),
      ]);

      const sd = sellerRes.ok ? await sellerRes.json() : null;
      const simd = similarRes.ok ? await similarRes.json() : null;
      const items: SimpleListing[] = simd?.data ?? simd?.items ?? (Array.isArray(simd) ? simd : []);

      setListing(listingData);
      setSeller({
        username: sd?.data?.username || 'AllVerse seller',
        profilePicture: sd?.data?.profilePicture || null,
        createdAt: sd?.data?.createdAt ?? null,
      });
      setSimilar(items.filter((l) => l.id !== listingData.id && !l.sold).slice(0, 4));
    } catch (error) {
      console.error('Error fetching listing:', error);
      setListing(null);
      setPageError(error instanceof Error ? error.message : 'We couldn’t load this listing.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFavorite = async () => {
    if (!listing) return;
    if (!currentUser) {
      showError('Sign in to save items');
      return;
    }
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      await setFavorite(listing.id, next);
    } catch {
      setIsFavorited(!next);
      showError('Couldn’t update saved items');
    }
  };

  const openMessage = () => {
    if (!currentUser) {
      router.push(`/signin?redirect=/listings/${listing?.id}`);
      return;
    }
    setShowMessageModal(true);
  };

  const sendMessage = async (text: string) => {
    if (!listing?.sellerId) {
      showError('Unable to find seller information.');
      return;
    }
    try {
      await startChat({
        listingId: listing.id,
        sellerId: listing.sellerId,
        listingTitle: listing.title,
        listingPrice: listing.price,
        initialMessage: text,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Message not sent', 'Please try again.');
      throw error;
    }
  };

  const addToCart = async () => {
    if (!listing || cartState === 'adding') return;
    if (!currentUser) {
      router.push(`/signin?redirect=/listings/${listing.id}`);
      return;
    }
    setCartState('adding');
    try {
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/carts', {
        listingId: listing.id,
        sellerId: listing.sellerId,
        qty: 1,
        priceAtAdd: listing.price,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Couldn’t add to cart');
      }
      setCartState('added');
    } catch (error) {
      setCartState('idle');
      showError(error instanceof Error ? error.message : 'Couldn’t add to cart');
    }
  };

  const runPriceCheck = async () => {
    if (!listing) return;
    setPriceCheck({ status: 'loading' });
    try {
      const { apiPost } = await import('@/lib/api-client');
      const response = await apiPost('/api/prices/suggest', {
        title: listing.title,
        description: listing.description,
        category: listing.category,
        condition: listing.condition || 'good',
        currentPrice: listing.price,
      }, { requireAuth: false });
      const data = await response.json().catch(() => ({}));
      // 'fallback' is a canned guess from the API when Gemini is unreachable; don't present it as an AI price
      if (!response.ok || !data.suggestion || data.source === 'fallback') throw new Error();
      setPriceCheck({ status: 'done', text: stripMarkdown(data.suggestion) });
    } catch {
      setPriceCheck({ status: 'error' });
    }
  };

  const deleteListing = async () => {
    if (!listing) return;
    setDeleting(true);
    try {
      const { apiDelete } = await import('@/lib/api-client');
      const response = await apiDelete(`/api/listings/${listing.id}`);
      if (!response.ok) throw new Error();
      showSuccess('Listing deleted');
      router.push('/my-listings');
    } catch {
      showError('Couldn’t delete listing');
      setDeleting(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (!listing) {
    const notFound = pageError === 'not-found';
    return (
      <div className="mx-auto flex min-h-[70dvh] w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md">
          <PackageX strokeWidth={1.5} className="h-10 w-10 text-zinc-400" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
            {notFound ? 'This listing is gone' : 'Something went wrong'}
          </h1>
          <p className="mt-2 text-zinc-600">
            {notFound ? 'It may have sold or been removed by the seller.' : pageError}
          </p>
          <div className="mt-6 flex gap-3">
            {!notFound && <button onClick={fetchData} className="btn btn-primary">Try again</button>}
            <Link href="/listings" className={notFound ? 'btn btn-primary' : 'btn btn-outline'}>Browse marketplace</Link>
          </div>
        </div>
      </div>
    );
  }

  const since = memberSince(seller?.createdAt);
  const listed = formatRelativeTime(listing.createdAt);
  const details = [
    ['Condition', conditionLabel(listing.condition)],
    ['Category', categoryLabel(listing.category)],
    ['Listed', listed],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-500">
          <Link href="/listings" className="shrink-0 hover:text-zinc-900">Marketplace</Link>
          <ChevronRight aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
          <Link href={`/listings?category=${listing.category}`} className="shrink-0 hover:text-zinc-900">
            {categoryLabel(listing.category)}
          </Link>
          <ChevronRight aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-zinc-900">{listing.title}</span>
        </nav>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          {/* Left: photos + description */}
          <div className="min-w-0">
            <ListingGallery photos={listing.photos || []} title={listing.title} />

            <section className="mt-10 hidden lg:block">
              <Description listing={listing} details={details} />
            </section>
          </div>

          {/* Right: buy box */}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-950 md:text-3xl">
                {listing.title}
              </h1>
              <div className="flex shrink-0 items-center gap-1">
                <ShareMenu listing={listing} align="right" />
                {!isOwner && (
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-pressed={isFavorited}
                    aria-label={isFavorited ? 'Remove from saved' : 'Save item'}
                    className="grid h-10 w-10 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 active:scale-95"
                  >
                    <Heart strokeWidth={1.75} className={clsx('h-5 w-5', isFavorited && 'fill-red-500 text-red-500')} />
                  </button>
                )}
              </div>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              {[conditionLabel(listing.condition), listed && `Listed ${listed}`].filter(Boolean).join(' · ')}
            </p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums text-zinc-950">{formatPrice(listing.price)}</span>
              {isSold && (
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-600">
                  {listing.soldThroughAllVerse ? 'Sold on AllVerse' : 'Sold'}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {isOwner ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link href={`/listings/${listing.id}/edit`} className="btn btn-primary gap-2">
                    <Pencil strokeWidth={1.75} className="h-4 w-4" /> Edit listing
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn-outline gap-2 text-red-600 hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 strokeWidth={1.75} className="h-4 w-4" /> Delete
                  </button>
                </div>
              ) : isSold ? (
                <Link href={`/listings?category=${listing.category}`} className="btn btn-outline w-full">
                  See similar items for sale
                </Link>
              ) : (
                <>
                  {cartState === 'added' ? (
                    <Link href="/cart" className="btn btn-primary w-full gap-2 py-3">
                      <Check strokeWidth={2} className="h-4 w-4" /> Added. View cart
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={addToCart}
                      disabled={cartState === 'adding'}
                      className="btn btn-primary w-full gap-2 py-3"
                    >
                      {cartState === 'adding'
                        ? <Loader2 strokeWidth={2} className="h-4 w-4 animate-spin" />
                        : <ShoppingBag strokeWidth={1.75} className="h-4 w-4" />}
                      Add to cart
                    </button>
                  )}
                  <button type="button" onClick={openMessage} className="btn btn-outline w-full gap-2 py-3">
                    <MessageCircle strokeWidth={1.75} className="h-4 w-4" /> Message seller
                  </button>
                </>
              )}
            </div>

            {!isSold && !isOwner && (
              <p className="mt-4 flex gap-2.5 text-sm text-zinc-600">
                <ShieldCheck strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                Checkout is handled by Stripe. AllVerse never sees your card number.
              </p>
            )}

            {/* AI price check */}
            <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-700">
                <Sparkles strokeWidth={1.75} className="h-4 w-4" />
                AI price check
              </div>
              {priceCheck.status === 'idle' && (
                <>
                  <p className="mt-2 text-sm text-zinc-600">
                    {isOwner
                      ? 'Compare your asking price with recent sales on AllVerse and eBay.'
                      : 'Is this a fair price? Compare it with recent sales on AllVerse and eBay.'}
                  </p>
                  <button type="button" onClick={runPriceCheck} className="btn btn-outline mt-4 bg-white py-2">
                    Check the price
                  </button>
                </>
              )}
              {priceCheck.status === 'loading' && (
                <div className="mt-3 space-y-2" aria-live="polite">
                  <span className="sr-only">Checking recent sales</span>
                  <div className="h-3.5 w-full animate-pulse rounded bg-zinc-200" />
                  <div className="h-3.5 w-11/12 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-zinc-200" />
                </div>
              )}
              {priceCheck.status === 'done' && (
                <p className="mt-3 animate-fade-in whitespace-pre-line text-sm leading-relaxed text-zinc-800" aria-live="polite">
                  {priceCheck.text}
                </p>
              )}
              {priceCheck.status === 'error' && (
                <div className="mt-2 text-sm" role="alert">
                  <p className="text-red-600">AI pricing isn’t available right now.</p>
                  <button type="button" onClick={runPriceCheck} className="mt-2 font-medium text-primary-700 underline-offset-4 hover:underline">
                    Try again
                  </button>
                </div>
              )}
            </section>

            {/* Seller */}
            {!isOwner && (
              <Link
                href={`/profile/${listing.sellerId}`}
                className="group mt-8 flex items-center gap-4 border-t border-zinc-200 pt-6"
              >
                <ProfilePicture src={seller?.profilePicture} alt={seller?.username || 'Seller'} name={seller?.username} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-950 group-hover:text-primary-700">{seller?.username}</p>
                  {since && <p className="text-sm text-zinc-500">On AllVerse since {since}</p>}
                </div>
                <ChevronRight strokeWidth={1.75} className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5" />
              </Link>
            )}

            <section className="mt-10 lg:hidden">
              <Description listing={listing} details={details} />
            </section>
          </div>
        </div>

        {/* Similar items */}
        {similar.length > 0 && (
          <section className="mt-20 border-t border-zinc-200 pt-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">More in {categoryLabel(listing.category)}</h2>
              <Link href={`/listings?category=${listing.category}`} className="text-sm font-medium text-primary-700 hover:underline">
                See all
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 lg:gap-x-6">
              {similar.map((s, i) => (
                <div key={s.id} className="reveal" style={{ '--i': i } as React.CSSProperties}>
                  <ListingCard
                    variant="grid"
                    id={s.id}
                    title={s.title}
                    description={s.description ?? ''}
                    price={s.price}
                    category={s.category ?? ''}
                    condition={s.condition}
                    imageUrl={s.photos?.[0] ?? null}
                    sellerId={s.sellerId}
                    sold={s.sold}
                    soldThroughAllVerse={s.soldThroughAllVerse}
                    inventory={s.inventory}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <MessageInputModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onSubmit={sendMessage}
        listingTitle={listing.title}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={deleteListing}
        title="Delete this listing?"
        message="Buyers will no longer be able to find it. This can’t be undone."
        confirmText="Delete listing"
        type="danger"
        isLoading={deleting}
      />
    </div>
  );
}

function Description({ listing, details }: { listing: SimpleListing; details: [string, string][] }) {
  return (
    <>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">About this item</h2>
      <p className="mt-3 max-w-[65ch] whitespace-pre-line leading-relaxed text-zinc-700">
        {listing.description || 'The seller didn’t add a description.'}
      </p>
      {details.length > 0 && (
        <dl className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200 text-sm">
          {details.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8rem_1fr] py-3">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="text-zinc-900">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8" aria-busy="true">
      <div className="h-4 w-64 max-w-full animate-pulse rounded bg-zinc-100" />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-zinc-100" />
        <div className="space-y-4">
          <div className="h-8 w-4/5 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
          <div className="h-9 w-1/4 animate-pulse rounded bg-zinc-100" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-32 w-full animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      </div>
      <div className="mt-20 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
