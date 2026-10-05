'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { normalizeImageSrc } from '@marketplace/shared-logic';

interface ListingGalleryProps {
  photos: string[];
  title?: string;
  className?: string;
}

export const ListingGallery: React.FC<ListingGalleryProps> = ({
  photos,
  title = 'Listing photo',
  className = '',
}) => {
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);
  const srcs = (photos || []).map((p) => normalizeImageSrc(p)).filter(Boolean) as string[];
  const count = srcs.length;

  const go = (delta: number) => setActive((i) => (i + delta + count) % count);

  if (count === 0) {
    return (
      <div className={clsx('flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-100 text-zinc-400', className)}>
        <ImageOff strokeWidth={1.5} className="h-8 w-8" />
        <span className="text-sm">No photos</span>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      <div
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        tabIndex={count > 1 ? 0 : undefined}
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const diff = touchX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <Image
          key={srcs[active]}
          src={srcs[active]}
          alt={`${title}, photo ${active + 1} of ${count}`}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="animate-fade-in object-contain"
          priority={active === 0}
        />

        {count > 1 && (
          <>
            {[
              { d: -1, Icon: ChevronLeft, label: 'Previous photo', pos: 'left-3' },
              { d: 1, Icon: ChevronRight, label: 'Next photo', pos: 'right-3' },
            ].map(({ d, Icon, label, pos }) => (
              <button
                key={d}
                type="button"
                onClick={() => go(d)}
                aria-label={label}
                className={clsx(
                  'absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-sm transition hover:bg-white active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
                  pos
                )}
              >
                <Icon strokeWidth={1.75} className="h-5 w-5" />
              </button>
            ))}
            <span className="absolute bottom-3 right-3 rounded-full bg-zinc-950/70 px-2.5 py-1 text-xs tabular-nums text-white">
              {active + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {srcs.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={clsx(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-offset-2 transition sm:h-20 sm:w-20',
                i === active ? 'ring-2 ring-primary-600' : 'opacity-70 hover:opacity-100'
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
