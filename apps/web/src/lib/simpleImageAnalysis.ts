import { ProductAnalysis } from './aiAnalysis';

export class SimpleImageAnalysis {
  static analyzeMultipleImages(imageUrls: string[]): ProductAnalysis {
    let combinedHints = imageUrls.join(' ').toLowerCase();
    
    console.log('🔍 SimpleImageAnalysis - Image URLs:', imageUrls);
    console.log('🔍 SimpleImageAnalysis - Combined hints:', combinedHints);
    
    let category = 'other';
    let title = 'Product Item';
    let suggestedPrice = 75;
    let features = ['Good condition', 'Quality item'];
    let confidence = 0.3;

    // Basic product detection
    if (combinedHints.includes('phone') || combinedHints.includes('iphone') || combinedHints.includes('samsung')) {
      category = 'electronics';
      title = 'Smartphone - Good Condition';
      suggestedPrice = 250;
      features.push('Touchscreen', 'Camera', 'Wireless connectivity');
      confidence = 0.6;
    } else if (combinedHints.includes('laptop') || combinedHints.includes('macbook') || combinedHints.includes('computer')) {
      category = 'electronics';
      title = 'Laptop Computer - Good Condition';
      suggestedPrice = 500;
      features.push('Portable', 'High performance', 'Modern design');
      confidence = 0.6;
    } else if (combinedHints.includes('shoe') || combinedHints.includes('sneaker') || combinedHints.includes('boot')) {
      category = 'fashion';
      title = 'Pair of Shoes - Good Condition';
      suggestedPrice = 80;
      features.push('Comfortable', 'Stylish', 'Durable');
      confidence = 0.5;
    } else if (combinedHints.includes('shirt') || combinedHints.includes('tshirt') || combinedHints.includes('top')) {
      category = 'fashion';
      title = 'T-Shirt - Good Condition';
      suggestedPrice = 20;
      features.push('Soft fabric', 'Casual wear', 'Comfortable fit');
      confidence = 0.4;
    } else if (combinedHints.includes('book') || combinedHints.includes('novel') || combinedHints.includes('textbook')) {
      category = 'books';
      title = 'Book - Good Condition';
      suggestedPrice = 15;
      features.push('Good condition', 'Readable', 'Well maintained');
      confidence = 0.4;
    } else if (combinedHints.includes('camera') || combinedHints.includes('dslr') || combinedHints.includes('lens')) {
      category = 'electronics';
      title = 'Camera Equipment - Good Condition';
      suggestedPrice = 300;
      features.push('High quality', 'Professional grade', 'Excellent condition');
      confidence = 0.6;
    }

    const result = {
      title: `${title}`,
      description: `A well-maintained ${title.toLowerCase()} in good condition.`,
      category: category as 'electronics' | 'fashion' | 'home' | 'sports' | 'automotive' | 'books' | 'other',
      condition: 'good' as const,
      suggestedPrice,
      confidence,
      features,
      brand: 'Generic',
      model: 'Standard',
      marketResearch: {
        averagePrice: suggestedPrice,
        priceRange: { min: Math.round(suggestedPrice * 0.7), max: Math.round(suggestedPrice * 1.3) },
        marketDemand: 'medium' as const,
        competitorCount: Math.floor(Math.random() * 10) + 3
      }
    };
    
    console.log('🔍 SimpleImageAnalysis - Final result:', result);
    return result;
  }
}