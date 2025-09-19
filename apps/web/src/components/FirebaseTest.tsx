'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export function FirebaseTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testFirebase = async () => {
    setIsLoading(true);
    setTestResult('Testing Firebase connection...');
    
    try {
      // Test Firebase auth object
      if (!auth) {
        setTestResult('❌ Firebase auth object is null');
        return;
      }
      
      setTestResult('✅ Firebase auth object exists');
      
      // Test creating a user (this will fail but show us the error)
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'testpassword123';
      
      setTestResult('🔄 Testing user creation...');
      
      await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      
      setTestResult('✅ Firebase user creation works!');
      
    } catch (error: any) {
      console.error('Firebase test error:', error);
      setTestResult(`❌ Firebase error: ${error.code} - ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg text-xs z-50 max-w-sm">
      <div className="font-bold mb-2">🧪 Firebase Test</div>
      
      <button
        onClick={testFirebase}
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-3 py-2 rounded text-xs mb-2"
      >
        {isLoading ? 'Testing...' : 'Test Firebase'}
      </button>
      
      <div className="text-xs text-gray-300">
        {testResult}
      </div>
    </div>
  );
}
