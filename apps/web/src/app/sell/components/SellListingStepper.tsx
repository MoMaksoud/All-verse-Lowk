'use client';

import React from 'react';

export type SellStepConfig = {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  steps: SellStepConfig[];
  currentStep: number;
};

export function SellListingStepper({ steps, currentStep }: Props) {
  return (
    <div className="mb-8 sm:mb-10">
      <div className="lg:hidden space-y-3 max-w-sm mx-auto">
        {steps.slice(0, 3).map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/20 border-2 border-blue-500'
                  : isCompleted
                    ? 'bg-zinc-800/40 border border-blue-500/30'
                    : 'bg-zinc-800/20 border border-zinc-700'
              }`}
            >
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : isCompleted
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-base font-semibold ${
                    isActive || isCompleted ? 'text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-sm text-zinc-400">{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-row items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div
                    className={`text-sm font-medium ${
                      isActive || isCompleted ? 'text-zinc-100' : 'text-zinc-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-zinc-500">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-4 transition-all duration-200 ${
                    isCompleted ? 'bg-blue-500' : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
