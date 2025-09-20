import { ProductAnalysis } from './aiAnalysis';

export class SimpleImageAnalysis {
  static analyzeMultipleImages(imageUrls: string[]): ProductAnalysis {
    let combinedHints = imageUrls.join(' ').toLowerCase();
    
    let category = 'other';
    let title = 'Product Item';
    let suggestedPrice = 75;
    let features = ['Good condition', 'Quality item'];
    let confidence = 0.3;

    // Enhanced detection based on URL patterns and common product types
    if (combinedHints.includes('phone') || combinedHints.includes('iphone') || combinedHints.includes('samsung') || combinedHints.includes('mobile')) {
      category = 'electronics';
      title = 'Smartphone - Good Condition';
      suggestedPrice = 250;
      features.push('Touchscreen', 'Camera', 'Wireless connectivity');
      confidence = 0.6;
    } else if (combinedHints.includes('laptop') || combinedHints.includes('macbook') || combinedHints.includes('computer') || combinedHints.includes('notebook')) {
      category = 'electronics';
      title = 'Laptop Computer - Good Condition';
      suggestedPrice = 500;
      features.push('Portable', 'High performance', 'Modern design');
      confidence = 0.6;
    } else if (combinedHints.includes('shoe') || combinedHints.includes('sneaker') || combinedHints.includes('boot') || combinedHints.includes('sandal')) {
      category = 'fashion';
      title = 'Pair of Shoes - Good Condition';
      suggestedPrice = 80;
      features.push('Comfortable', 'Stylish', 'Durable');
      confidence = 0.5;
    } else if (combinedHints.includes('shirt') || combinedHints.includes('tshirt') || combinedHints.includes('top') || combinedHints.includes('blouse')) {
      category = 'fashion';
      title = 'T-Shirt - Good Condition';
      suggestedPrice = 20;
      features.push('Soft fabric', 'Casual wear', 'Comfortable fit');
      confidence = 0.4;
    } else if (combinedHints.includes('book') || combinedHints.includes('novel') || combinedHints.includes('textbook') || combinedHints.includes('manual')) {
      category = 'books';
      title = 'Book - Good Condition';
      suggestedPrice = 15;
      features.push('Good condition', 'Readable', 'Well maintained');
      confidence = 0.4;
    } else if (combinedHints.includes('camera') || combinedHints.includes('lens') || combinedHints.includes('photo') || combinedHints.includes('dslr')) {
      category = 'electronics';
      title = 'Camera Equipment - Good Condition';
      suggestedPrice = 300;
      features.push('High quality', 'Professional grade', 'Excellent condition');
      confidence = 0.6;
    } else if (combinedHints.includes('headphone') || combinedHints.includes('earphone') || combinedHints.includes('audio') || combinedHints.includes('speaker')) {
      category = 'electronics';
      title = 'Audio Equipment - Good Condition';
      suggestedPrice = 120;
      features.push('High quality sound', 'Comfortable', 'Wireless');
      confidence = 0.5;
    } else if (combinedHints.includes('watch') || combinedHints.includes('clock') || combinedHints.includes('timepiece')) {
      category = 'fashion';
      title = 'Watch - Good Condition';
      suggestedPrice = 150;
      features.push('Stylish', 'Accurate timekeeping', 'Durable');
      confidence = 0.5;
    } else if (combinedHints.includes('bag') || combinedHints.includes('purse') || combinedHints.includes('backpack') || combinedHints.includes('handbag')) {
      category = 'fashion';
      title = 'Bag - Good Condition';
      suggestedPrice = 60;
      features.push('Stylish', 'Spacious', 'Durable');
      confidence = 0.4;
    } else if (combinedHints.includes('tablet') || combinedHints.includes('ipad') || combinedHints.includes('android')) {
      category = 'electronics';
      title = 'Tablet - Good Condition';
      suggestedPrice = 200;
      features.push('Touchscreen', 'Portable', 'High resolution');
      confidence = 0.6;
    } else if (combinedHints.includes('game') || combinedHints.includes('console') || combinedHints.includes('controller') || combinedHints.includes('playstation') || combinedHints.includes('xbox')) {
      category = 'electronics';
      title = 'Gaming Equipment - Good Condition';
      suggestedPrice = 180;
      features.push('High performance', 'Entertainment', 'Modern technology');
      confidence = 0.5;
    } else if (combinedHints.includes('furniture') || combinedHints.includes('chair') || combinedHints.includes('table') || combinedHints.includes('desk')) {
      category = 'home';
      title = 'Furniture - Good Condition';
      suggestedPrice = 120;
      features.push('Sturdy', 'Comfortable', 'Well maintained');
      confidence = 0.4;
    } else if (combinedHints.includes('kitchen') || combinedHints.includes('cook') || combinedHints.includes('appliance') || combinedHints.includes('microwave') || combinedHints.includes('blender')) {
      category = 'home';
      title = 'Kitchen Appliance - Good Condition';
      suggestedPrice = 80;
      features.push('Functional', 'Clean', 'Well maintained');
      confidence = 0.4;
    } else if (combinedHints.includes('sport') || combinedHints.includes('fitness') || combinedHints.includes('gym') || combinedHints.includes('exercise')) {
      category = 'sports';
      title = 'Sports Equipment - Good Condition';
      suggestedPrice = 90;
      features.push('Durable', 'Performance', 'Well maintained');
      confidence = 0.4;
    } else if (combinedHints.includes('car') || combinedHints.includes('auto') || combinedHints.includes('vehicle') || combinedHints.includes('tire') || combinedHints.includes('wheel')) {
      category = 'automotive';
      title = 'Automotive Part - Good Condition';
      suggestedPrice = 200;
      features.push('Quality', 'Reliable', 'Well maintained');
      confidence = 0.4;
    } else {
      // Generic fallback with some intelligence
      if (combinedHints.includes('electronic') || combinedHints.includes('tech') || combinedHints.includes('digital')) {
        category = 'electronics';
        title = 'Electronic Device - Good Condition';
        suggestedPrice = 150;
        features.push('Modern technology', 'High quality', 'Well maintained');
        confidence = 0.4;
      } else if (combinedHints.includes('clothing') || combinedHints.includes('apparel') || combinedHints.includes('wear')) {
        category = 'fashion';
        title = 'Clothing Item - Good Condition';
        suggestedPrice = 35;
        features.push('Stylish', 'Comfortable', 'Well maintained');
        confidence = 0.3;
      } else if (combinedHints.includes('home') || combinedHints.includes('house') || combinedHints.includes('decor')) {
        category = 'home';
        title = 'Home Item - Good Condition';
        suggestedPrice = 60;
        features.push('Quality', 'Functional', 'Well maintained');
        confidence = 0.3;
      }
    }

    return {
      title: `${title}`,
      description: `A well-maintained ${title.toLowerCase()} in good condition.`,
      category: category as 'electronics' | 'fashion' | 'home' | 'sports' | 'automotive' | 'books' | 'other',
      condition: 'good',
      suggestedPrice,
      confidence,
      features,
      brand: 'Generic',
      model: 'Standard',
      marketResearch: {
        averagePrice: suggestedPrice,
        priceRange: { min: Math.round(suggestedPrice * 0.7), max: Math.round(suggestedPrice * 1.3) },
        marketDemand: 'medium',
        competitorCount: Math.floor(Math.random() * 10) + 3
      }
    };
  }
}