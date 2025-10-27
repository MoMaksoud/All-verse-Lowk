import { GoogleGenAI } from '@google/genai';
// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable is required. Please add it to your .env.local file.');
}

const ai = new GoogleGenAI({apiKey: apiKey});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
  listings?: any[];
}

export class GeminiService {
  /**
   * Generate AI response based on role (buyer or seller) and user message
   * This is the main entry point for role-based AI interactions
   */
  static async generateAIResponse(
    role: 'buyer' | 'seller', 
    userMessage: string,
    conversationHistory: any[] = []
    
  ): Promise<string> {
    // Define system prompts for each role
    const buyerPrompt = `
    You are the ALL VERSE GPT Buyer Assistant.

    Your sole purpose is to help users find, compare, and decide on items within the AllVerse marketplace.
    If a user asks about anything unrelated to buying, browsing, or product discovery, politely decline and remind them that this chat is for buyers only.
    
    Core goals:
    - Help buyers quickly discover relevant listings, categories, or item types.
    - Provide clear, concrete suggestions (3-5 items, keywords, or product ideas) based on their query.
    - Guide users toward refining their search by price, location, or condition.
    - If key info is missing (budget, category, or item type), ask one short clarifying question before giving results.
    
    Style rules:
    - Keep answers concise: 1-3 short sentences, followed by 3-5 plain-text suggestions, each on a new line.
    - Use plain text only — no emojis, formatting, or bullets.
    - Never make up listings, prices, or locations.
    - If a query is not about buying or finding items, respond with:
      "This AI is only for helping buyers on AllVerse. Please switch to Seller mode for other questions."
    
    Always end with a short, friendly call-to-action question.
    `;

const sellerPrompt = `
You are the ALL VERSE GPT Seller Assistant.

Your sole purpose is to help users create, optimize, and price their listings on the AllVerse marketplace.
If a user asks anything unrelated to selling, listings, or pricing, politely refuse and remind them that this chat is for sellers only.

Core goals:
- Help sellers write better titles, descriptions, and tags.
- Suggest realistic, data-informed prices and highlight how to make listings stand out.
- Recommend improvements to photos, category choice, and delivery method.
- If missing key info (title, item condition, category, or location), ask one brief clarifying question before giving advice.

Style rules:
- Keep responses short and to the point: 1-3 clear sentences.
- Follow with 3-4 concise action items or next steps, each on its own line.
- Plain text only — no emojis, no markdown formatting.
- Never give legal, financial, or guarantee-based statements.
- If the user tries to discuss something non-selling-related, respond with:
  "This AI is only for helping sellers on AllVerse. Please switch to Buyer mode for other questions."

Always end with a short, encouraging call-to-action question.
`;

    const systemPrompt = role === 'buyer' ? buyerPrompt : sellerPrompt;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [
          ...conversationHistory,
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ]
      });

      return response.text ?? '';
    } catch (error: any) {
      console.error('AI Response Error:', error);
      
      // Check for quota/rate limit errors
      if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        throw new Error('AI service quota exceeded. Please try again later.');
      }
      
      throw new Error(error instanceof Error ? error.message : 'Failed to generate AI response');
    }
  }

  /**
   * Generate a response from Gemini AI
   */
  static async generateResponse(prompt: string): Promise<ChatResponse> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      return {
        message: response.text ?? '',
        success: true
      };
    } catch (error: any) {
      console.error('Gemini AI Error:', error);
      
      // Check for quota/rate limit errors
      if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        throw new Error('AI service quota exceeded. Please try again later.');
      }
      
      return {
        message: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle common requests with quick responses
   */
  static async handleQuickRequest(): Promise<ChatResponse> { return { message: '', success: false }; }

  // marketplace-specific helpers removed as unused

  /**
   * Generate product recommendations
   */
  static async generateProductRecommendations(): Promise<ChatResponse> { return { message: '', success: false }; }

  /**
   * Generate search suggestions
   */
  static async generateSearchSuggestions(): Promise<string[]> { return []; }

  static async generatePriceSuggestion(): Promise<ChatResponse> { return { message: '', success: false }; }

  /**
   * Generate intelligent listings based on user query using Gemini AI
   */
  static async generateIntelligentListings(query: string): Promise<ChatResponse> {
    const listingsPrompt = `
      You are an intelligent product curator for ALL VERSE GPT marketplace! 🎯

      User query: "${query}"

      Generate 4-6 realistic product listings that would match this search. Each listing MUST be a JSON object with these exact fields (strict types/values):

      {
        "id": "unique-id",
        "title": "Specific Product Name and key spec (size/capacity/color). DO NOT include price or condition words",
        "price": {"value": number, "currency": "USD"},
        "condition": "New|Like New|Excellent|Good|Fair",
        "seller": {"id": "seller-id", "name": "Seller Name"},
        "imageUrl": "https://images.unsplash.com/photo-[relevant-photo-id]?w=400&h=300&fit=crop",
        "url": "/listings/unique-id",
        "category": "electronics|fashion|home|sports|automotive|books|other",
        "badges": ["Trending"|"New"|"Hot"|"Popular"|"Deal"|"Best Seller"],
        "location": "City, State",
        "createdAt": "2025-01-XXTXX:XX:XX.000Z",
        "score": 0.XX
      }

      ENHANCED GUIDELINES:
      - Make titles VERY specific: "iPhone 13 Pro 128GB Space Gray" not "iPhone"
      - Include model numbers, sizes, colors when relevant
      - Price ranges: Electronics $50-2000, Fashion $15-500, Home $25-800, Sports $20-400, Books $5-50
      - Use realistic seller names: "TechDeals", "FashionForward", "HomeDecor", "SportsGear", "BookLover"
      - Choose appropriate Unsplash photo IDs for each product type
      - Use Florida cities: Miami, Tampa, Orlando, Jacksonville, Fort Lauderdale
      - Score should be 0.85-0.98 for relevance
      - Make badges contextually relevant to the product and query

      VALIDATION RULES:
      - Titles must not contain words like "new", "like new", "good condition", or prices.
      - category MUST be lowercase and one of: electronics, fashion, home, sports, automotive, books, other
      - price.value MUST be a number (no strings); currency MUST be "USD"
      - badges MUST be an array with 0-2 values chosen from the allowed list
      - location format: "City, ST" (two-letter US state code)

      Return ONLY a raw JSON array with no prose and no markdown fences.

      Examples based on query context:
      - "iPhone" → iPhone 13 Pro, iPhone 14, iPhone SE, AirPods
      - "laptop" → MacBook Pro, Dell XPS, HP Pavilion, Gaming Laptop
      - "shoes" → Nike Air Max, Adidas Ultraboost, Converse Chuck Taylor
      - "trending" → Mix of popular items across categories
      - "deals" → Items under $200 with "Deal" badges
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: listingsPrompt,
      });
      const text = result.text ?? '';

      // Clean and parse JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const listings = JSON.parse(cleanText);

      // Validate and enhance listings
      const validatedListings = listings.map((listing: any, index: number) => ({
        id: listing.id || `ai-listing-${index + 1}`,
        title: listing.title || 'Product Item',
        price: {
          value: Math.max(10, Math.min(2000, listing.price?.value || 100)),
          currency: 'USD'
        },
        condition: ['New', 'Like New', 'Excellent', 'Good', 'Fair'].includes(listing.condition) 
          ? listing.condition : 'Good',
        seller: {
          id: listing.seller?.id || `seller-${index + 1}`,
          name: listing.seller?.name || 'Local Seller'
        },
        imageUrl: listing.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
        url: listing.url || `/listings/ai-listing-${index + 1}`,
        category: ['electronics', 'fashion', 'home', 'sports', 'automotive', 'books', 'other'].includes(listing.category)
          ? listing.category : 'other',
        badges: Array.isArray(listing.badges) ? listing.badges.slice(0, 2) : ['Popular'],
        location: listing.location || 'Miami, FL',
        createdAt: listing.createdAt || new Date().toISOString(),
        score: Math.max(0.8, Math.min(0.98, listing.score || 0.9))
      }));

      return {
        message: `Found ${validatedListings.length} relevant listings!`,
        success: true,
        listings: validatedListings
      };
    } catch (error: any) {
      console.error('Gemini listings generation error:', error);
      
      // Check for quota errors
      if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        throw new Error('AI service quota exceeded. Please try again later.');
      }
      
      return {
        message: 'Unable to generate listings at this time.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default GeminiService;
