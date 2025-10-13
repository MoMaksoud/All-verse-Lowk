import dynamic from 'next/dynamic';
import { LoadingSpinner } from './LoadingSpinner';

// Dynamic import for PhotoUpload component
export const PhotoUpload = dynamic(() => import('./PhotoUpload').then(mod => ({ default: mod.PhotoUpload })), {
  loading: () => <LoadingSpinner text="Loading uploader..." />,
  ssr: false
});

// Dynamic import for FileUpload component  
export const FileUpload = dynamic(() => import('./FileUpload').then(mod => ({ default: mod.FileUpload })), {
  loading: () => <LoadingSpinner text="Loading file uploader..." />,
  ssr: false
});

// Dynamic import for AI components
export const AIListingAssistant = dynamic(() => import('./AIListingAssistant').then(mod => ({ default: mod.AIListingAssistant })), {
  loading: () => <LoadingSpinner text="Loading AI assistant..." />,
  ssr: false
});

export const AIChatbot = dynamic(() => import('./AIChatbot').then(mod => ({ default: mod.AIChatbot })), {
  loading: () => <LoadingSpinner text="Loading AI chatbot..." />,
  ssr: false
});

export const AIWidget = dynamic(() => import('./AIWidget').then(mod => ({ default: mod.AIWidget })), {
  loading: () => <LoadingSpinner text="Loading AI widget..." />,
  ssr: false
});

// Dynamic import for location components
export const LocationAutocomplete = dynamic(() => import('./LocationAutocomplete').then(mod => ({ default: mod.LocationAutocomplete })), {
  loading: () => <LoadingSpinner text="Loading location services..." />,
  ssr: false
});

export const SimpleLocationAutocomplete = dynamic(() => import('./SimpleLocationAutocomplete').then(mod => ({ default: mod.SimpleLocationAutocomplete })), {
  loading: () => <LoadingSpinner text="Loading location..." />,
  ssr: false
});

// Dynamic import for heavy UI components
export const CheckoutForm = dynamic(() => import('./CheckoutForm'), {
  loading: () => <LoadingSpinner text="Loading checkout..." />,
  ssr: false
});

export const ChatWidget = dynamic(() => import('./ChatWidget').then(mod => ({ default: mod.ChatWidget })), {
  loading: () => <LoadingSpinner text="Loading chat..." />,
  ssr: false
});

// Dynamic import for SearchBar - optimized with lighter loading state
export const SearchBar = dynamic(() => import('./SearchBar').then(mod => ({ default: mod.SearchBar })), {
  loading: () => <div className="h-12 bg-gray-700 rounded-lg animate-pulse" />,
  ssr: false
});

// Dynamic import for ListingCard - optimized with lighter loading state
export const ListingCard = dynamic(() => import('./ListingCard').then(mod => ({ default: mod.ListingCard })), {
  loading: () => <div className="h-64 bg-gray-700 rounded-lg animate-pulse" />,
  ssr: false
});

// Dynamic import for dynamic background (heavy animations)
export const DynamicBackground = dynamic(() => import('./DynamicBackground').then(mod => ({ default: mod.DynamicBackground })), {
  loading: () => null, // No loading state for background
  ssr: false
});

