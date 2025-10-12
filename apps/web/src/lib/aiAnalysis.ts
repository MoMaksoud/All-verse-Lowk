import { GoogleGenerativeAI } from '@google/generative-ai';
import { SimpleImageAnalysis } from './simpleImageAnalysis';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0,
    topK: 1,
    topP: 0.1,
    responseMimeType: "application/json"
  }
  
}) : null;

export interface ProductAnalysis {
  title: string;
  description: string;
  category: 'electronics' | 'fashion' | 'home' | 'sports' | 'automotive' | 'toys' | 'beauty' | 'appliances' | 'books' | 'tools' | 'other';
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  suggestedPrice: number;
  confidence: number;
  features: string[];
  brand: string;
  model: string;
  missingInfo?: string[]; // Information that needs to be gathered from the user
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
  static async analyzeProductPhotos(imageUrls: string[], location?: string): Promise<ProductAnalysis> {
    console.log('🤖 Starting analyzeProductPhotos with:', imageUrls.length, 'images');
    console.log('🤖 Image URLs:', imageUrls);
    console.log('🤖 Location:', location || 'Not specified');
    
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
      You are a VISUAL PRODUCT LISTER for ALL VERSE GPT. Your job is to (A) extract only what is visibly true from the image(s), then (B) craft a concise, buyer-ready listing that a human can post immediately, with clearly marked placeholders for any info not visible (e.g., storage, battery %, carrier).

      ${location ? `LOCATION CONTEXT: This item is being sold in ${location}, USA. Consider US regional pricing differences and local market conditions when suggesting prices. Focus on US marketplace data (eBay, Facebook Marketplace, Craigslist, OfferUp, etc.).` : 'LOCATION CONTEXT: This item is being sold in the United States. Use US marketplace pricing data and regional cost of living differences within the US.'}

      Rules:
      - Use ONLY visible evidence (logos, model text, ports, buttons, materials, labels, barcodes, regulatory marks). Include OCR of readable text exactly as seen.
      - You MUST output a single, seller-ready listing even if some attributes are unknown. For unknowns, insert a bracketed placeholder like "[enter storage]" instead of guessing.
      - If model cannot be proven, name the closest accurate level (e.g., "Apple iPhone Pro series (likely 15/16)") AND include 2–3 visible cues that led you there in the evidence section.
      - Never invent condition, price, storage, battery %, carrier, or accessories if not visible. Use placeholders.
      - Do NOT include usage duration placeholders like "Worn for [enter duration]" in descriptions.
      - Tone: clear, trustworthy, concise. No emojis. No hype words. No promises about warranties unless visible.
      - Consider US regional pricing: items in major US cities (NYC, LA, SF) typically command higher prices than rural areas or smaller cities.
      - CONSISTENCY RULES: The value of listing_ready.condition must NEVER contradict the wording in title/description/evidence. If any condition words appear in the title (e.g., "good condition", "like new", "new"), REMOVE them from the title and set listing_ready.condition accordingly. When uncertain, set condition to "unknown" rather than guessing.

      Return ONLY valid JSON with this exact structure:

      {
        "evidence": {
          "brand": "string|null",
          "product_type": "string|null",
          "model_exact": "string|null",
          "model_range": "string|null", 
          "variant_or_colorway": "string|null",
          "visible_features": ["USB-C port", "triple camera", "LiDAR", "matte frame"],
          "ocr_text": ["raw", "tokens", "exactly", "as", "seen"],
          "regulatory_marks": ["CE", "FCC ID ..."],
          "decisive_cues": ["what cues distinguish this from close models"],
          "confidence": 0.0
        },

        "listing_ready": {
          "platform_style": "facebook_marketplace", 
          "title": "Short, specific. Include brand + model + key spec (capacity/size/color). DO NOT include condition or price in the title",
          "description": "2–5 short lines, seller perspective. Only visible facts + placeholders for unknowns.",
          "bullets": [
            "• Visible feature 1",
            "• Visible feature 2",
            "• [enter storage] GB",
            "• Battery health: [enter battery%]",
            "• Carrier/lock: [enter carrier or 'unlocked']",
            "• Color/variant: <from evidence or [enter color]>"
          ],
          "condition": "new|like-new|good|fair|poor|unknown",
          "suggested_price": null,
          "placeholders_needed": [
            "storage_gb",
            "battery_health_percent",
            "carrier_or_lock_status",
            "accessories_included",
            "original_box_yes_no",
            "purchase_year_or_receipt",
            "scratches_or_damage_notes"
          ],
          "contextual_questions": [
            "What size is this item?",
            "What condition is this item in?",
            "What color is this item?"
          ],
          "optional_sections": {
            "included_items_line": "Includes: [enter items, e.g., cable/case/box]",
            "meetup_location_line": "Pickup/meetup: [enter area]",
            "pricing_policy_line": "Price: [enter price] (firm/obo)"
          }
        }
      }

      IMPORTANT: Generate contextual_questions based on the specific product type you identify:

      For SHOES/SNEAKERS:
      - "What size are these shoes?"
      - "What condition are these shoes in?"
      - "What color are these shoes?"
      - "How long have you worn these shoes?"
      - "Do you have the original box?"

      For PHONES/SMARTPHONES:
      - "What storage capacity does this phone have?"
      - "What is the battery health percentage?"
      - "What carrier is this phone locked to?"
      - "What condition is this phone in?"
      - "Do you have the original box and charger?"

      For CLOTHING:
      - "What size is this item?"
      - "What condition is this item in?"
      - "What color is this item?"
      - "How long have you worn this item?"
      - "What material is this made of?"

      For ELECTRONICS (laptops, tablets, etc.):
      - "What storage capacity does this have?"
      - "What is the battery health percentage?"
      - "What condition is this device in?"
      - "Do you have the original box and accessories?"

      For OTHER ITEMS:
      - "What condition is this item in?"
      - "What color is this item?"
      - "How long have you used this item?"
      - "Do you have the original packaging?"

      Process to follow BEFORE writing listing:
      1) Extract evidence from the image(s).
      2) Identify the specific product type (shoes, phone, clothing, etc.)
      3) Generate 3-5 contextual questions relevant to that product type
      4) Decide the strongest support level:
        - If an exact model is visible → set evidence.model_exact.
        - If not exact but clearly within a narrow family (e.g., iPhone 16 Pro vs 15 Pro) → set evidence.model_range and include decisive_cues.
      5) Compose the listing:
        - Title: "Brand Model (Variant) — [enter storage]GB — [enter carrier/unlocked]"
        - Description (2–5 lines): What it is, visible highlights, honest condition, transaction details (meetup/cash). Do NOT include usage duration placeholders.
        - Bullets: Short, scannable, with placeholders for unknowns.
      6) Never invent numbers or claims. Use placeholders instead.
      7) Consider US regional pricing factors for the location when suggesting prices. Use US marketplace data only.

      Return ONLY the JSON.
      `;

      console.log(`🤖 Sending ${validImages.length} images to AI for analysis...`);
      const result = await model.generateContent([prompt, ...validImages]);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Raw AI response:', text);

      // Clean and parse JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🤖 Cleaned AI response:', cleanText);
      
      let analysis;
      try {
        analysis = JSON.parse(cleanText);
      console.log('🤖 Parsed AI analysis:', analysis);
      } catch (parseError) {
        console.error('🤖 JSON parsing failed:', parseError);
        console.error('🤖 Raw text that failed to parse:', cleanText);
        throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }

      // Validate and enhance the analysis - handle new format
      const validCategories = ['electronics', 'fashion', 'home', 'sports', 'automotive', 'toys', 'beauty', 'appliances', 'books', 'tools', 'other'];
      const validConditions = ['new', 'like-new', 'good', 'fair', 'poor', 'unknown'];
      
      // Handle new listing-ready format
      if (analysis.listing_ready) {
        const listing = analysis.listing_ready;
        const evidence = analysis.evidence || {};
        
        // Clean description to remove usage duration placeholders
        let cleanDescription = listing.description || 'Product in good condition';
        cleanDescription = cleanDescription.replace(/Worn for \[enter duration\]\.?/gi, '').trim();
        cleanDescription = cleanDescription.replace(/Used for \[enter duration\]\.?/gi, '').trim();
        cleanDescription = cleanDescription.replace(/\[enter duration\]/gi, '').trim();
        
        // Map product type to category
        let mappedCategory: 'electronics' | 'fashion' | 'home' | 'sports' | 'automotive' | 'toys' | 'beauty' | 'appliances' | 'books' | 'tools' | 'other' = 'other';
        if (evidence.product_type) {
          const productType = evidence.product_type.toLowerCase();
          if (productType.includes('sneaker') || productType.includes('shoe') || productType.includes('footwear')) {
            mappedCategory = 'fashion';
          } else if (productType.includes('phone') || productType.includes('smartphone') || productType.includes('mobile')) {
            mappedCategory = 'electronics';
          } else if (productType.includes('laptop') || productType.includes('computer') || productType.includes('tablet')) {
            mappedCategory = 'electronics';
          } else if (productType.includes('clothing') || productType.includes('apparel') || productType.includes('shirt') || productType.includes('pants')) {
            mappedCategory = 'fashion';
          } else if (productType.includes('furniture') || productType.includes('home') || productType.includes('decor')) {
            mappedCategory = 'home';
          } else if (productType.includes('sport') || productType.includes('fitness') || productType.includes('gym')) {
            mappedCategory = 'sports';
          } else if (productType.includes('car') || productType.includes('auto') || productType.includes('vehicle')) {
            mappedCategory = 'automotive';
          }
        }
        
        // Handle condition - if unknown, provide a reasonable default based on product type
        let mappedCondition = listing.condition;
        if (!validConditions.includes(mappedCondition) || mappedCondition === 'unknown') {
          // For new items like sneakers, default to 'new' if brand is recognizable
          if (evidence.brand && (evidence.brand.toLowerCase().includes('nike') || evidence.brand.toLowerCase().includes('adidas') || evidence.brand.toLowerCase().includes('apple'))) {
            mappedCondition = 'new'; // Use lowercase format to match dropdown values
          } else {
            mappedCondition = 'good'; // Use lowercase format to match dropdown values
          }
        }
        
        // Convert condition to dropdown format if needed
        if (mappedCondition === 'like-new') {
          mappedCondition = 'like-new'; // Already correct
        } else if (mappedCondition === 'New') {
          mappedCondition = 'new';
        } else if (mappedCondition === 'Like New') {
          mappedCondition = 'like-new';
        } else if (mappedCondition === 'Good') {
          mappedCondition = 'good';
        } else if (mappedCondition === 'Fair') {
          mappedCondition = 'fair';
        } else if (mappedCondition === 'Poor') {
          mappedCondition = 'poor';
        }

        return {
          title: listing.title || 'Product Item',
          description: cleanDescription,
          category: mappedCategory,
          condition: mappedCondition,
          suggestedPrice: listing.suggested_price || 100,
          confidence: Math.max(0.1, Math.min(1.0, evidence.confidence || 0.8)),
          features: evidence.visible_features || ['Quality item'],
          brand: evidence.brand || 'Various',
          model: evidence.model_exact || evidence.model_range || 'Standard',
          missingInfo: listing.contextual_questions || listing.placeholders_needed || [],
          marketResearch: {
            averagePrice: listing.suggested_price || 100,
            priceRange: { min: Math.round((listing.suggested_price || 100) * 0.8), max: Math.round((listing.suggested_price || 100) * 1.2) },
            marketDemand: 'medium' as const,
            competitorCount: 10
          }
        };
      }
      
      // Handle legacy format
      const suggestedPrice = analysis.pricing?.suggestedPrice || analysis.suggestedPrice || 100;
      const hasPricing = analysis.pricing?.suggestedPrice !== null && analysis.pricing?.suggestedPrice !== undefined;
      
      // Build features from visible attributes if available
      const features = [];
      if (analysis.visible_attributes?.features) {
        features.push(...analysis.visible_attributes.features);
      }
      if (analysis.visible_attributes?.materials) {
        features.push(...analysis.visible_attributes.materials);
      }
      if (Array.isArray(analysis.features)) {
        features.push(...analysis.features);
      }
      if (features.length === 0) {
        features.push('Quality item');
      }

      // Clean description to remove usage duration placeholders
      let cleanDescription = analysis.description || 'Product in good condition';
      cleanDescription = cleanDescription.replace(/Worn for \[enter duration\]\.?/gi, '').trim();
      cleanDescription = cleanDescription.replace(/Used for \[enter duration\]\.?/gi, '').trim();
      cleanDescription = cleanDescription.replace(/\[enter duration\]/gi, '').trim();

      return {
        title: analysis.title || 'Product Item',
        description: cleanDescription,
        category: validCategories.includes(analysis.category) ? analysis.category : 'other',
        condition: validConditions.includes(analysis.condition) ? analysis.condition : 'good',
        suggestedPrice: Math.max(10, suggestedPrice),
        confidence: Math.max(0.1, Math.min(1.0, analysis.confidence || 0.8)),
        features: features.slice(0, 5), // Limit to 5 features
        brand: analysis.brand || 'Various',
        model: analysis.model || 'Standard',
        missingInfo: analysis.missingInfo || [],
        marketResearch: {
          averagePrice: analysis.marketResearch?.averagePrice || suggestedPrice,
          priceRange: analysis.marketResearch?.priceRange || { min: Math.round(suggestedPrice * 0.8), max: Math.round(suggestedPrice * 1.2) },
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
        missingInfo: ['size', 'condition', 'usage'],
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
      missingInfo: ['size', 'condition', 'usage'],
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