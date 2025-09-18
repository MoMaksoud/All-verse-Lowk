#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔑 Stripe Setup Helper\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Creating .env.local from template...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env.local file');
  } else {
    console.log('❌ env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env.local already exists');
}

console.log('\n🚀 Next Steps:');
console.log('1. Go to https://stripe.com and create an account');
console.log('2. Get your test API keys from https://dashboard.stripe.com/test/apikeys');
console.log('3. Set up webhooks at https://dashboard.stripe.com/test/webhooks');
console.log('4. Update your .env.local file with the keys');
console.log('5. Run: npm run dev');
console.log('\n📖 For detailed instructions, see STRIPE_SETUP.md');

// Check if keys are already set
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('pk_test_your_publishable_key_here')) {
    console.log('\n⚠️  Remember to replace the placeholder keys in .env.local with your actual Stripe keys!');
  } else if (envContent.includes('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_')) {
    console.log('\n✅ Stripe keys appear to be configured!');
  }
} catch (error) {
  console.log('\n❌ Error reading .env.local file');
}
