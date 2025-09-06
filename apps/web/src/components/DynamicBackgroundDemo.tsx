'use client';

import React, { useState } from 'react';
import { DynamicBackground } from './DynamicBackground';

export function DynamicBackgroundDemo() {
  const [intensity, setIntensity] = useState<'low' | 'med' | 'high'>('med');
  const [showParticles, setShowParticles] = useState(true);

  return (
    <div className="relative min-h-screen">
      <DynamicBackground intensity={intensity} showParticles={showParticles} />
      
      <div className="relative z-10 p-8">
        <div className="max-w-2xl mx-auto bg-dark-800/50 backdrop-blur-sm rounded-2xl p-6 border border-dark-600">
          <h2 className="text-2xl font-bold text-white mb-4">Dynamic Background Demo</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Intensity Level
              </label>
              <div className="flex gap-2">
                {(['low', 'med', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setIntensity(level)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      intensity === level
                        ? 'bg-accent-500 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <input
                  type="checkbox"
                  checked={showParticles}
                  onChange={(e) => setShowParticles(e.target.checked)}
                  className="rounded border-dark-600 bg-dark-700 text-accent-500 focus:ring-accent-500"
                />
                Show Particles
              </label>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-dark-900/50 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Current Settings:</h3>
            <pre className="text-sm text-gray-300">
{`<DynamicBackground 
  intensity="${intensity}" 
  showParticles={${showParticles}} 
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
