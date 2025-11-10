import { createPartFromUri, createUserContent, GoogleGenAI } from '@google/genai';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const genAi = new GoogleGenAI({ apiKey: apiKey });


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
  _evidence?: any; // Full evidence object from Phase 1 for Phase 2 generation
  marketResearch: {
    averagePrice: number;
    priceRange: { min: number; max: number };
    marketDemand: 'high' | 'medium' | 'low';
    competitorCount: number;
  };
}

export class AIAnalysisService {
  /**
   * Analyze product photos and generate product details
   */
  static async analyzeProductPhotos(imageUrls: string[], location?: string): Promise<ProductAnalysis | undefined> {
    const prompt = `
      You are a VISUAL PRODUCT LISTER for ALL VERSE GPT. Your job is to (A) extract only what is visibly true from the image(s), then (B) craft a concise, buyer-ready listing that a human can post immediately, with clearly marked placeholders for any info not visible (e.g., storage, battery %, carrier).
      LOCATION CONTEXT: This item is being sold in the United States. Consider US regional pricing differences and local market conditions when suggesting prices. Focus on US marketplace data (eBay, Facebook Marketplace, Craigslist, OfferUp, etc.).

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
          "description": "2-5 short lines, seller perspective. Only visible facts + placeholders for unknowns.",
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
      - "What condition are these shoes in?" , if user's answer is 'NEW', then never ask "How long have you used this item?"
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
      - "What condition is this item in? , if user's answer is 'NEW', then never ask "How long have you used this item?"
      
      For ELECTRONICS (laptops, tablets, etc.):
      - "What storage capacity does this have?"
      - "What is the battery health percentage?"
      - "What condition is this device in?"
      - "Do you have the original box and accessories?"

      For OTHER ITEMS:
      - "What condition is this item in?", if user's answer is 'NEW', then never ask "How long have you used this item?"
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
        - Description (2-5 lines): What it is, visible highlights, honest condition, transaction details (meetup/cash). Do NOT include usage duration placeholders.
        - Bullets: Short, scannable, with placeholders for unknowns.
      6) Never invent numbers or claims. Use placeholders instead.
      7) Consider US regional pricing factors for the location when suggesting prices. Use US marketplace data only.

      Return ONLY the JSON.
      `;
    
      // Fetch the image from URL first
      const imageResponse = await fetch(imageUrls[0]);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
      
      const image = await genAi.files.upload({
        file: imageBlob,
        config: { 
          mimeType: 'image/jpeg'
        }
      });

      const response = await genAi.models.generateContent({
        model: "gemini-2.5-flash",
        contents: 
          createUserContent([
            createPartFromUri(image.uri!, image.mimeType!),
            prompt,
          ]),
      });

      const text = response?.text ?? '';

      // Parse the JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      let analysis;
      try {
        analysis = JSON.parse(cleanText);
      

      // Convert AI response to ProductAnalysis format
      const listing = analysis.listing_ready || {};
      const evidence = analysis.evidence || {};

        return {
          title: listing.title || 'Product Item',
        description: listing.description || 'Product in good condition',
        category: 'electronics' as const, // Map from evidence.product_type if needed
        condition: (listing.condition || 'good'),
          suggestedPrice: listing.suggested_price || 100,
          confidence: Math.max(0.1, Math.min(1.0, evidence.confidence || 0.8)),
          features: evidence.visible_features || ['Quality item'],
          brand: evidence.brand || 'Various',
          model: evidence.model_exact || evidence.model_range || 'Standard',
        missingInfo: listing.contextual_questions || [],
          // Store full evidence object for Phase 2
          _evidence: evidence,
          marketResearch: {
            averagePrice: listing.suggested_price || 100,
          priceRange: { 
            min: Math.round((listing.suggested_price || 100) * 0.8), 
            max: Math.round((listing.suggested_price || 100) * 1.2) 
          },
            marketDemand: 'medium' as const,
            competitorCount: 10
          }
        };
    
      } catch (error) {
        return undefined;
      }
  }

