'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Prevent static generation - this page requires authentication
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { AlertCircle, HelpCircle, ImageOff, Sparkles, X } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';
import { AIListingAssistant } from '@/components/AIListingAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { SellListingStepper } from '@/app/sell/components/SellListingStepper';
import { buildSellListingPayload } from '@/app/sell/mapListingSubmit';
import { isCloudUrl } from '@/types/photos';
import { formatPrice } from '@/lib/format';
import { CATEGORIES, CONDITIONS, categoryLabel } from '@/lib/categories';

type Stage = 'photos' | 'analyzing' | 'questions' | 'details';
const STEPS = ['Photos', 'AI draft', 'Review & publish'];
const STEP_OF: Record<Stage, number> = { photos: 0, analyzing: 1, questions: 1, details: 2 };

// What buyers are paying for comparable items, from either AI endpoint.
type Market = { price: number; min: number; max: number; count: number; demand?: string; note?: string };

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  condition: '',
  price: '',
  shipping: { weight: '', length: '', width: '', height: '' },
};

const AI_STEPS = ['Identifying the item', 'Writing the title and description', 'Checking what similar items sell for'];

const AI_HELP = [
  ['Identifies the item', 'Brand, model and details, read from the photos and labels.'],
  ['Writes the listing', 'A clear title and a description buyers can trust.'],
  ['Suggests a price', 'Based on what similar listings are going for.'],
];

const isCategory = (v?: string) => CATEGORIES.some((c) => c.id === v);
const isCondition = (v?: string) => CONDITIONS.some((c) => c.id === v);

function marketFromResearch(r: any): Market | null {
  if (!r) return null;
  return {
    price: r.averagePrice || 0,
    min: r.priceRange?.min || 0,
    max: r.priceRange?.max || 0,
    count: r.comparableCount ?? r.competitorCount ?? 0,
    demand: r.marketDemand,
    note: r.notes,
  };
}

