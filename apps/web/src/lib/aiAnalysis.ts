import { GoogleGenerativeAI } from '@google/generative-ai';
import { SimpleImageAnalysis } from './simpleImageAnalysis';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  }
}) : null;

export interface ProductAnalysis {
  title: string;
  description: string;
  category: 'electronics' | 'fashion' | 'home' | 'sports' | 'automotive' | 'books' | 'other';
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  suggestedPrice: number;
  confidence: number;
  features: string[];
  brand: string;
  model: string;
  marketResearch: {
    averagePrice: number;
    priceRange: { min: number; max: number };
    marketDemand: 'high' | 'medium' | 'low';
    competitorCount: number;
  };
}

export interface PriceAnalysis {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  marketInsights: string[];
  pricingStrategy: string;
  confidence: number;
}

export class AIAnalysisService {
  /**
   * Analyze product photos and generate product details
   */
  static async analyzeProductPhotos(imageUrls: string[]): Promise<ProductAnalysis> {
    console.log('🤖 Starting analyzeProductPhotos with:', imageUrls.length, 'images');
    console.log('🤖 Image URLs:', imageUrls);
    
    // Check if AI is available
    if (!model) {
      console.log('🤖 AI model not available, using fallback analysis');
      return this.getFallbackAnalysis(imageUrls);
    }

    try {
      // Prepare images for analysis
      console.log('🤖 Processing images for AI analysis...');
      const imageParts = await Promise.all(
        imageUrls.map(async (url, index) => {
          try {
            console.log(`🤖 Fetching image ${index + 1}: ${url}`);
            // Fetch the image
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const imageBuffer = await response.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const mimeType = response.headers.get('content-type') || 'image/jpeg';
            
            console.log(`🤖 Successfully processed image ${index + 1}, size: ${imageBuffer.byteLength} bytes, type: ${mimeType}`);
            
            return {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            };
          } catch (error) {
            console.error(`🤖 Error processing image ${index + 1}:`, url, error);
            return null;
          }
        })
      );

      // Filter out failed image processing
      const validImages = imageParts.filter(img => img !== null);
      
      if (validImages.length === 0) {
        console.log('🤖 No valid images to analyze, using fallback');
        return this.getFallbackAnalysis(imageUrls);
      }

      const prompt = `
        You are an expert product analyst for ALL VERSE GPT marketplace! 🛍️

        Analyze the uploaded product images and provide detailed information based on what you can actually see in the images.

        Return a JSON response with this exact structure:
        {
          "title": "Specific Product Name with Brand and Model",
          "description": "Detailed description highlighting key features and condition based on what you see",
          "category": "electronics|fashion|home|sports|automotive|books|other",
          "condition": "new|like-new|good|fair|poor",
          "suggestedPrice": 299.99,
          "confidence": 0.95,
          "features": ["Feature 1", "Feature 2", "Feature 3"],
          "brand": "Brand Name",
          "model": "Model Number/Name",
          "marketResearch": {
            "averagePrice": 299.99,
            "priceRange": {"min": 250, "max": 350},
            "marketDemand": "high|medium|low",
            "competitorCount": 15
          }
        }

        Guidelines:
        - Look carefully at the actual images provided
        - Identify the specific product, brand, and model from what you see
        - Assess the condition based on visible wear, damage, or newness
        - Describe what you actually observe in the images
        - Use realistic pricing based on the identified product and condition
        - Choose appropriate category based on what the product actually is
        - Include features you can identify from the images
        - Set confidence based on how clearly you can identify the product

        Return ONLY valid JSON, no additional text.
      `;

      console.log(`🤖 Sending ${validImages.length} images to AI for analysis...`);
      const result = await model.generateContent([prompt, ...validImages]);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Raw AI response:', text);

      // Clean and parse JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🤖 Cleaned AI response:', cleanText);
      
      const analysis = JSON.parse(cleanText);
      console.log('🤖 Parsed AI analysis:', analysis);

      // Validate and enhance the analysis
      return {
        title: analysis.title || 'Product Item',
        description: analysis.description || 'Product in good condition',
        category: ['electronics', 'fashion', 'home', 'sports', 'automotive', 'books', 'other'].includes(analysis.category) 
          ? analysis.category : 'other',
        condition: ['new', 'like-new', 'good', 'fair', 'poor'].includes(analysis.condition) 
          ? analysis.condition : 'good',
        suggestedPrice: Math.max(10, analysis.suggestedPrice || 100),
        confidence: Math.max(0.1, Math.min(1.0, analysis.confidence || 0.8)),
        features: Array.isArray(analysis.features) ? analysis.features : ['Good condition', 'Quality item'],
        brand: analysis.brand || 'Various',
        model: analysis.model || 'Standard',
        marketResearch: {
          averagePrice: analysis.marketResearch?.averagePrice || analysis.suggestedPrice || 100,
          priceRange: analysis.marketResearch?.priceRange || { min: 50, max: 150 },
          marketDemand: ['high', 'medium', 'low'].includes(analysis.marketResearch?.marketDemand) 
            ? analysis.marketResearch.marketDemand : 'medium',
          competitorCount: analysis.marketResearch?.competitorCount || 10
        }
      };
    } catch (error) {
      console.error('🤖 AI analysis failed, using fallback:', error);
      return this.getFallbackAnalysis(imageUrls);
    }
  }

