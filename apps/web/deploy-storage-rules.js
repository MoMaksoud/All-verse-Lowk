#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Firebase Storage Rules...\n');

// Check if Firebase CLI is installed
try {
  execSync('firebase --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Firebase CLI is not installed. Please install it first:');
  console.error('npm install -g firebase-tools');
  process.exit(1);
}

// Check if we're in a Firebase project
try {
  const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
  if (!fs.existsSync(firebaseJsonPath)) {
    console.log('📝 Creating firebase.json configuration...');
    
    const firebaseConfig = {
      "storage": {
        "rules": "storage.rules"
      }
    };
    
    fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseConfig, null, 2));
    console.log('✅ Created firebase.json');
  }
} catch (error) {
  console.error('❌ Error creating firebase.json:', error.message);
  process.exit(1);
}

// Deploy storage rules
try {
  console.log('📤 Deploying storage rules to Firebase...');
  execSync('firebase deploy --only storage', { stdio: 'inherit' });
  console.log('\n✅ Firebase Storage rules deployed successfully!');
  console.log('\n🎉 Your photo upload should now work!');
} catch (error) {
  console.error('\n❌ Failed to deploy storage rules:', error.message);
  console.log('\n📋 Manual steps to deploy:');
  console.log('1. Run: firebase login');
  console.log('2. Run: firebase use your-project-id');
  console.log('3. Run: firebase deploy --only storage');
  process.exit(1);
}
