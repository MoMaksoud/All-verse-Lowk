#!/usr/bin/env tsx

import { dbListings } from '../src/lib/mockDb';
import { Listing } from '@marketplace/types';

const seedListings: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'iPhone 15 Pro Max - Space Black',
    description: 'Brand new iPhone 15 Pro Max in Space Black. 256GB storage, titanium build, Pro camera system. Still in original packaging with all accessories.',
    price: 1199.99,
    currency: 'USD',
    category: 'electronics',
    condition: 'New',
    photos: [
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    ],
    sellerId: 'user1',
    status: 'active',
  },
  {
    title: 'MacBook Pro M3 - 14 inch',
    description: 'MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Perfect for developers and creative professionals. Excellent condition.',
    price: 1999.99,
    currency: 'USD',
    category: 'electronics',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop',
    ],
    sellerId: 'user2',
    status: 'active',
  },
  {
    title: 'Nike Air Jordan 1 Retro High',
    description: 'Classic Air Jordan 1 Retro High in Bred colorway. Size 10, worn only a few times. Comes with original box.',
    price: 180.00,
    currency: 'USD',
    category: 'fashion',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop',
    ],
    sellerId: 'user3',
    status: 'active',
  },
  {
    title: 'Sony WH-1000XM5 Wireless Headphones',
    description: 'Premium noise-canceling wireless headphones. Industry-leading noise cancellation, 30-hour battery life. Like new condition.',
    price: 399.99,
    currency: 'USD',
    category: 'electronics',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    ],
    sellerId: 'user1',
    status: 'active',
  },
  {
    title: 'Vintage Leather Jacket - Genuine Leather',
    description: 'Authentic vintage leather jacket from the 90s. Genuine leather, perfect fit. Great for collectors and fashion enthusiasts.',
    price: 245.00,
    currency: 'USD',
    category: 'fashion',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
    ],
    sellerId: 'user2',
    status: 'active',
  },
  {
    title: 'Dyson V15 Detect Cordless Vacuum',
    description: 'Dyson V15 Detect cordless vacuum with laser dust detection. Powerful suction, long battery life. Excellent condition.',
    price: 649.99,
    currency: 'USD',
    category: 'home',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    ],
    sellerId: 'user3',
    status: 'active',
  },
  {
    title: 'Canon EOS R5 Mirrorless Camera',
    description: 'Professional mirrorless camera with 45MP full-frame sensor. 8K video recording, excellent for photography and videography.',
    price: 3899.99,
    currency: 'USD',
    category: 'electronics',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop',
    ],
    sellerId: 'user1',
    status: 'active',
  },
  {
    title: 'Antique Wooden Dining Table',
    description: 'Beautiful handcrafted wooden dining table from the early 1900s. Solid oak construction, seats 8 people. Perfect for collectors.',
    price: 850.00,
    currency: 'USD',
    category: 'home',
    condition: 'Fair',
    photos: [
      'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
    ],
    sellerId: 'user2',
    status: 'active',
  },
  {
    title: 'Rolex Submariner - Vintage',
    description: 'Vintage Rolex Submariner from the 1970s. Automatic movement, excellent condition. Perfect for watch collectors.',
    price: 12500.00,
    currency: 'USD',
    category: 'fashion',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    ],
    sellerId: 'user3',
    status: 'active',
  },
  {
    title: 'Tesla Model 3 - Long Range',
    description: 'Tesla Model 3 Long Range with Autopilot. 2022 model, 15,000 miles. Excellent condition, all service records available.',
    price: 45000.00,
    currency: 'USD',
    category: 'other',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400&h=400&fit=crop',
    ],
    sellerId: 'user1',
    status: 'active',
  },
  {
    title: 'Gibson Les Paul Standard',
    description: 'Classic Gibson Les Paul Standard electric guitar. Cherry sunburst finish, excellent condition. Perfect for musicians.',
    price: 2499.99,
    currency: 'USD',
    category: 'other',
    condition: 'Good',
    photos: [
      'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=400&h=400&fit=crop',
    ],
    sellerId: 'user2',
    status: 'active',
  },
  {
    title: 'KitchenAid Stand Mixer - Professional',
    description: 'KitchenAid Professional 600 Series stand mixer. 6-quart capacity, multiple attachments included. Like new condition.',
    price: 399.99,
    currency: 'USD',
    category: 'home',
    condition: 'Like New',
    photos: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    ],
    sellerId: 'user3',
    status: 'active',
  },
];

async function seed() {
  console.log('🌱 Starting database seed...');
  
  try {
    // Clear existing listings
    const existingListings = dbListings.list();
    console.log(`📊 Found ${existingListings.length} existing listings`);
    
    // Add seed listings
    for (const listingData of seedListings) {
      const created = dbListings.create(listingData, listingData.sellerId);
      console.log(`✅ Created listing: ${created.title}`);
    }
    
    console.log(`🎉 Successfully seeded ${seedListings.length} listings!`);
    console.log(`📈 Total listings in database: ${dbListings.list().length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

export { seed };
