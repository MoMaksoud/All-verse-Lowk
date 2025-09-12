import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI for image analysis
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY not found. AI analysis will use fallback data.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;

export interface ProductAnalysis {
  title: string;
  description: string;
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair';
  suggestedPrice: number;
  confidence: number;
  features: string[];
  brand?: string;
  model?: string;
  marketResearch?: {
    averagePrice: number;
    priceRange: { min: number; max: number };
    marketDemand: 'high' | 'medium' | 'low';
    competitorCount: number;
  };
}

export interface PriceAnalysis {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  reasoning: string;
  marketData: {
    averagePrice: number;
    competitorCount: number;
    demandLevel: 'low' | 'medium' | 'high';
  };
}

export class AIAnalysisService {
  /**
   * Analyze product photos and generate product details
   */
  static async analyzeProductPhotos(imageUrls: string[]): Promise<ProductAnalysis> {
    if (!model || !imageUrls.length) {
      console.log('🤖 Gemini model not available or no images provided');
      return this.getFallbackAnalysis();
    }

    console.log('🤖 Gemini model available, proceeding with AI analysis');

    try {
      console.log('🤖 Starting AI photo analysis...');
      
      // Convert data URLs to base64 for Gemini
      const imageParts = await Promise.all(
        imageUrls.map(async (url) => {
          if (url.startsWith('data:')) {
            const base64 = url.split(',')[1];
            return {
              inlineData: {
                data: base64,
                mimeType: url.split(';')[0].split(':')[1]
              }
            };
          }
          return null;
        })
      );

      const validImageParts = imageParts.filter(part => part !== null);
      
      if (validImageParts.length === 0) {
        return this.getFallbackAnalysis();
      }

      const prompt = `
        Analyze these product photos and provide detailed information for a marketplace listing.

        IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

        Required JSON structure:
        {
          "title": "Product title (max 60 characters)",
          "description": "Detailed product description (2-3 sentences)",
          "category": "electronics|fashion|home|sports|automotive|books|other",
          "condition": "new|like-new|good|fair",
          "suggestedPrice": 299.99,
          "confidence": 0.85,
          "features": ["feature1", "feature2", "feature3"],
          "brand": "Brand name if identifiable",
          "model": "Model name if identifiable",
          "marketResearch": {
            "averagePrice": 299.99,
            "priceRange": {"min": 250, "max": 350},
            "marketDemand": "high|medium|low",
            "competitorCount": 15
          }
        }

        Guidelines:
        - Analyze what you actually see in the images
        - Identify the specific product, brand, and model if visible
        - Research current market prices for this exact product
        - Consider condition, age, and market demand
        - Use realistic pricing based on current market data
        - Choose the most appropriate category
        - Assess condition based on visible wear/age
        - Include 3-5 key features you can see
        - Confidence should be 0.7-0.95 based on image clarity
        - Market research should reflect current online prices
        - Return ONLY the JSON object, no markdown, no code blocks, no explanations
      `;

      const result = await model.generateContent([prompt, ...validImageParts]);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Raw AI response:', text);

      // Clean and parse JSON response
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Extract JSON from the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      console.log('🤖 Cleaned JSON:', cleanedText);

      // Parse JSON response
      const analysis = JSON.parse(cleanedText);
      
      console.log('🤖 AI analysis completed:', analysis);
      
      return {
        title: analysis.title || 'Product Item',
        description: analysis.description || 'A quality product in good condition.',
        category: analysis.category || 'other',
        condition: analysis.condition || 'good',
        suggestedPrice: analysis.suggestedPrice || 99.99,
        confidence: analysis.confidence || 0.8,
        features: analysis.features || ['Quality item', 'Good condition'],
        brand: analysis.brand,
        model: analysis.model,
        marketResearch: analysis.marketResearch || {
          averagePrice: analysis.suggestedPrice || 99.99,
          priceRange: { min: (analysis.suggestedPrice || 99.99) * 0.8, max: (analysis.suggestedPrice || 99.99) * 1.2 },
          marketDemand: 'medium' as const,
          competitorCount: 10
        }
      };

    } catch (error) {
      console.error('🤖 AI analysis error:', error);
      console.log('🤖 Falling back to manual analysis');
      return this.getFallbackAnalysis();
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
    if (!model) {
      return this.getFallbackPriceAnalysis(suggestedPrice);
    }

    try {
      console.log('💰 Starting AI price analysis...');

      const prompt = `
        Analyze the market value for this product listing:

        Title: "${title}"
        Description: "${description}"
        Category: "${category}"
        Condition: "${condition}"
        Initial Price: $${suggestedPrice}

        IMPORTANT: Return ONLY valid JSON without any markdown formatting, code blocks, or additional text.

        Required JSON structure:
        {
          "suggestedPrice": 299.99,
          "priceRange": {"min": 250, "max": 350},
          "reasoning": "Brief explanation of pricing strategy",
          "marketData": {
            "averagePrice": 300,
            "competitorCount": 15,
            "demandLevel": "medium"
          }
        }

        Guidelines:
        - Consider condition, brand, and market demand
        - Price range should be ±20% of suggested price
        - Demand level: low/medium/high based on category popularity
        - Competitor count: estimate similar listings
        - Return ONLY the JSON object, no markdown, no code blocks, no explanations
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('💰 Raw price analysis response:', text);

      // Clean and parse JSON response
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.includes('```json')) {
        cleanedText = cleanedText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedText.includes('```')) {
        cleanedText = cleanedText.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Extract JSON from the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      console.log('💰 Cleaned price JSON:', cleanedText);

      const analysis = JSON.parse(cleanedText);
      
      console.log('💰 Price analysis completed:', analysis);
      
      return {
        suggestedPrice: analysis.suggestedPrice || suggestedPrice,
        priceRange: analysis.priceRange || { min: suggestedPrice * 0.8, max: suggestedPrice * 1.2 },
        reasoning: analysis.reasoning || 'Competitive pricing based on market analysis',
        marketData: {
          averagePrice: analysis.marketData?.averagePrice || suggestedPrice,
          competitorCount: analysis.marketData?.competitorCount || 10,
          demandLevel: analysis.marketData?.demandLevel || 'medium'
        }
      };

    } catch (error) {
      console.error('💰 Price analysis error:', error);
      return this.getFallbackPriceAnalysis(suggestedPrice);
    }
  }

  /**
   * Fallback analysis when AI is not available
   */
  private static getFallbackAnalysis(): ProductAnalysis {
    console.log('🤖 AI not available, using fallback analysis');
    
    return {
      title: 'Product Item - Good Condition',
      description: 'Quality product in good condition. Please review and edit the details to match your specific item.',
      category: 'other',
      condition: 'good' as const,
      suggestedPrice: 99.99,
      confidence: 0.5,
      features: ['Good condition', 'Quality item', 'Ready to use'],
      brand: 'Unknown',
      model: 'Standard',
      marketResearch: {
        averagePrice: 99.99,
        priceRange: { min: 80, max: 120 },
        marketDemand: 'medium' as const,
        competitorCount: 5
      }
    };
  }

  /**
   * Fallback price analysis when AI is not available
   */
  private static getFallbackPriceAnalysis(suggestedPrice: number): PriceAnalysis {
    const priceRange = {
      min: Math.round(suggestedPrice * 0.8),
      max: Math.round(suggestedPrice * 1.2)
    };

    return {
      suggestedPrice,
      priceRange,
      reasoning: 'Competitive pricing based on similar items in the market',
      marketData: {
        averagePrice: suggestedPrice,
        competitorCount: 12,
        demandLevel: 'medium' as const
      }
    };
  }

  /**
   * Generate category-specific suggestions
   */
  static getCategorySuggestions(category: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      electronics: ['Smartphone', 'Laptop', 'Tablet', 'Headphones', 'Smart Watch'],
      fashion: ['Handbag', 'Shoes', 'Jacket', 'Dress', 'Accessories'],
      home: ['Coffee Table', 'Lamp', 'Chair', 'Decor', 'Kitchen Items'],
      sports: ['Tennis Racket', 'Basketball', 'Yoga Mat', 'Running Shoes', 'Gym Equipment'],
      automotive: ['Car Parts', 'Accessories', 'Tools', 'Maintenance Items'],
      books: ['Fiction', 'Non-fiction', 'Textbooks', 'Children\'s Books'],
      other: ['Collectibles', 'Art', 'Crafts', 'Miscellaneous Items']
    };

    return suggestions[category] || suggestions.other;
  }
}

export default AIAnalysisService;
