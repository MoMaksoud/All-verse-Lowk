#!/usr/bin/env node

/**
 * Convert web app's .env.local to mobile app's .env format
 * Replaces NEXT_PUBLIC_ prefix with EXPO_PUBLIC_
 */

const fs = require('fs');
const path = require('path');

const webEnvPath = path.join(__dirname, '../../web/.env.local');
const mobileEnvPath = path.join(__dirname, '../.env');

console.log('🔄 Converting environment variables...\n');

try {
  // Read web .env.local
  if (!fs.existsSync(webEnvPath)) {
    console.error('❌ Web .env.local not found at:', webEnvPath);
    process.exit(1);
  }

  const webEnvContent = fs.readFileSync(webEnvPath, 'utf8');
  
  // Convert NEXT_PUBLIC_ to EXPO_PUBLIC_
  const lines = webEnvContent.split('\n');
  const mobileLines = [];
  const publicVars = [];
  
  lines.forEach(line => {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      mobileLines.push(line);
      return;
    }
    
    // Only include NEXT_PUBLIC_ variables (convert to EXPO_PUBLIC_)
    if (line.includes('NEXT_PUBLIC_')) {
      const convertedLine = line.replace(/NEXT_PUBLIC_/g, 'EXPO_PUBLIC_');
      mobileLines.push(convertedLine);
      
      // Track which variable we're converting
      const varName = line.split('=')[0].trim();
      publicVars.push(varName);
    }
  });
  
  // Add API URL if not present (without /api suffix - API client will add it)
  const hasApiUrl = mobileLines.some(line => line.includes('EXPO_PUBLIC_API_URL'));
  if (!hasApiUrl) {
    mobileLines.push('');
    mobileLines.push('# API Configuration');
    mobileLines.push('EXPO_PUBLIC_API_URL=https://www.allversegpt.com');
  }
  
  // Write mobile .env
  const mobileEnvContent = mobileLines.join('\n');
  fs.writeFileSync(mobileEnvPath, mobileEnvContent);
  
  console.log('✅ Successfully converted environment variables!\n');
  console.log('📝 Converted variables:');
  publicVars.forEach(varName => {
    const newName = varName.replace('NEXT_PUBLIC_', 'EXPO_PUBLIC_');
    console.log(`   ${varName} → ${newName}`);
  });
  
  console.log(`\n📄 Output file: ${mobileEnvPath}`);
  console.log('\n⚠️  Note: Server-only variables (without NEXT_PUBLIC_ prefix) were excluded for security.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

