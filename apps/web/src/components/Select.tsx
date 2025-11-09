"use client";

import { Fragment, useRef, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

type Option = { value: string; label: string };

interface Props {
  value: string | null;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className,
  label,
}: Props) {
  const selected = options.find(o => o.value === value) ?? null;
  const optionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedScrollY = useRef(0);
  const isOpenRef = useRef(false);

  // Prevent scroll when dropdown options are focused
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Watch for when options are added to DOM
    const observer = new MutationObserver(() => {
      if (optionsRef.current) {
        const optionElements = optionsRef.current.querySelectorAll('[role="option"]');
        optionElements.forEach((option) => {
          const el = option as HTMLElement;
          // Override scrollIntoView to prevent page scroll
          el.scrollIntoView = function() {
            // Do nothing - prevent scroll into view
          };
        });
      }
    });

    // Observe the container for changes
    observer.observe(container, { childList: true, subtree: true });

    // Prevent scroll on focus
    const handleFocus = (e: FocusEvent) => {
      if (container.contains(e.target as Node)) {
        // Save position before any scroll happens
        const currentScroll = window.scrollY;
        savedScrollY.current = currentScroll;
        
        // Immediately restore if it changed
        requestAnimationFrame(() => {
          if (Math.abs(window.scrollY - currentScroll) > 1) {
            window.scrollTo(0, currentScroll);
          }
        });
      }
    };

    // Prevent scroll events
    const handleScroll = (e: Event) => {
      if (isOpenRef.current && Math.abs(window.scrollY - savedScrollY.current) > 1) {
        e.preventDefault();
        window.scrollTo(0, savedScrollY.current);
      }
    };

    document.addEventListener('focusin', handleFocus, true);
    window.addEventListener('scroll', handleScroll, { passive: false, capture: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', handleFocus, true);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <div className={clsx("w-full", className)}>
      {label && (
        <div className="mb-2 text-sm font-medium text-zinc-100">
          {label}
        </div>
      )}

      <Listbox value={value} onChange={onChange}>
        {({ open }) => {
          // Track open state and save scroll position
          if (open && !isOpenRef.current) {
            isOpenRef.current = true;
            savedScrollY.current = window.scrollY;
          } else if (!open) {
            isOpenRef.current = false;
          }

          return (
            <div ref={containerRef} className="relative">
          <Listbox.Button
            onMouseDown={(e) => {
              // Save scroll position before dropdown opens
              savedScrollY.current = window.scrollY;
            }}
            className={clsx(
              "h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3",
              "text-left text-sm text-zinc-100",
              "shadow-sm hover:bg-zinc-800/60 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "outline-none transition-all duration-200 inline-flex items-center justify-between",
              "backdrop-blur-sm"
            )}
          >
            <span className={clsx("truncate", !selected && "text-zinc-500")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="ml-2 h-5 w-5 text-zinc-400 transition-transform duration-200 ui-open:rotate-180" />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-95 translate-y-1"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-1"
          >
            <Listbox.Options
              ref={optionsRef}
              static
              className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur shadow-xl p-1 max-h-72 overflow-y-auto overscroll-contain focus:outline-none"
              style={{ scrollMargin: 0 }}
            >
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt.value}
                  className={({ active, selected }) =>
                    clsx(
                      "relative cursor-pointer select-none rounded-lg px-3 py-2 text-sm",
                      "text-zinc-200 outline-none transition-all duration-150",
                      "hover:bg-zinc-800/70 focus:bg-zinc-800/70",
                      active && "bg-zinc-800/70 text-zinc-100",
                      selected && "bg-blue-600 text-white font-medium"
                    )
                  }
                  style={{ scrollMargin: 0 }}
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span className={clsx("truncate", selected && "font-medium")}>
                        {opt.label}
                      </span>
                      {selected && <Check className="h-4 w-4 text-white" />}
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
            </div>
          );
        }}
      </Listbox>
    </div>
  );
}
