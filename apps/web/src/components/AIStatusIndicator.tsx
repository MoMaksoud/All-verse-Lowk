import React from 'react';
import { Brain, AlertTriangle, CheckCircle } from 'lucide-react';

export function AIStatusIndicator() {
  const isApiKeyConfigured = process.env.NEXT_PUBLIC_GEMINI_API_KEY && process.env.NEXT_PUBLIC_GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY';

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
      isApiKeyConfigured
        ? 'bg-green-900/20 text-green-400 border border-green-500/30'
        : 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30'
    }`}>
      {isApiKeyConfigured ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <AlertTriangle className="w-4 h-4" />
      )}
      <span>
        AI Service Status: {isApiKeyConfigured ? 'Active' : 'API Key Missing/Invalid'}
      </span>
      {!isApiKeyConfigured && (
        <span className="text-xs text-yellow-500 ml-1">
          (Check NEXT_PUBLIC_GEMINI_API_KEY in .env)
        </span>
      )}
    </div>
  );
}