export default function SellPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();

  const [stage, setStage] = useState<Stage>('photos');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [listingId, setListingId] = useState<string>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [initialEvidence, setInitialEvidence] = useState<any>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [market, setMarket] = useState<Market | null>(null);
  const [pricing, setPricing] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !currentUser) router.push('/signin?redirect=/sell&reason=sell');
  }, [authLoading, currentUser, router]);

  // Temporary id so photos can upload before the listing exists
  useEffect(() => {
    if (!listingId && currentUser?.uid) setListingId(`temp-${currentUser.uid}-${Date.now()}`);
  }, [currentUser, listingId]);

  const handlePhotoChange = useCallback((urls: string[]) => {
    setPhotoUrls(urls);
    setErrors((e) => ({ ...e, photos: '' }));
  }, []);

  const setField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: '' }));
  };

  const applyAnalysis = (a: any) => {
    setForm((f) => ({
      ...f,
      title: a.title || f.title,
      description: a.description || f.description,
      category: isCategory(a.category) ? a.category : f.category,
      condition: isCondition(a.condition) ? a.condition : f.condition,
      price: a.suggestedPrice > 0 ? String(a.suggestedPrice) : f.price,
    }));
    setMarket(marketFromResearch(a.marketResearch));
  };

  const analyze = async () => {
    if (!photoUrls.length) {
      setErrors({ photos: 'Add at least one photo.' });
      return;
    }
    setAiNotice(null);
    setStage('analyzing');
    try {
      const { apiPost } = await import('@/lib/api-client');
      const res = await apiPost('/api/ai/analyze-product', { imageUrls: photoUrls });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.analysis) throw new Error();

      const a = data.analysis;
      setAnalysis(a);
      setInitialEvidence(
        a._evidence || { brand: a.brand, model: a.model, product_type: a.category, visible_features: a.features }
      );
      applyAnalysis(a);
      setStage(a.missingInfo?.length ? 'questions' : 'details');
    } catch {
      setAiNotice('The AI couldn’t read these photos right now. You can fill in the details yourself.');
      setStage('details');
    }
  };

  const finishWithAnswers = async (answers?: Record<string, { question: string; answer: string }>) => {
    if (!answers || !Object.keys(answers).length || !initialEvidence) {
      setStage('details');
      return;
    }
    setStage('analyzing');
    try {
      const { apiPost } = await import('@/lib/api-client');
      const res = await apiPost('/api/ai/analyze-product', {
        imageUrls: photoUrls,
        phase: 'final',
        userAnswers: answers,
        initialEvidence,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.analysis) throw new Error();
      setAnalysis(data.analysis);
      applyAnalysis(data.analysis);
    } catch {
      setAiNotice('The AI couldn’t finish the listing, so you’re seeing its first draft. Check each field before publishing.');
    }
    setStage('details');
  };

  const skipQuestions = useCallback(() => setStage('details'), []);

  const checkPrice = async () => {
    if (!form.title.trim() || !form.category) {
      setErrors((e) => ({ ...e, price: 'Add a title and category first so the AI knows what to compare.' }));
      return;
    }
    setPricing('loading');
    try {
      const { apiPost } = await import('@/lib/api-client');
      const res = await apiPost(
        '/api/ai/market-analysis',
        {
          title: form.title,
          description: form.description,
          category: form.category,
          condition: form.condition,
          brand: analysis?.brand,
          model: analysis?.model,
        },
        { requireAuth: false }
      );
      const data = await res.json().catch(() => ({}));
      const m = data?.data?.marketAnalysis;
      if (!res.ok || !m) throw new Error();
      setMarket({
        price: m.suggestedPrice || 0,
        min: m.priceRange?.min || 0,
        max: m.priceRange?.max || 0,
        count: m.competitorCount || 0,
        demand: m.marketDemand,
        note: typeof data.data.reasoning?.priceJustification === 'string' ? data.data.reasoning.priceJustification : undefined,
      });
      setPricing('idle');
    } catch {
      setPricing('error');
    }
  };

  const publish = async () => {
    if (!currentUser) return;
    const next: Record<string, string> = {};
    if (!photoUrls.length || !photoUrls.every(isCloudUrl)) next.photos = 'Add at least one photo.';
    if (!form.title.trim()) next.title = 'Add a title.';
    if (!form.description.trim()) next.description = 'Add a description.';
    if (!form.category) next.category = 'Pick a category.';
    if (!form.condition) next.condition = 'Pick a condition.';
    if (!(parseFloat(form.price) > 0)) next.price = 'Enter a price above $0.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setPublishing(true);
    try {
      const payload = buildSellListingPayload({
        formData: form,
        photoUrls,
        sellerId: currentUser.uid,
        aiAnalysis: analysis,
        initialEvidence,
      });
      const { apiPost } = await import('@/lib/api-client');
      const res = await apiPost('/api/listings', payload);
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/listings/${id}`);
    } catch {
      setErrors({ submit: 'Couldn’t publish the listing. Check your connection and try again.' });
      setPublishing(false);
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="mx-auto min-h-[70dvh] w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8" aria-busy>
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-zinc-100" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-80 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      </div>
    );
  }

  const price = parseFloat(form.price);
  const outOfRange =
    market && market.max > market.min && price > 0 && (price < market.min ? 'below' : price > market.max ? 'above' : null);
  const editing = stage === 'photos' || stage === 'details';

  return (
    <div className="mx-auto min-h-[70dvh] w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Sell an item</h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base">
            Add photos. The AI writes the listing and suggests a price, and you review it.{' '}
            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              aria-expanded={helpOpen}
              aria-controls="ai-help"
              className="inline-flex items-center gap-1 font-medium text-primary-700 hover:text-primary-800"
            >
              <HelpCircle strokeWidth={1.75} className="h-4 w-4" />
              How the AI works
            </button>
          </p>
        </div>
        <SellListingStepper steps={STEPS} current={STEP_OF[stage]} />
      </header>

      {helpOpen && (
        <div id="ai-help" className="mt-6 animate-fade-in rounded-2xl bg-primary-50/70 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <Sparkles strokeWidth={1.75} className="h-4 w-4 text-primary-600" />
              How the AI works
            </p>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              aria-label="Close help"
              className="-m-1.5 grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-primary-100 hover:text-zinc-900"
            >
              <X strokeWidth={1.75} className="h-4 w-4" />
            </button>
          </div>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {AI_HELP.map(([title, body], i) => (
              <li key={title} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold tabular-nums text-primary-700">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-zinc-950">{title}</p>
                  <p className="mt-0.5 text-zinc-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-zinc-500">Nothing goes live until you press Publish, and you can edit everything first.</p>
        </div>
      )}

      <div
        className={clsx(
          'mt-8 grid items-start gap-x-8 gap-y-6',
          stage === 'details' && 'lg:grid-cols-[minmax(0,1fr)_22rem]'
        )}
      >
        <div className="min-w-0 space-y-6">
          {stage === 'details' && aiNotice && (
            <p role="status" className="flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {aiNotice}{' '}
                {photoUrls.length > 0 && (
                  <button type="button" onClick={analyze} className="font-medium underline underline-offset-2">
                    Try the AI again
                  </button>
                )}
              </span>
            </p>
          )}

          {/* Kept mounted (hidden while the AI works) so uploads survive stage changes. */}
          <Section
            title="Photos"
            description={
              stage === 'photos'
                ? 'Up to 6. The first one is the cover. A clear shot of any label or model number helps the AI most.'
                : 'The first photo is the cover.'
            }
            className={clsx(!editing && 'hidden')}
            footer={
              stage === 'photos' && (
                <>
                  <button type="button" onClick={() => setStage('details')} className="btn btn-ghost">
                    I’ll write it myself
                  </button>
                  <button type="button" onClick={analyze} disabled={!photoUrls.length} className="btn btn-primary gap-2 px-5">
                    <Sparkles strokeWidth={1.75} className="h-4 w-4" />
                    Write my listing
                  </button>
                </>
              )
            }
          >
            <PhotoUpload uid={currentUser.uid} listingId={listingId || ''} max={6} onChange={handlePhotoChange} />
            {errors.photos && <p className="mt-2 text-sm text-red-700">{errors.photos}</p>}
          </Section>

          {stage === 'analyzing' && (
            <Section title="Drafting your listing" description="This usually takes a few seconds.">
              <ul className="divide-y divide-zinc-100" aria-busy aria-live="polite">
                {AI_STEPS.map((label, i) => (
                  <li key={label} className="reveal flex items-center gap-3 py-3" style={{ '--i': i * 2 } as React.CSSProperties}>
                    <span
                      className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-600"
                      style={{ animationDelay: `${i * 300}ms` }}
                    />
                    <span className="text-sm text-zinc-700">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-3">
                <div className="h-11 animate-pulse rounded-xl bg-zinc-100" />
                <div className="h-28 animate-pulse rounded-xl bg-zinc-100" />
              </div>
            </Section>
          )}

          {stage === 'questions' && analysis && (
            <Section>
              <AIListingAssistant
                initialAnalysis={{
                  title: form.title,
                  description: form.description,
                  category: form.category,
                  condition: form.condition,
                  suggestedPrice: price || 0,
                  missingInfo: analysis.missingInfo || [],
                  questions: analysis.questions,
                }}
                onComplete={finishWithAnswers}
                onSkip={skipQuestions}
              />
            </Section>
          )}

          {stage === 'details' && (
            <>
              <Section
                title="Details"
                description={
                  analysis && !aiNotice ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles strokeWidth={1.75} className="h-3.5 w-3.5 text-primary-600" />
                      Drafted by AI from your photos. Read it over before publishing.
                    </span>
                  ) : (
                    'What buyers see first.'
                  )
                }
              >
                <div className="space-y-5">
                  <Field label="Title" error={errors.title} htmlFor="title">
                    <input
                      id="title"
                      value={form.title}
                      onChange={(e) => setField('title', e.target.value)}
                      placeholder="Brand, model and what it is"
                      maxLength={120}
                      className={clsx('input', errors.title && 'border-red-500')}
                    />
                  </Field>

                  <Field label="Description" error={errors.description} htmlFor="description">
                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Condition, what’s included, any wear or flaws"
                      rows={5}
                      className={clsx('input resize-y', errors.description && 'border-red-500')}
                    />
                  </Field>

                  <Field label="Category" error={errors.category} htmlFor="category">
                    <select
                      id="category"
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                      className={clsx('input', !form.category && 'text-zinc-500', errors.category && 'border-red-500')}
                    >
                      <option value="" disabled>
                        Choose a category
                      </option>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Condition" error={errors.condition}>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Condition">
                      {CONDITIONS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={form.condition === c.id}
                          onClick={() => setField('condition', c.id)}
                          className={clsx(
                            'rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.98]',
                            form.condition === c.id
                              ? 'border-primary-600 bg-primary-600 text-white'
                              : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500'
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </Section>

              <Section title="Price" description="Set your own, or have the AI compare similar listings.">
                <div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
                  <Field label="Your price" error={errors.price} htmlFor="price">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                        $
                      </span>
                      <input
                        id="price"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setField('price', e.target.value)}
                        placeholder="0.00"
                        className={clsx('input pl-8 tabular-nums', errors.price && 'border-red-500')}
                      />
                    </div>
                  </Field>

                  <PriceCheck
                    market={market}
                    pricing={pricing}
                    price={price}
                    outOfRange={outOfRange || null}
                    onCheck={checkPrice}
                    onUse={(p) => setField('price', String(p))}
                  />
                </div>
              </Section>

              <Section title="Shipping" description="Optional. With the package size, buyers see exact shipping rates at checkout.">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {(
                    [
                      ['weight', 'Weight (lb)'],
                      ['length', 'Length (in)'],
                      ['width', 'Width (in)'],
                      ['height', 'Height (in)'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex flex-col gap-2 text-sm font-medium text-zinc-950">
                      {label}
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        value={form.shipping[key]}
                        onChange={(e) => setForm((f) => ({ ...f, shipping: { ...f.shipping, [key]: e.target.value } }))}
                        className="input font-normal tabular-nums"
                      />
                    </label>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>

        {stage === 'details' && (
          <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <CoverPreview src={photoUrls[0]} />
              <div className="p-4">
                <p className={clsx('line-clamp-2 font-medium', form.title ? 'text-zinc-950' : 'text-zinc-400')}>
                  {form.title || 'Your title'}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {[CONDITIONS.find((c) => c.id === form.condition)?.label, categoryLabel(form.category)]
                    .filter(Boolean)
                    .join(' · ') || 'Condition · Category'}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-950">{price > 0 ? formatPrice(price) : '$—'}</p>
              </div>
            </div>
          </aside>
        )}

        {stage === 'details' && (
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="text-sm text-zinc-600">
              {errors.submit ? (
                <p role="alert" className="flex gap-2 text-red-800">
                  <AlertCircle strokeWidth={1.75} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errors.submit}</span>
                </p>
              ) : (
                <p className="max-w-md">
                  Listing is free. When it sells, AllVerse keeps 4.5% of the item price and the rest goes to your
                  connected Stripe account.
                </p>
              )}
            </div>
            <button type="button" onClick={publish} disabled={publishing} className="btn btn-primary shrink-0 px-6 py-3">
              {publishing ? 'Publishing…' : 'Publish listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  footer,
  className,
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx('rounded-2xl border border-zinc-200 bg-white', className)}>
      <div className="p-5 sm:p-6">
        {title && <h2 className="text-base font-semibold text-zinc-950">{title}</h2>}
        {description && <p className="mt-1 text-sm text-zinc-600">{description}</p>}
        <div className={clsx(title && 'mt-5')}>{children}</div>
      </div>
      {footer && (
        <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}

function PriceCheck({
  market,
  pricing,
  price,
  outOfRange,
  onCheck,
  onUse,
}: {
  market: Market | null;
  pricing: 'idle' | 'loading' | 'error';
  price: number;
  outOfRange: 'below' | 'above' | null;
  onCheck: () => void;
  onUse: (price: number) => void;
}) {
  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4 sm:mt-7">
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          <Sparkles strokeWidth={1.75} className="h-4 w-4 text-primary-600" />
          AI price check
        </p>
        {pricing !== 'loading' && (
          <button type="button" onClick={onCheck} className="text-sm font-medium text-primary-700 hover:text-primary-800">
            {market ? 'Check again' : 'Check price'}
          </button>
        )}
      </div>

      {pricing === 'loading' ? (
        <div className="mt-3 space-y-2" aria-busy>
          <div className="h-7 w-32 animate-pulse rounded bg-primary-100" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-primary-100" />
        </div>
      ) : pricing === 'error' ? (
        <p className="mt-2 text-sm text-zinc-700">Couldn’t check prices right now. Try again in a moment.</p>
      ) : market && market.price > 0 ? (
        <div className="mt-2 animate-fade-in">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-950">
            {formatPrice(market.price)}
            <span className="ml-2 text-sm font-normal text-zinc-600">suggested</span>
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {market.max > market.min ? (
              <>
                Similar items go for{' '}
                <span className="tabular-nums">
                  {formatPrice(market.min)} to {formatPrice(market.max)}
                </span>
                {market.count > 0 && ` across ${market.count} comparable listings`}.
              </>
            ) : (
              market.count > 0 && `Based on ${market.count} comparable listing${market.count === 1 ? '' : 's'}.`
            )}
            {market.demand && ` Demand looks ${market.demand}.`}
          </p>
          {market.note && <p className="mt-2 line-clamp-3 text-sm text-zinc-500">{market.note}</p>}
          {(price !== market.price || outOfRange) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {price !== market.price && (
                <button type="button" onClick={() => onUse(market.price)} className="btn btn-primary py-2">
                  Use {formatPrice(market.price)}
                </button>
              )}
              {outOfRange && <span className="text-sm text-amber-800">Your price is {outOfRange} that range.</span>}
            </div>
          )}
        </div>
      ) : market ? (
        <p className="mt-2 text-sm text-zinc-700">
          Not enough comparable listings to suggest a price. Set your own, or add the brand and model to the title and
          check again.
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-700">See what similar items are listed for before you set a price.</p>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-950">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function CoverPreview({ src }: { src?: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
      <span className="absolute left-3 top-3 z-[1] rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-zinc-700 shadow-sm">
        Preview
      </span>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Cover photo" className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
          <ImageOff strokeWidth={1.5} className="h-7 w-7" />
          <span className="text-sm">No photo yet</span>
        </div>
      )}
    </div>
  );
}
