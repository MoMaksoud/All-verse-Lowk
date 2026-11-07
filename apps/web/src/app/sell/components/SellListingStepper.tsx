'use client';

import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

type Props = {
  steps: string[];
  current: number;
};

export function SellListingStepper({ steps, current }: Props) {
  return (
    <ol className="flex items-center gap-2 text-sm sm:gap-3" aria-label="Listing progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <span
              aria-current={active ? 'step' : undefined}
              className={clsx(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors',
                done || active ? 'bg-primary-600 text-white' : 'bg-zinc-100 text-zinc-500'
              )}
            >
              {done ? <Check strokeWidth={2.5} className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={clsx('whitespace-nowrap', active ? 'font-medium text-zinc-950' : 'text-zinc-500', !active && 'hidden sm:inline')}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-zinc-200 sm:w-10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