  /**
   * Generate detailed price analysis
   */
  static async analyzePrice(
    title: string, 
    description: string, 
    category: string, 
    condition: string, 
    suggestedPrice: number
  ): Promise<PriceAnalysis> {
    console.log('💰 Starting price analysis for:', title);
    
    // Check if AI is available
    if (!model) {
      console.log('💰 AI model not available, using fallback price analysis');
      return this.getFallbackPriceAnalysis(suggestedPrice);
    }

    try {
      const prompt = `
        You are a professional pricing expert for ALL VERSE GPT marketplace! 💰

        Analyze this product for optimal pricing:
        Title: "${title}"
        Description: "${description}"
        Category: "${category}"
        Condition: "${condition}"
        Current Suggested Price: $${suggestedPrice}

        Provide detailed pricing analysis with market insights.

        Return a JSON response with this exact structure:
        {
          "suggestedPrice": 299.99,
          "priceRange": {"min": 250, "max": 350},
          "marketInsights": [
            "Market insight 1",
            "Market insight 2",
            "Market insight 3"
          ],
          "pricingStrategy": "Brief strategy recommendation",
          "confidence": 0.85
        }

        Guidelines:
        - Consider market trends, condition, and category
        - Provide realistic price ranges based on research
        - Include actionable market insights
        - Suggest appropriate pricing strategy
        - Set confidence based on data availability

        Return ONLY valid JSON, no additional text.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean and parse JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanText);

      return {
        suggestedPrice: analysis.suggestedPrice || suggestedPrice,
        priceRange: analysis.priceRange || { min: Math.round(suggestedPrice * 0.8), max: Math.round(suggestedPrice * 1.2) },
        marketInsights: Array.isArray(analysis.marketInsights) ? analysis.marketInsights : [
          'Based on current market conditions',
          'Consider seasonal demand fluctuations',
          'Check competitor pricing regularly'
        ],
        pricingStrategy: analysis.pricingStrategy || 'Competitive pricing strategy',
        confidence: Math.max(0.1, Math.min(1.0, analysis.confidence || 0.7))
      };
    } catch (error) {
      console.error('💰 AI price analysis failed, using fallback:', error);
      return this.getFallbackPriceAnalysis(suggestedPrice);
    }
  }

  /**
   * Enhanced fallback analysis when AI is not available
   */
  static getFallbackAnalysis(imageUrls?: string[]): ProductAnalysis {
    console.log('🤖 AI not available, using enhanced fallback analysis');
    
    if (imageUrls && imageUrls.length > 0) {
      // Use simple image analysis for better categorization
      const imageAnalysis = SimpleImageAnalysis.analyzeMultipleImages(imageUrls);
      
      const description = `Excellent condition ${imageAnalysis.title.toLowerCase()} with all original features intact. Well cared for and maintained. Perfect addition to any collection.`;
      
      return {
        title: imageAnalysis.title,
        description,
        category: imageAnalysis.category,
        condition: 'good' as const,
        suggestedPrice: imageAnalysis.suggestedPrice,
        confidence: imageAnalysis.confidence,
        features: imageAnalysis.features,
        brand: 'Various',
        model: 'Standard',
        marketResearch: {
          averagePrice: imageAnalysis.suggestedPrice,
          priceRange: { min: Math.round(imageAnalysis.suggestedPrice * 0.7), max: Math.round(imageAnalysis.suggestedPrice * 1.3) },
          marketDemand: 'medium' as const,
          competitorCount: Math.floor(Math.random() * 15) + 5
        }
      };
    }
    
    // Default fallback if no images
    return {
      title: 'Product Item - Good Condition',
      description: 'Excellent condition product item with all original features intact. Well cared for and maintained. Perfect addition to any collection.',
      category: 'other',
      condition: 'good' as const,
      suggestedPrice: 75,
      confidence: 0.3,
      features: ['Good condition', 'Quality item', 'Ready to use', 'Well maintained'],
      brand: 'Various',
      model: 'Standard',
      marketResearch: {
        averagePrice: 75,
        priceRange: { min: 50, max: 100 },
        marketDemand: 'medium' as const,
        competitorCount: 8
      }
    };
  }

  /**
   * Fallback price analysis when AI is not available
   */
  static getFallbackPriceAnalysis(suggestedPrice: number): PriceAnalysis {
    const priceRange = {
      min: Math.round(suggestedPrice * 0.8),
      max: Math.round(suggestedPrice * 1.2)
    };

    const marketInsights = [
      `Based on ${suggestedPrice >= 100 ? 'premium' : 'standard'} market pricing`,
      'Consider seasonal demand fluctuations',
      'Check competitor pricing regularly',
      'Factor in condition and completeness'
    ];

    const pricingStrategy = suggestedPrice >= 200 
      ? 'Premium pricing strategy - emphasize quality and condition'
      : 'Competitive pricing strategy - focus on value proposition';

    return {
      suggestedPrice,
      priceRange,
      marketInsights,
      pricingStrategy,
      confidence: 0.7
    };
  }
}