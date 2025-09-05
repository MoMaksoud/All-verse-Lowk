import { NextRequest } from 'next/server';
import { GET, POST } from '../listings/route';
import { dbListings } from '@/lib/mockDb';

// Mock the database
jest.mock('@/lib/mockDb', () => ({
  dbListings: {
    list: jest.fn(() => [
      {
        id: 'test1',
        title: 'Test Listing',
        description: 'Test description',
        price: 100,
        currency: 'USD',
        category: 'electronics',
        condition: 'New',
        photos: ['https://example.com/photo.jpg'],
        sellerId: 'user1',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
    ]),
    search: jest.fn(() => ({
      items: [
        {
          id: 'test1',
          title: 'Test Listing',
          description: 'Test description',
          price: 100,
          currency: 'USD',
          category: 'electronics',
          condition: 'New',
          photos: ['https://example.com/photo.jpg'],
          sellerId: 'user1',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
      ],
      total: 1,
      hasMore: false,
    })),
    create: jest.fn((data, sellerId) => ({
      id: 'new-listing',
      ...data,
      sellerId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    })),
  },
}));

describe('/api/listings', () => {
  describe('GET', () => {
    it('should return listings with default parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.total).toBe(1);
    });

    it('should handle search query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(dbListings.search).toHaveBeenCalledWith(
        { keyword: 'test', category: undefined, minPrice: undefined, maxPrice: undefined },
        1,
        24
      );
    });

    it('should handle category filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings?category=electronics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(dbListings.search).toHaveBeenCalledWith(
        { keyword: undefined, category: 'electronics', minPrice: undefined, maxPrice: undefined },
        1,
        24
      );
    });

    it('should handle price range filters', async () => {
      const request = new NextRequest('http://localhost:3000/api/listings?min=50&max=200');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(dbListings.search).toHaveBeenCalledWith(
        { keyword: undefined, category: undefined, minPrice: 50, maxPrice: 200 },
        1,
        24
      );
    });
  });

  describe('POST', () => {
    it('should create a new listing', async () => {
      const listingData = {
        title: 'New Test Listing',
        description: 'New test description',
        price: 150,
        currency: 'USD',
        category: 'electronics',
        condition: 'New',
        photos: ['https://example.com/new-photo.jpg'],
      };

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Test Listing');
      expect(data.data.price).toBe(150);
      expect(dbListings.create).toHaveBeenCalledWith(
        { ...listingData, status: 'active' },
        'user1'
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: '', // Empty title should fail validation
        description: 'Test description',
        price: 100,
        currency: 'USD',
        category: 'electronics',
        condition: 'New',
        photos: [],
      };

      const request = new NextRequest('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });
});
