const { initializeApp } = require('firebase/app');
const { getStorage, connectStorageEmulator } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function deployStorageRules() {
  try {
    console.log('🚀 Deploying Firebase Storage rules...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    
    // Read the storage rules file
    const rulesPath = path.join(__dirname, 'storage.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    
    console.log('📋 Storage rules content:');
    console.log(rulesContent);
    
    console.log('✅ Storage rules file read successfully');
    console.log('📝 Please manually update your Firebase Storage rules in the Firebase Console:');
    console.log('   1. Go to Firebase Console → Storage → Rules');
    console.log('   2. Replace the existing rules with the content above');
    console.log('   3. Click "Publish" to deploy the new rules');
    
    console.log('\n🔗 Firebase Console URL:');
    if (firebaseConfig.projectId) {
      console.log(`   https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage/rules`);
    } else {
      console.log('   https://console.firebase.google.com/');
      console.log('   (Please select your project and navigate to Storage → Rules)');
    }
    
  } catch (error) {
    console.error('❌ Error deploying storage rules:', error);
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

deployStorageRules();