"use client";

import { Fragment } from "react";
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

  return (
    <div className={clsx("w-full", className)}>
      {label ? (
        <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-300/80 uppercase">
          {label}
        </div>
      ) : null}

      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button
            className={clsx(
              "h-10 w-full rounded-xl border border-white/10 bg-[#0E1526] px-3",
              "text-left text-sm text-zinc-100",
              "shadow-sm hover:bg-[#0F182B] focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60",
              "outline-none transition inline-flex items-center justify-between"
            )}
          >
            <span className={clsx("truncate", !selected && "text-zinc-400")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
          </Listbox.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-120"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Listbox.Options
              className={clsx(
                "absolute z-50 mt-2 w-full overflow-auto rounded-xl border border-white/10 bg-[#0B1220] p-1 shadow-xl",
                "max-h-64 focus:outline-none"
              )}
            >
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt.value}
                  className={({ active, selected }) =>
                    clsx(
                      "relative cursor-pointer select-none rounded-lg px-3 py-2 text-sm",
                      "text-zinc-100 outline-none",
                      active && "bg-[#12203A] text-white",
                      selected && "bg-blue-600 text-white"
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span className={clsx("truncate")}>{opt.label}</span>
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
