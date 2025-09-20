/**
 * Fallback listing generation service for when AI is unavailable
 */

export interface FallbackListing {
  id: string;
  title: string;
  price: { value: number; currency: string };
  condition: string;
  seller: { id: string; name: string };
  imageUrl: string;
  url: string;
  category: string;
  badges: string[];
  location: string;
  createdAt: string;
  score: number;
}

export class FallbackListingService {
  private static readonly floridaCities = [
    'Miami, FL', 'Tampa, FL', 'Orlando, FL', 'Jacksonville, FL', 
    'Fort Lauderdale, FL', 'Tallahassee, FL', 'Gainesville, FL'
  ];

  private static readonly sellerNames = [
    'TechDeals', 'FashionForward', 'HomeDecor', 'SportsGear', 
    'BookLover', 'LocalSeller', 'QualityGoods', 'BargainHunt'
  ];

  private static readonly electronicsListings = [
    { title: 'iPhone 13 Pro 128GB Space Gray', price: 699, category: 'electronics', imageId: '1592750475338-74b7b21085ab' },
    { title: 'MacBook Pro M2 13" Silver', price: 1299, category: 'electronics', imageId: '1517336716339-369f0006c0b9' },
    { title: 'Samsung Galaxy S22 256GB Black', price: 599, category: 'electronics', imageId: '1511707171634-816d81f6cbc2' },
    { title: 'AirPods Pro 2nd Generation', price: 199, category: 'electronics', imageId: '1606225457115-3815d2a5ba98' },
    { title: 'iPad Air 64GB Space Gray', price: 499, category: 'electronics', imageId: '1544244015-0a4a38ae19c2' },
    { title: 'Dell XPS 15 Laptop', price: 1199, category: 'electronics', imageId: '1496181133206-3cec04a9b952' }
  ];

  private static readonly fashionListings = [
    { title: 'Nike Air Max 270 Size 10', price: 120, category: 'fashion', imageId: '1542291026-7eec264c27ff' },
    { title: 'Levi\'s 501 Jeans Size 32', price: 45, category: 'fashion', imageId: '1541099649102-28384e215d83' },
    { title: 'Adidas Ultraboost 22 White', price: 150, category: 'fashion', imageId: '1549298919-b9d1c7719f4e' },
    { title: 'North Face Jacket Medium', price: 85, category: 'fashion', imageId: '1551698618-1dfe5d3d67de' },
    { title: 'Converse Chuck Taylor All Star', price: 55, category: 'fashion', imageId: '1549298919-b9d1c7719f4e' }
  ];

  private static readonly homeListings = [
    { title: 'IKEA Hemnes Dresser White', price: 180, category: 'home', imageId: '1586026410265-4cf8f5aeb092' },
    { title: 'West Elm Sofa Gray', price: 450, category: 'home', imageId: '1586026410265-4cf8f5aeb092' },
    { title: 'KitchenAid Stand Mixer Red', price: 220, category: 'home', imageId: '1556909112-faa927bda8fc' },
    { title: 'Dyson V11 Cordless Vacuum', price: 350, category: 'home', imageId: '1558618666-fcd25c85cd64' }
  ];

  private static readonly sportsListings = [
    { title: 'Wilson Tennis Racket', price: 75, category: 'sports', imageId: '1551698618-1dfe5d3d67de' },
    { title: 'Yoga Mat Premium', price: 35, category: 'sports', imageId: '1544367567-0f2f4a9c8b5e' },
    { title: 'Basketball Official Size', price: 25, category: 'sports', imageId: '1544367567-0f2f4a9c8b5e' },
    { title: 'Gym Weight Set 50lbs', price: 120, category: 'sports', imageId: '1571019613454-5cb043d0b6bd' }
  ];

  private static readonly bookListings = [
    { title: 'The Great Gatsby by F. Scott Fitzgerald', price: 12, category: 'books', imageId: '148162100487-8a6df8cc89f8' },
    { title: 'To Kill a Mockingbird by Harper Lee', price: 10, category: 'books', imageId: '148162100487-8a6df8cc89f8' },
    { title: '1984 by George Orwell', price: 11, category: 'books', imageId: '148162100487-8a6df8cc89f8' },
    { title: 'Pride and Prejudice by Jane Austen', price: 9, category: 'books', imageId: '148162100487-8a6df8cc89f8' }
  ];

