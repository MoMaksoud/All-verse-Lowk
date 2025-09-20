import { GoogleGenerativeAI } from '@google/generative-ai';
import { SimpleImageAnalysis } from './simpleImageAnalysis';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;

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
    
    // Always use fallback for now since AI quota is exceeded
    console.log('🤖 AI quota exceeded, using enhanced fallback analysis');
    return this.getFallbackAnalysis(imageUrls);
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
    
    // Always use fallback for now since AI quota is exceeded
    console.log('💰 AI quota exceeded, using fallback price analysis');
    return this.getFallbackPriceAnalysis(suggestedPrice);
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