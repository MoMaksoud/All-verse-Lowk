import { GoogleGenerativeAI } from '@google/generative-ai';
// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable is required. Please add it to your .env.local file.');
}

const genAI = new GoogleGenerativeAI(apiKey);

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
    - Guide users toward refining their search by price or condition.
    - If key info is missing (budget, category, or item type), ask one short clarifying question before giving results.
    
    Style rules:
    - Keep answers concise: 1-3 short sentences, followed by 3-5 plain-text suggestions, each on a new line.
    - Use plain text only — no emojis, formatting, or bullets.
    - Never make up listings or prices.
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      console.log('✅ Gemini model initialized');

      // Build conversation history if provided
      let fullPrompt = systemPrompt;
      if (conversationHistory && conversationHistory.length > 0) {
        const historyText = conversationHistory
          .map((msg: any) => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.parts?.[0]?.text || msg.content || ''}`;
          })
          .join('\n\n');
        fullPrompt = `${systemPrompt}\n\nPrevious conversation:\n${historyText}\n\nCurrent message:\n${userMessage}`;
      } else {
        fullPrompt = `${systemPrompt}\n\n${userMessage}`;
      }

      console.log('🔵 Calling Gemini generateContent, prompt length:', fullPrompt.length);
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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
