import { render, screen } from '@testing-library/react';
import { ListingCard } from '../ListingCard';
import { Listing } from '@marketplace/types';

const mockListing: Listing = {
  id: 'test-listing',
  title: 'Test iPhone',
  description: 'A test iPhone in good condition',
  price: 899,
  currency: 'USD',
  category: 'Electronics',
  condition: 'good',
  images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop'],
  location: 'San Francisco, CA',
  sellerId: 'user1',
  seller: {
    id: 'user1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  status: 'active',
  views: 100,
  favorites: 10,
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

describe('ListingCard', () => {
  it('renders listing title', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Test iPhone')).toBeInTheDocument();
  });

  it('renders listing price', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('$899.00')).toBeInTheDocument();
  });

  it('renders seller name', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders location', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
  });

  it('renders view count', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('100 views')).toBeInTheDocument();
  });
});