  /**
   * Generate contextual listings based on query
   */
  static generateContextualListings(query: string): FallbackListing[] {
    const normalizedQuery = query.toLowerCase();
    let selectedListings: any[] = [];
    let badges: string[] = [];

    // Determine category and listings based on query
    if (normalizedQuery.includes('phone') || normalizedQuery.includes('iphone') || normalizedQuery.includes('samsung')) {
      selectedListings = this.electronicsListings.filter(item => 
        item.title.toLowerCase().includes('phone') || item.title.toLowerCase().includes('iphone') || item.title.toLowerCase().includes('samsung')
      );
      badges = ['Trending', 'Popular'];
    } else if (normalizedQuery.includes('laptop') || normalizedQuery.includes('macbook') || normalizedQuery.includes('computer')) {
      selectedListings = this.electronicsListings.filter(item => 
        item.title.toLowerCase().includes('laptop') || item.title.toLowerCase().includes('macbook') || item.title.toLowerCase().includes('computer')
      );
      badges = ['Hot', 'Best Seller'];
    } else if (normalizedQuery.includes('shoe') || normalizedQuery.includes('sneaker') || normalizedQuery.includes('nike') || normalizedQuery.includes('adidas')) {
      selectedListings = this.fashionListings.filter(item => 
        item.title.toLowerCase().includes('shoe') || item.title.toLowerCase().includes('sneaker') || item.title.toLowerCase().includes('nike') || item.title.toLowerCase().includes('adidas')
      );
      badges = ['Trending', 'Popular'];
    } else if (normalizedQuery.includes('furniture') || normalizedQuery.includes('sofa') || normalizedQuery.includes('chair')) {
      selectedListings = this.homeListings.filter(item => 
        item.title.toLowerCase().includes('furniture') || item.title.toLowerCase().includes('sofa') || item.title.toLowerCase().includes('chair') || item.title.toLowerCase().includes('dresser')
      );
      badges = ['New', 'Popular'];
    } else if (normalizedQuery.includes('book') || normalizedQuery.includes('textbook')) {
      selectedListings = this.bookListings;
      badges = ['Classic', 'Popular'];
    } else if (normalizedQuery.includes('sport') || normalizedQuery.includes('gym') || normalizedQuery.includes('tennis')) {
      selectedListings = this.sportsListings;
      badges = ['Active', 'Popular'];
    } else if (normalizedQuery.includes('trending')) {
      // Mix of popular items
      selectedListings = [
        ...this.electronicsListings.slice(0, 2),
        ...this.fashionListings.slice(0, 2),
        ...this.homeListings.slice(0, 1),
        ...this.sportsListings.slice(0, 1)
      ];
      badges = ['Trending', 'Hot'];
    } else if (normalizedQuery.includes('deal') || normalizedQuery.includes('cheap') || normalizedQuery.includes('budget')) {
      // Items under $100
      selectedListings = [
        ...this.electronicsListings.filter(item => item.price < 100),
        ...this.fashionListings.filter(item => item.price < 100),
        ...this.bookListings,
        ...this.sportsListings.filter(item => item.price < 100)
      ];
      badges = ['Deal', 'Budget'];
    } else {
      // Default mix
      selectedListings = [
        ...this.electronicsListings.slice(0, 2),
        ...this.fashionListings.slice(0, 2),
        ...this.homeListings.slice(0, 1),
        ...this.sportsListings.slice(0, 1)
      ];
      badges = ['Popular', 'Featured'];
    }

    // Limit to 6 listings max
    selectedListings = selectedListings.slice(0, 6);

    // Generate listings with proper structure
    return selectedListings.map((item, index) => ({
      id: `fallback-${item.category}-${index + 1}`,
      title: item.title,
      price: {
        value: item.price,
        currency: 'USD'
      },
      condition: this.getRandomCondition(),
      seller: {
        id: `seller-${index + 1}`,
        name: this.sellerNames[index % this.sellerNames.length]
      },
      imageUrl: `https://images.unsplash.com/photo-${item.imageId}?w=400&h=300&fit=crop`,
      url: `/listings/fallback-${item.category}-${index + 1}`,
      category: item.category,
      badges: [badges[index % badges.length], 'Verified'],
      location: this.floridaCities[index % this.floridaCities.length],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      score: 0.85 + (Math.random() * 0.1) // 0.85-0.95
    }));
  }

  private static getRandomCondition(): string {
    const conditions = ['New', 'Like New', 'Excellent', 'Good', 'Fair'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }
}
