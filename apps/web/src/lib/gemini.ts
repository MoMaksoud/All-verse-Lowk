import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required. Please add it to your .env.local file.');
}

console.log('Gemini API Key loaded:', apiKey ? 'Yes' : 'No');

const genAI = new GoogleGenerativeAI(apiKey);

// Get the generative model
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

export class GeminiService {
  /**
   * Generate a response from Gemini AI
   */
  static async generateResponse(prompt: string): Promise<ChatResponse> {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        message: text,
        success: true
      };
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return {
        message: 'Sorry, I encountered an error while processing your request. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate a marketplace-specific response
   */
  static async generateMarketplaceResponse(userMessage: string, context?: any): Promise<ChatResponse> {
    const marketplacePrompt = `
You are an AI assistant for ALL VERSE GPT, a modern AI-powered marketplace. Your role is to help users with:

1. Product searches and recommendations
2. Marketplace navigation and features
3. Buying and selling guidance
4. General marketplace questions

User message: "${userMessage}"

Context: ${context ? JSON.stringify(context) : 'No additional context'}

Please provide a helpful, friendly response that guides the user. When asking questions or offering options, phrase them in a way that suggests clickable buttons.

Examples of good interactive responses:
- "What category interests you? **Electronics**, **Fashion**, **Home**, or **Sports**?"
- "Would you like to see **Trending Items**, **Best Deals**, **New Arrivals**, or **Popular Brands**?"
- "I can help you find **Laptops**, **Phones**, **Gaming Gear**, or **Accessories**"

Always end with a question that offers specific clickable options. Keep responses concise but informative, and maintain a helpful, professional tone.
    `;

    return this.generateResponse(marketplacePrompt);
  }

  /**
   * Generate product recommendations
   */
  static async generateProductRecommendations(query: string, availableProducts?: any[]): Promise<ChatResponse> {
    const productsContext = availableProducts ? 
      `Available products: ${JSON.stringify(availableProducts.slice(0, 10))}` : 
      'No specific products available';

    const recommendationPrompt = `
You are a product recommendation AI for ALL VERSE GPT marketplace. 

User is looking for: "${query}"

${productsContext}

Please provide:
1. Relevant product categories to search
2. Search tips and keywords
3. General advice about finding similar products
4. Any marketplace features that might help

Keep the response helpful and actionable.
    `;

    return this.generateResponse(recommendationPrompt);
  }

  /**
   * Generate search suggestions
   */
  static async generateSearchSuggestions(query: string): Promise<string[]> {
    try {
      const prompt = `
Generate 4 interactive search suggestions for a marketplace based on this query: "${query}"

The suggestions should be:
- Short and actionable (2-4 words)
- Clickable button-style options
- Relevant to what the user is looking for
- Include specific categories or actions

Examples: "Show Electronics", "Find Laptops", "Browse Fashion", "See Deals"

Return only the suggestions, one per line, without numbering or bullets.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 4);
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [
        'Show Electronics',
        'Browse Fashion', 
        'Find Deals',
        'See All Items'
      ];
    }
  }

  /**
   * Generate price suggestions
   */
  static async generatePriceSuggestion(productTitle: string, productDescription: string, category: string): Promise<ChatResponse> {
    const pricePrompt = `
You are a pricing expert for ALL VERSE GPT marketplace. Help suggest a fair price for this product:

Title: "${productTitle}"
Description: "${productDescription}"
Category: "${category}"

Please provide:
1. Suggested price range (low to high)
2. Reasoning for the price
3. Tips for competitive pricing
4. Market considerations

Keep the response practical and helpful for sellers.
    `;

    return this.generateResponse(pricePrompt);
  }
}

export default GeminiService;
