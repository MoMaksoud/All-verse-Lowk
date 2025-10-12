import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY environment variable is required. Please add it to your .env.local file.');
}

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
  listings?: any[];
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
    } catch (error: any) {
      console.error('Gemini AI Error:', error);
      
      // Check for quota/rate limit errors
      if (error.message?.includes('quota') || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        throw new Error('AI service quota exceeded. Please try again later.');
      }
      
      return {
        message: 'Let me help you with that! 🛍️\n\nFind Deals\nTrending Items\nBrowse Categories\nPopular Items\n\nWhat interests you?',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle common requests with quick responses
   */
  static async handleQuickRequest(userMessage: string): Promise<ChatResponse> {
    const message = userMessage.toLowerCase().trim();
    
    // Handle trending items
    if (message.includes('trending') || message.includes('trending items')) {
      const trendingListings = this.getOrganizedListings().slice(0, 4);
      const listingsText = trendingListings.map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `🔥 Trending now!\n\n${listingsText}\n\nWant to see more?`,
        success: true,
        listings: trendingListings
      };
    }
    
    // Handle deals request
    if (message.includes('deals') || message.includes('find deals')) {
      const dealListings = this.getOrganizedListings().filter(listing => listing.price < 500);
      const listingsText = dealListings.slice(0, 4).map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `💰 Great deals available!\n\n${listingsText}\n\nWant to see more deals?`,
        success: true,
        listings: dealListings.slice(0, 4)
      };
    }
    
    // Handle categories request
    if (message.includes('categories') || message.includes('browse')) {
      return {
        message: '📂 Browse by category!\n\nElectronics\nFashion\nHome\nSports\n\nWhich interests you?',
        success: true
      };
    }
    
    // Handle specific category requests
    if (message.includes('electronics')) {
      const electronicsListings = this.getOrganizedListings('Electronics');
      const listingsText = electronicsListings.map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `📱 Electronics listings!\n\n${listingsText}\n\nWant to see more?`,
        success: true,
        listings: electronicsListings
      };
    }
    
    if (message.includes('fashion')) {
      const fashionListings = this.getOrganizedListings('Fashion');
      const listingsText = fashionListings.map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `👗 Fashion listings!\n\n${listingsText}\n\nWant to see more?`,
        success: true,
        listings: fashionListings
      };
    }
    
    if (message.includes('home')) {
      const homeListings = this.getOrganizedListings('Home');
      const listingsText = homeListings.map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `🏠 Home listings!\n\n${listingsText}\n\nWant to see more?`,
        success: true,
        listings: homeListings
      };
    }
    
    if (message.includes('sports')) {
      const sportsListings = this.getOrganizedListings('Sports');
      const listingsText = sportsListings.map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `⚽ Sports listings!\n\n${listingsText}\n\nWant to see more?`,
        success: true,
        listings: sportsListings
      };
    }
    
    // Handle popular items
    if (message.includes('popular') || message.includes('what\'s popular')) {
      const popularListings = this.getOrganizedListings().slice(4, 8); // Get different items
      const listingsText = popularListings.map(listing => 
        `${listing.title}\nPrice: $${listing.price} | Condition: ${listing.condition}\nSeller: ${listing.seller}`
      ).join('\n\n');
      
      return {
        message: `⭐ Popular items!\n\n${listingsText}\n\nWhat catches your eye?`,
        success: true,
        listings: popularListings
      };
    }
    
    return { message: '', success: false };
  }

  /**
   * Handle specific product clicks and show listings
   */
  static async handleProductClick(productName: string): Promise<ChatResponse> {
    const product = productName.toLowerCase().trim();
    
    // Map product names to actual listings
    const productListings: { [key: string]: string } = {
      'iphone 13 pro': 'iPhone 13 Pro - Like New\nPrice: $899\nCondition: Excellent\nSeller: TechDeals\n\nClick to view full listing!',
      'nike air max 270': 'Nike Air Max 270 - Size 10\nPrice: $120\nCondition: Good\nSeller: SneakerHead\n\nClick to view full listing!',
      'designer handbag': 'Designer Handbag - Authentic\nPrice: $450\nCondition: Like New\nSeller: FashionForward\n\nClick to view full listing!',
      'macbook pro': 'MacBook Pro 14-inch - M2 Chip\nPrice: $1,299\nCondition: Excellent\nSeller: AppleReseller\n\nClick to view full listing!',
      'gaming laptop': 'Gaming Laptop - RTX 4060\nPrice: $1,199\nCondition: New\nSeller: GameTech\n\nClick to view full listing!',
      'smart watch': 'Smart Watch - Series 8\nPrice: $299\nCondition: Good\nSeller: WatchWorld\n\nClick to view full listing!',
      'coffee table': 'Modern Coffee Table - Oak\nPrice: $180\nCondition: Excellent\nSeller: HomeDecor\n\nClick to view full listing!',
      'tennis racket': 'Wilson Tennis Racket - Pro Staff\nPrice: $89\nCondition: Like New\nSeller: SportsPro\n\nClick to view full listing!'
    };

    const listing = productListings[product];
    if (listing) {
      return {
        message: `Here's what I found for ${productName}:\n\n${listing}`,
        success: true
      };
    }

    // Fallback for unknown products
    return {
      message: `Let me search for ${productName} listings!\n\nSearching...\n\nFound 3 listings for ${productName}\n\nClick to view all listings!`,
      success: true
    };
  }

  /**
   * Get organized listings for AI page display
   */
  static getOrganizedListings(category?: string): any[] {
    const allListings = [
      {
        id: '1',
        title: 'iPhone 13 Pro - Like New',
        price: 899,
        condition: 'Excellent',
        seller: 'TechDeals',
        category: 'Electronics',
        image: '/images/iphone-14.jpg',
        description: 'Unlocked iPhone 13 Pro in excellent condition'
      },
      {
        id: '2',
        title: 'Nike Air Max 270 - Size 10',
        price: 120,
        condition: 'Good',
        seller: 'SneakerHead',
        category: 'Fashion',
        image: '/images/air-max-270.avif',
        description: 'Comfortable running shoes, barely worn'
      },
      {
        id: '3',
        title: 'Designer Handbag - Authentic',
        price: 450,
        condition: 'Like New',
        seller: 'FashionForward',
        category: 'Fashion',
        image: '/images/Alexa.jpeg',
        description: 'Authentic designer handbag with original tags'
      },
      {
        id: '4',
        title: 'MacBook Pro 14-inch - M2 Chip',
        price: 1299,
        condition: 'Excellent',
        seller: 'AppleReseller',
        category: 'Electronics',
        image: '/images/macbook-m2.jpg',
        description: 'Latest MacBook Pro with M2 chip, perfect condition'
      },
      {
        id: '5',
        title: 'Gaming Laptop - RTX 4060',
        price: 1199,
        condition: 'New',
        seller: 'GameTech',
        category: 'Electronics',
        image: '/images/macbook-m2.jpg',
        description: 'High-performance gaming laptop, brand new'
      },
      {
        id: '6',
        title: 'Smart Watch - Series 8',
        price: 299,
        condition: 'Good',
        seller: 'WatchWorld',
        category: 'Electronics',
        image: '/images/Alexa.jpeg',
        description: 'Latest smart watch with health tracking'
      },
      {
        id: '7',
        title: 'Modern Coffee Table - Oak',
        price: 180,
        condition: 'Excellent',
        seller: 'HomeDecor',
        category: 'Home',
        image: '/images/coffeeetable.jpg',
        description: 'Beautiful oak coffee table, perfect for living room'
      },
      {
        id: '8',
        title: 'Wilson Tennis Racket - Pro Staff',
        price: 89,
        condition: 'Like New',
        seller: 'SportsPro',
        category: 'Sports',
        image: '/images/tennis-racket.avif',
        description: 'Professional tennis racket, used only a few times'
      }
    ];

    if (category) {
      return allListings.filter(listing => 
        listing.category.toLowerCase() === category.toLowerCase()
      );
    }

    return allListings;
  }

  /**
   * Generate a short welcome message
   */
  static getWelcomeMessage(): ChatResponse {
    return {
      message: 'Hi! I\'m here to help you find amazing deals! 🛍️\n\nFind Deals\nTrending Items\nBrowse Categories\nPopular Items\n\nWhat are you looking for?',
      success: true
    };
  }

  /**
   * Generate a marketplace-specific response
   */
  static async generateMarketplaceResponse(userMessage: string, context?: any): Promise<ChatResponse> {
    // First check for product clicks
    const productClickResponse = await this.handleProductClick(userMessage);
    if (productClickResponse.success && productClickResponse.message.includes("Here's what I found")) {
      return productClickResponse;
    }
    
    // Then check for quick requests
    const quickResponse = await this.handleQuickRequest(userMessage);
    if (quickResponse.success) {
      return quickResponse;
    }
    
    const userMode = context?.userMode || 'buyer';
    
    const marketplacePrompt = userMode === 'buyer' ? `
        You are a friendly and enthusiastic AI shopping assistant for ALL VERSE GPT marketplace! 🛍️ 

        Your personality:
        - Warm, helpful, and genuinely excited to help users find great deals
        - Use emojis sparingly but effectively to add personality
        - Be conversational and encouraging
        - Show genuine interest in helping users save money and find perfect items

        User message: "${userMessage}"

        Context: ${context ? JSON.stringify(context) : 'No additional context'}

        Respond as if you're a knowledgeable friend who loves shopping and knows all the best deals. Be encouraging and make shopping feel fun and exciting!

        Guidelines:
        - Start responses warmly with emojis
        - Use conversational language
        - Make options feel exciting
        - End with engaging questions

        Examples of well-formatted buyer responses:
        - "Looking for electronics? Here are some popular picks!\n\niPhone 13 Pro - Like New\nPrice: $899 | Condition: Excellent\nSeller: TechDeals\n\nMacBook Pro 14-inch - M2 Chip\nPrice: $1,299 | Condition: Excellent\nSeller: AppleReseller\n\nWhat catches your eye?"
        - "Great deals available!\n\nNike Air Max 270 - Size 10\nPrice: $120 | Condition: Good\nSeller: SneakerHead\n\nModern Coffee Table - Oak\nPrice: $180 | Condition: Excellent\nSeller: HomeDecor\n\nWant to see more deals?"
        - "Trending now!\n\niPhone 13 Pro - Like New\nPrice: $899 | Condition: Excellent\nSeller: TechDeals\n\nNike Air Max 270 - Size 10\nPrice: $120 | Condition: Good\nSeller: SneakerHead\n\nWant to see more?"
        - "Tech essentials!\n\nGaming Laptop - RTX 4060\nPrice: $1,199 | Condition: New\nSeller: GameTech\n\nSmart Watch - Series 8\nPrice: $299 | Condition: Good\nSeller: WatchWorld\n\nWhich interests you?"

        Formatting:
        - Use newlines (\n) to separate items
        - Keep intro short (1 sentence)
        - Show actual listings with prices and details
        - Include: Title, Price, Condition, Seller for each item
        - End with simple question

        Make responses show real listings with details!
            ` : `
        You are a knowledgeable and encouraging AI selling assistant for ALL VERSE GPT marketplace! 💼

        Your personality:
        - Professional yet friendly and supportive
        - Encouraging and optimistic about helping sellers succeed
        - Use emojis sparingly but effectively
        - Show genuine interest in helping users grow their business

        User message: "${userMessage}"

        Context: ${context ? JSON.stringify(context) : 'No additional context'}

        Respond as if you're a successful seller mentor who wants to help others succeed. Be encouraging and make selling feel achievable and exciting!

        Guidelines:
        - Start responses encouragingly with emojis
        - Use supportive language
        - Make strategies feel accessible
        - End with engaging questions

        Examples of well-formatted seller responses:
        - "Ready to boost sales?\n\nPricing Tips\nMarket Analysis\nListing Optimization\nCompetitor Research\n\nWhat's your priority?"
        - "What's your goal?\n\nMore Views\nHigher Sales\nBetter Rankings\nCompetitive Pricing"
        - "Pricing help!\n\nMarket Rates\nCompetitor Prices\nSeasonal Trends\nValue Guide\n\nNeed more guidance?"
        - "Stand out from competitors!\n\nOptimize Listings\nKeyword Research\nPricing Strategy\nMarket Insights\n\nWhich sounds helpful?"

        Formatting:
        - Use line breaks (\n) to separate tools
        - Keep intro short (1 sentence)
        - Present 3-4 clickable options
        - Clean, simple text without formatting
        - End with simple question

        Make responses look like organized tool menus!
            `;

    try {
      return await this.generateResponse(marketplacePrompt);
    } catch (error) {
      console.error('Marketplace response error:', error);
      // Fallback to quick request handling
      const fallbackResponse = await this.handleQuickRequest(userMessage);
      if (fallbackResponse.success) {
        return fallbackResponse;
      }
      // Final fallback
      return {
        message: 'Let me help you find what you need! 🛍️\n\nFind Deals\nTrending Items\nBrowse Categories\nPopular Items\n\nWhat interests you?',
        success: true
      };
    }
  }

  /**
   * Generate product recommendations
   */
  static async generateProductRecommendations(query: string, availableProducts?: any[]): Promise<ChatResponse> {
    const productsContext = availableProducts ? 
      `Available products: ${JSON.stringify(availableProducts.slice(0, 10))}` : 
      'No specific products available';

    const recommendationPrompt = `
      You are an enthusiastic product expert for ALL VERSE GPT marketplace! 🎯

      User is looking for: "${query}"

      ${productsContext}

      Respond as a knowledgeable friend who loves helping people find exactly what they need. Be encouraging and make the search feel exciting!

      Your response should be:
      - Short and focused (1-2 sentences max)
      - Present 3-4 specific clickable product options
      - Use **bold** for clickable items/categories
      - End with a simple call-to-action

      Examples of well-formatted recommendation responses:
      - "Looking for laptops?\n\nGaming Laptop\nBusiness Laptop\nBudget Laptop\nPremium Laptop\n\nWhich type interests you?"
      - "Electronics deals!\n\niPhone 13\nMacBook Pro\nGaming Headset\nSmart Watch\n\nWant to see more?"
      - "Popular items!\n\nAir Max 270\nDesigner Bag\nCoffee Table\nTennis Racket\n\nWhat catches your eye?"
      - "Tech essentials!\n\nLaptops\nPhones\nAccessories\nGaming Gear\n\nNeed help choosing?"

      Formatting:
      - Use line breaks (\n) to separate products
      - Keep intro short (1 sentence)
      - Present 3-4 specific products
      - Clean, simple text without formatting
      - End with simple question

      Make responses look like organized product catalogs!
          `;

    try {
      return await this.generateResponse(recommendationPrompt);
    } catch (error) {
      console.error('Product recommendation error:', error);
      // Fallback response
      return {
        message: 'Let me help you find great products! 🛍️\n\nElectronics\nFashion\nHome\nSports\n\nWhat category interests you?',
        success: true
      };
    }
  }

  /**
   * Generate search suggestions
   */
  static async generateSearchSuggestions(query: string): Promise<string[]> {
    try {
      const prompt = `
        Generate 4 specific product suggestions for ALL VERSE GPT marketplace based on this query: "${query}"

        The suggestions should be:
        - Specific product names or categories (2-3 words)
        - Feel like clickable product listings users want to explore
        - Directly relevant to what the user is searching for
        - Include actual product names when possible
        - Sound like browsing a catalog

        Examples of great product suggestions:
        - "iPhone 13", "MacBook Pro", "Air Max 270", "Gaming Headset"
        - "Coffee Table", "Designer Bag", "Tennis Racket", "Smart Watch"
        - "Gaming Laptop", "Business Laptop", "Budget Phone", "Premium Headphones"

        Make them feel like specific products users can click to view listings!

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

  static async generatePriceSuggestion(
    productTitle: string, 
    productDescription: string, 
    category: string, 
    condition: string = 'Good',
    size: string | null = null
  ): Promise<ChatResponse> {
    const sizeContext = size ? `Size: ${size}` : '';
    const conditionContext = condition ? `Condition: ${condition}` : '';
    
    const pricePrompt = `
      You are a professional pricing expert for ALL VERSE GPT marketplace! 💰

      Help suggest a fair and competitive price for this product:

      Title: "${productTitle}"
      Description: "${productDescription}"
      Category: "${category}"
      ${conditionContext}
      ${sizeContext}

      IMPORTANT SIZE PRICING CONSIDERATIONS:
      - S, M, L sizes have the HIGHEST demand and should be priced at premium
      - XS and XL+ sizes have slightly lower demand - reduce price by 5-15%
      - For shoes: sizes 8, 9, 10 have highest demand (premium pricing)
      - Shoe sizes 6-7 and 12+ have lower demand (reduce by 5-15%)
      - Half sizes (8.5, 9.5) often have premium pricing
      - Size pricing adjustments should be subtle, not dramatic

      Respond as an encouraging mentor who wants to help sellers succeed. Be supportive and make pricing feel manageable!

      Your response should be:
      - Short and focused (2-3 sentences max)
      - Clear price range with brief reasoning
      - One practical tip for competitive pricing
      - End with encouraging next step

      Examples of well-formatted pricing responses:
      - "Great product!\n\nSuggested price: $X-$Y\nBased on market rates\n\nPro tip: Check competitor prices weekly\n\nReady to list?"
      - "Excellent potential!\n\nPrice range: $X-$Y\nFor competitive advantage\n\nTry seasonal pricing strategies\n\nNeed listing help?"
      - "Perfect timing!\n\nSuggested: $X-$Y\nTo maximize profit\n\nUse 'recently sold' filter for market data\n\nWant pricing tools?"

      Formatting:
      - Use line breaks (\n) to separate info
      - Clean, simple text without formatting
      - Keep info on separate lines
      - End with simple question

      Make pricing responses organized and easy to understand!
          `;

    return this.generateResponse(pricePrompt);
  }

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
      const result = await model.generateContent(listingsPrompt);
      const response = await result.response;
      const text = response.text();

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
