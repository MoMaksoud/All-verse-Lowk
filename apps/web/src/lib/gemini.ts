import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization function to avoid module-level errors
function getGenAI() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable is required. Please add it to your .env.local file.');
  }
  
  return new GoogleGenerativeAI(apiKey);
}

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
   * Generate AI response based on role (buyer or seller) and user message
   * This is the main entry point for role-based AI interactions
   * @param role - 'buyer' or 'seller'
   * @param userMessage - The user's message
   * @param conversationHistory - Previous conversation messages
   * @param listingsContext - Optional database listings context (for buyer mode)
   * @param mediaUrl - Optional media URL (image or video)
   * @param mediaType - Optional media type ('image' or 'video')
   */
  static async generateAIResponse(
    role: 'buyer' | 'seller', 
    userMessage: string,
    conversationHistory: any[] = [],
    listingsContext: string = '',
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ): Promise<string> {
    // Define system prompts for each role
    const buyerPrompt = `
    You are the ALL VERSE GPT Buyer Assistant for the AllVerse marketplace.

    Your sole purpose is to help users find, compare, and decide on items within the AllVerse marketplace.
    You have access to the current listings in our database and must use ONLY those listings when answering questions.
    
    CRITICAL RULES:
    - You MUST only reference listings that are provided in the database context below.
    - NEVER make up, invent, or hallucinate listings, prices, or products.
    - If a user asks about something not in the listings, say "I don't see that item in our current listings, but here are similar items..." or "That item isn't currently available, but we have..."
    - If no listings match the query, be honest: "I don't see any listings matching that description right now."
    
    LISTING RECOMMENDATIONS:
    - When recommending items from the marketplace, ALWAYS return a JSON object with this exact format:
      {
        "message": "Here are the closest items I found:",
        "type": "listings",
        "items": [
          {
            "title": "Listing Title",
            "price": 85,
            "image": "https://image-url.com/image.jpg",
            "url": "/listing/listing_id"
          }
        ]
      }
    - Include 2-6 relevant listings from the database context.
    - Extract the listing ID from the database context (format: "ID: abc123").
    - Use the actual title, price from the database.
    - For image URL, use the exact Image URL from the database context.
    - For url, use the format "/listings/{listing_id}" (note: use "listings" plural, not "listing").
    - If you cannot find matching listings, return a regular text response instead.
    
    Core goals:
    - Help buyers quickly discover relevant listings from our ACTUAL database.
    - Provide specific listings with titles, prices, and categories from the database context.
    - Guide users toward refining their search by price or condition.
    - If key info is missing (budget, category, or item type), ask one short clarifying question before giving results.
    
    Style rules:
    - Keep answers concise: 1-3 short sentences, followed by specific listings from the database.
    - When mentioning listings, include: title, price, category, and condition.
    - Use plain text only — no emojis, formatting, or bullets (except for JSON responses).
    - If a query is not about buying or finding items, respond with:
      "This AI is only for helping buyers on AllVerse. Please switch to Seller mode for other questions."
    
    Always end with a short, friendly call-to-action question (unless returning listing recommendations).
    `;

const sellerPrompt = `
You are the ALL VERSE GPT Seller Assistant.

Your sole purpose is to help users create, optimize, and price their listings on the AllVerse marketplace.
If a user asks anything unrelated to selling, listings, or pricing, politely refuse and remind them that this chat is for sellers only.

Core goals:
- Help sellers write better titles, descriptions, and tags.
- Suggest realistic, data-informed prices and highlight how to make listings stand out.
- Recommend improvements to photos, category choice, and delivery method.
- If missing key info (title, item condition, or category), ask one brief clarifying question before giving advice.

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
      console.log('🔵 Initializing Gemini model...');
      const genAI = getGenAI();
      console.log('✅ Gemini model initialized');

      // Build conversation history if provided
      let fullPrompt = systemPrompt;
      
      // Add listings context for buyer mode
      if (role === 'buyer' && listingsContext) {
        fullPrompt = `${systemPrompt}${listingsContext}`;
      }
      
      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        const historyText = conversationHistory
          .map((msg: any) => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            let content = msg.parts?.[0]?.text || msg.content || '';
            // Include media info in history
            if (msg.mediaUrl) {
              content = `${content}\n[User submitted ${msg.mediaType || 'media'}. URL: ${msg.mediaUrl}]`;
            }
            return `${role}: ${content}`;
          })
          .join('\n\n');
        fullPrompt = `${fullPrompt}\n\nPrevious conversation:\n${historyText}\n\nCurrent message:\n${userMessage}`;
      } else {
        fullPrompt = `${fullPrompt}\n\nCurrent message:\n${userMessage}`;
      }

      // Add media URL to current message if present
      if (mediaUrl && mediaType) {
        fullPrompt = `${fullPrompt}\n\n[User submitted ${mediaType}. URL: ${mediaUrl}]`;
      }

      console.log('🔵 Calling Gemini generateContent, prompt length:', fullPrompt.length);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(fullPrompt);
      console.log('✅ Gemini generateContent completed');
      const response = await result.response;
      const text = response.text();
      console.log('✅ Gemini response text extracted, length:', text?.length);
      return text;
    } catch (error: any) {
      console.error('❌ AI Response Error:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        status: error?.status,
        stack: error?.stack
      });
      
      // Check for specific error types
      if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
        throw new Error('GEMINI_API_KEY is invalid. Please check your API key configuration.');
      }
      
      if (error?.message?.includes('quota') || error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
        throw new Error('AI service quota exceeded. Please try again later.');
      }
      
      if (error?.message?.includes('PERMISSION_DENIED') || error?.status === 403) {
        throw new Error('AI service access denied. Please check your API key permissions.');
      }
      
      // Check for 404/model not found errors
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('NOT_FOUND') || error?.message?.includes('not found')) {
        throw new Error('Gemini model not found. The model name may be incorrect or the API version may have changed.');
      }
      
      // Check for network/connection errors
      if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('ETIMEDOUT') || error?.message?.includes('ECONNREFUSED') || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
        throw new Error('Unable to connect to Gemini API. Please check your internet connection.');
      }
      
      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI response';
      throw new Error(`Gemini API error: ${errorMessage}`);
    }
  }

  /**
   * Generate a response from Gemini AI
   */
  static async generateResponse(prompt: string): Promise<ChatResponse> {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      return {
        message: response.text(),
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

}

export default GeminiService;
