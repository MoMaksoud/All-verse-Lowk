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
        <div className="mb-2 text-sm font-medium text-zinc-100">
          {label}
        </div>
      ) : null}

      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button
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
              className={clsx(
                "absolute z-50 mt-2 w-full overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/95 p-2 shadow-2xl",
                "max-h-64 focus:outline-none backdrop-blur-md ring-1 ring-zinc-800/50"
              )}
            >
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt.value}
                  className={({ active, selected }) =>
                    clsx(
                      "relative cursor-pointer select-none rounded-lg px-3 py-2.5 text-sm",
                      "text-zinc-100 outline-none transition-all duration-150",
                      "hover:bg-zinc-800/60 focus:bg-zinc-800/60",
                      active && "bg-zinc-800/60 text-zinc-100",
                      selected && "bg-blue-600 text-white font-medium"
                    )
                  }
                >
                  {({ selected }) => (
                    <div className="flex items-center justify-between">
                      <span className={clsx("truncate", selected && "font-medium")}>
                        {opt.label}
                      </span>
                      {selected ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : null}
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
