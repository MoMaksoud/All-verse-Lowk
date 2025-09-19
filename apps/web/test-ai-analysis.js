#!/usr/bin/env node

const { AIAnalysisService } = require('./src/lib/aiAnalysis.ts');

console.log('🤖 Testing AI Analysis Service...\n');

// Test with a sample Firebase Storage URL (you can replace this with an actual image URL)
const testImageUrls = [
  'https://firebasestorage.googleapis.com/v0/b/all-verse-gpt-9c2e1.appspot.com/o/listing-photos%2Ftest-image.jpg?alt=media&token=test-token'
];

async function testAIAnalysis() {
  try {
    console.log('📸 Testing image analysis...');
    const analysis = await AIAnalysisService.analyzeProductPhotos(testImageUrls);
    
    console.log('✅ Analysis Result:');
    console.log('Title:', analysis.title);
    console.log('Description:', analysis.description);
    console.log('Category:', analysis.category);
    console.log('Condition:', analysis.condition);
    console.log('Suggested Price:', analysis.suggestedPrice);
    console.log('Confidence:', analysis.confidence);
    console.log('Features:', analysis.features);
    console.log('Brand:', analysis.brand);
    console.log('Model:', analysis.model);
    console.log('Market Research:', analysis.marketResearch);
    
    console.log('\n💰 Testing price analysis...');
    const priceAnalysis = await AIAnalysisService.analyzePrice(
      analysis.title,
      analysis.description,
      analysis.category,
      analysis.condition,
      analysis.suggestedPrice
    );
    
    console.log('✅ Price Analysis Result:');
    console.log('Suggested Price:', priceAnalysis.suggestedPrice);
    console.log('Price Range:', priceAnalysis.priceRange);
    console.log('Reasoning:', priceAnalysis.reasoning);
    console.log('Market Data:', priceAnalysis.marketData);
    
    console.log('\n🎉 AI Analysis test completed successfully!');
    
  } catch (error) {
    console.error('❌ AI Analysis test failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if GEMINI_API_KEY is set in .env.local');
    console.log('2. Verify the API key is valid');
    console.log('3. Check if the image URL is accessible');
    console.log('4. Ensure Firebase Storage rules allow public read access');
  }
}

testAIAnalysis();