  /**
   * Phase 2: Generate final listing with image + user answers
   */
  static async generateFinalListing(
    imageUrls: string[], 
    userAnswers: Record<string, string>,
    initialEvidence: any
  ): Promise<ProductAnalysis | undefined> {
    const prompt = `
      You are a PROFESSIONAL PRODUCT LISTER for ALL VERSE GPT. Create a polished, buyer-ready listing that is accurate, detailed, and natural-sounding.

      Initial Analysis Evidence:
      ${JSON.stringify(initialEvidence, null, 2)}

      User-Provided Information:
      ${JSON.stringify(userAnswers, null, 2)}

      Your task:
      1. Combine the visual evidence from the image(s) with the user-provided information
      2. Create a professional, natural-sounding listing that doesn't sound robotic
      3. Write in a conversational, trustworthy tone - like a real person describing their item
      4. Be specific and detailed, but concise (3-5 sentences)
      5. Highlight key selling points naturally
      6. Use the user's exact answers where provided (size, condition, etc.)

      Return ONLY valid JSON with this exact structure:

      {
        "listing_ready": {
          "title": "Brand Model Size/Color - Specific, NO condition words or prices",
          "description": "Write 3-5 natural sentences. Describe what makes this item special, its condition in detail, notable features. Sound conversational but professional. Include specific details from image and user answers.",
          "category": "electronics|fashion|home|sports|automotive|toys|beauty|appliances|books|tools|other",
          "condition": "new|like-new|good|fair|poor",
          "suggested_price": number
        },
        "market_analysis": {
          "suggestedPrice": number,
          "priceRange": { "min": number, "max": number },
          "confidence": 0.0-1.0,
          "marketDemand": "high|medium|low"
        }
      }

      Writing Guidelines:
      - Description should read like a real person wrote it, not AI
      - Use natural transitions: "This item features...", "The condition is...", "Perfect for..."
      - Be specific: "Size 10 Nike Air Max" not "Nike shoes"
      - Include condition details naturally: "Like new, only worn a few times" not just "like-new"
      - If user said "new", emphasize: "Brand new, never used, still in original packaging"
      - No emojis, no ALL CAPS, no excessive punctuation
      - Sound conversational, not robotic

      Return ONLY the JSON.
    `;

    try {
      const imageResponse = await fetch(imageUrls[0]);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
      
      const image = await genAi.files.upload({
        file: imageBlob,
        config: { mimeType: 'image/jpeg' }
      });

      const response = await genAi.models.generateContent({
        model: "gemini-2.5-flash",
        contents: createUserContent([
          createPartFromUri(image.uri!, image.mimeType!),
          prompt,
        ]),
      });

      const text = response?.text ?? '';
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanText);

      const listing = analysis.listing_ready || {};
      const market = analysis.market_analysis || {};

      return {
        title: listing.title || 'Product Item',
        description: listing.description || 'Product in good condition',
        category: (listing.category || 'other') as ProductAnalysis['category'],
        condition: (listing.condition || 'good') as ProductAnalysis['condition'],
        suggestedPrice: market.suggestedPrice || listing.suggested_price || 100,
        confidence: Math.max(0.1, Math.min(1.0, market.confidence || 0.9)),
        features: initialEvidence?.visible_features || [],
        brand: initialEvidence?.brand || 'Various',
        model: initialEvidence?.model_exact || initialEvidence?.model_range || 'Standard',
        marketResearch: {
          averagePrice: market.suggestedPrice || listing.suggested_price || 100,
          priceRange: market.priceRange || {
            min: Math.round((market.suggestedPrice || 100) * 0.8),
            max: Math.round((market.suggestedPrice || 100) * 1.2)
          },
          marketDemand: (market.marketDemand || 'medium') as 'high' | 'medium' | 'low',
          competitorCount: 10
        }
      };
    } catch (error) {
      console.error('Error generating final listing:', error);
      return undefined;
    }
  }
}