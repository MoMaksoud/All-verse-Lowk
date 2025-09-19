'use client';

import React from 'react';

export function EnvChecker() {
  const firebaseVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const hasPlaceholders = Object.values(firebaseVars).some(value => 
    value?.includes('your_') || value?.includes('placeholder')
  );

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs z-50 max-w-sm">
      <div className="font-bold mb-2">🔍 Environment Check</div>
      
      <div className="space-y-1">
        {Object.entries(firebaseVars).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              value && !value.includes('your_') && !value.includes('placeholder') 
                ? 'bg-green-400' 
                : 'bg-red-400'
            }`}></span>
            <span className="text-gray-300">{key}:</span>
            <span className={`text-xs ${
              value && !value.includes('your_') && !value.includes('placeholder')
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {value ? (value.includes('your_') || value.includes('placeholder') ? 'Placeholder' : 'Set') : 'Missing'}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className={`font-medium ${hasPlaceholders ? 'text-red-400' : 'text-green-400'}`}>
          Status: {hasPlaceholders ? '❌ Has Placeholders' : '✅ Real Values'}
        </div>
      </div>
      
      {hasPlaceholders && (
        <div className="mt-2 text-yellow-400 text-xs">
          ⚠️ Replace placeholders with real Firebase values
        </div>
      )}
    </div>
  );
}
