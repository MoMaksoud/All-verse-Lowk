'use client';

import React from 'react';
import { isFirebaseConfigured } from '@/lib/firebase';

export function FirebaseStatus() {
  const isConfigured = isFirebaseConfigured();
  
  // Check individual environment variables
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  
  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs z-50 max-w-sm">
      <div className="font-bold mb-2">🔥 Firebase Status</div>
      
      <div className="space-y-1">
        <div className={`flex items-center gap-2 ${apiKey && !apiKey.includes('your_') ? 'text-green-400' : 'text-red-400'}`}>
          <span>{apiKey && !apiKey.includes('your_') ? '✅' : '❌'}</span>
          <span>API Key: {apiKey ? (apiKey.includes('your_') ? 'Placeholder' : 'Set') : 'Missing'}</span>
        </div>
        
        <div className={`flex items-center gap-2 ${authDomain && !authDomain.includes('your_') ? 'text-green-400' : 'text-red-400'}`}>
          <span>{authDomain && !authDomain.includes('your_') ? '✅' : '❌'}</span>
          <span>Auth Domain: {authDomain ? (authDomain.includes('your_') ? 'Placeholder' : 'Set') : 'Missing'}</span>
        </div>
        
        <div className={`flex items-center gap-2 ${projectId && !projectId.includes('your_') ? 'text-green-400' : 'text-red-400'}`}>
          <span>{projectId && !projectId.includes('your_') ? '✅' : '❌'}</span>
          <span>Project ID: {projectId ? (projectId.includes('your_') ? 'Placeholder' : 'Set') : 'Missing'}</span>
        </div>
        
        <div className={`flex items-center gap-2 ${appId && !appId.includes('your_') ? 'text-green-400' : 'text-red-400'}`}>
          <span>{appId && !appId.includes('your_') ? '✅' : '❌'}</span>
          <span>App ID: {appId ? (appId.includes('your_') ? 'Placeholder' : 'Set') : 'Missing'}</span>
        </div>
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className={`font-medium ${isConfigured ? 'text-green-400' : 'text-red-400'}`}>
          Overall Status: {isConfigured ? '✅ Configured' : '❌ Not Configured'}
        </div>
      </div>
      
      {!isConfigured && (
        <div className="mt-2 text-yellow-400 text-xs">
          ⚠️ Update your .env.local file with real Firebase values
        </div>
      )}
    </div>
  );
}
