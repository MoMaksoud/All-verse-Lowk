'use client';

import React, { useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Upload, AlertCircle } from 'lucide-react';

export function StorageTest() {
  const { currentUser } = useAuth();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { uploadProfilePicture, isUploading, progress, error } = useFileUpload({
    onSuccess: (result) => {
      setTestResult(`✅ SUCCESS! File uploaded to: ${result.url}`);
      setIsTesting(false);
    },
    onError: (error) => {
      setTestResult(`❌ ERROR: ${error}`);
      setIsTesting(false);
    },
  });

  const testStorage = async () => {
    if (!currentUser) {
      setTestResult('❌ ERROR: No user logged in');
      return;
    }

    setIsTesting(true);
    setTestResult('🔄 Testing Firebase Storage connection...');

    // Create a small test file
    const testContent = 'This is a test file for Firebase Storage';
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });

    try {
      await uploadProfilePicture(testFile, currentUser.uid, currentUser.email || 'test@example.com');
    } catch (err) {
      setTestResult(`❌ ERROR: ${err}`);
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-dark-800 rounded-lg border border-dark-600">
      <div className="text-center mb-6">
        <Upload className="w-12 h-12 mx-auto mb-4 text-accent-500" />
        <h2 className="text-xl font-bold text-white mb-2">Firebase Storage Test</h2>
        <p className="text-gray-400 text-sm">
          Test if your Firebase Storage is working correctly
        </p>
      </div>

      <div className="space-y-4">
        {/* Storage Bucket Info */}
        <div className="p-4 bg-dark-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Storage Bucket:</h3>
          <p className="text-xs text-gray-400 font-mono break-all">
            all-verse-gpt-9c2e1.firebasestorage.app
          </p>
          <p className="text-xs text-gray-500 mt-1">Region: US-CENTRAL1</p>
        </div>

        {/* Test Button */}
        <button
          onClick={testStorage}
          disabled={!currentUser || isTesting || isUploading}
          className="w-full px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isTesting || isUploading ? 'Testing...' : 'Test Storage Connection'}
        </button>

        {/* Progress Bar */}
        {isUploading && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Uploading...</span>
              <span>{progress.percentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-lg ${
            testResult.includes('✅') 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-start gap-2">
              {testResult.includes('✅') ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{testResult}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* User Status */}
        <div className="text-center text-sm text-gray-500">
          {currentUser ? (
            <span className="text-green-400">✅ User logged in: {currentUser.email}</span>
          ) : (
            <span className="text-red-400">❌ No user logged in</span>
          )}
        </div>
      </div>
    </div>
  );
}
