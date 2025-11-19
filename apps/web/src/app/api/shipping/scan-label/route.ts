import { NextRequest, NextResponse } from 'next/server';
import { createPartFromUri, createUserContent, GoogleGenAI } from '@google/genai';
import { withApi } from '@/lib/withApi';
import { checkRateLimit, getIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is not configured for shipping label scan');
}

const genAi = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    // Rate limit to protect the AI endpoint (30/min)
    const ip = getIp(req as unknown as Request);
    checkRateLimit(ip, 30);

    // Check if API key is configured
    if (!apiKey || !genAi) {
      return NextResponse.json(
        { error: 'AI service is not configured', details: 'GEMINI_API_KEY is missing' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('📦 Scanning shipping label from URL:', imageUrl);

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { 
      type: imageResponse.headers.get('content-type') || 'image/jpeg' 
    });

    // Upload image to Gemini
    const uploadedImage = await genAi.files.upload({
      file: imageBlob,
      config: { mimeType: imageBlob.type }
    });

    console.log('📦 Image uploaded to Gemini, analyzing...');

    // Create prompt for extracting shipping information
    const prompt = `
      You are a SHIPPING LABEL SCANNER for ALL VERSE GPT. Analyze this shipping label image and extract the package dimensions and weight.

      Extract the following information from the shipping label:
      1. Package Weight (in pounds/lbs) - look for weight fields, "WT", "Weight", or similar
      2. Package Length (in inches) - look for "L", "Length", or dimension fields
      3. Package Width (in inches) - look for "W", "Width", or dimension fields  
      4. Package Height (in inches) - look for "H", "Height", or dimension fields

      The dimensions may be shown as:
      - Separate fields: L × W × H
      - Combined: "12×8×6" or "12 x 8 x 6"
      - In a dimensions field: "12x8x6 in" or "12×8×6 inches"

      Weight may be shown as:
      - "2.5 lbs" or "2.5 pounds"
      - "WT: 2.5" or "Weight: 2.5"
      - Decimal or whole numbers

      Return ONLY valid JSON with this exact structure:
      {
        "weight": number (in pounds, or null if not found),
        "length": number (in inches, or null if not found),
        "width": number (in inches, or null if not found),
        "height": number (in inches, or null if not found)
      }

      Important:
      - Extract only numbers, convert to numeric values
      - If a dimension is not visible or cannot be determined, use null
      - Ensure all measurements are in the correct units (pounds for weight, inches for dimensions)
      - If dimensions are in a different unit (cm, meters), convert to inches (1 inch = 2.54 cm)
      - If weight is in a different unit (kg, oz), convert to pounds (1 lb = 16 oz, 1 lb = 0.453592 kg)

      Return ONLY the JSON object, no additional text or explanation.
    `;

    // Generate content with Gemini Vision
    const response = await genAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([
        createPartFromUri(uploadedImage.uri!, uploadedImage.mimeType!),
        prompt,
      ]),
    });

    const text = response?.text ?? '';
    console.log('📦 Raw AI response:', text.substring(0, 200));

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON response
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    let extractedData;
    
    try {
      extractedData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Response text:', cleanText);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate and format the response
    const result = {
      weight: extractedData.weight !== null && extractedData.weight !== undefined 
        ? parseFloat(extractedData.weight) 
        : null,
      length: extractedData.length !== null && extractedData.length !== undefined 
        ? parseFloat(extractedData.length) 
        : null,
      width: extractedData.width !== null && extractedData.width !== undefined 
        ? parseFloat(extractedData.width) 
        : null,
      height: extractedData.height !== null && extractedData.height !== undefined 
        ? parseFloat(extractedData.height) 
        : null,
    };

    console.log('📦 Extracted shipping data:', result);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error scanning shipping label:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to scan shipping label';
    let statusCode = 500;

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused')) {
        errorMessage = 'Unable to fetch the image. Please check the image URL.';
        statusCode = 400;
      } else if (msg.includes('parse') || msg.includes('json')) {
        errorMessage = 'Unable to extract information from the label. Please ensure the image is clear and contains shipping information.';
        statusCode = 422;
      } else if (msg.includes('quota') || msg.includes('429') || msg.includes('too many requests')) {
        errorMessage = 'AI service is temporarily unavailable due to high demand. Please try again in a moment.';
        statusCode = 429;
      } else if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('authentication')) {
        errorMessage = 'AI service authentication failed. Please contact support.';
        statusCode = 401;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: statusCode }
    );
  }
});

