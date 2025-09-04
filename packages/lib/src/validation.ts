import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  avatar: z.string().optional(),
});

export const profileSchema = z.object({
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().min(2, 'Location must be at least 2 characters').optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Invalid phone number').optional(),
});

// Listing validation schemas
export const createListingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  price: z.number().positive('Price must be positive').min(0.01, 'Price must be at least $0.01'),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor'], {
    errorMap: () => ({ message: 'Please select a valid condition' }),
  }),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  images: z.array(z.instanceof(File)).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
});

export const updateListingSchema = createListingSchema.partial();

// Message validation schemas
export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message must be less than 1000 characters'),
  type: z.enum(['text', 'image', 'offer']).default('text'),
});

// Price suggestion validation schemas
export const priceSuggestionSchema = z.object({
  suggestedPrice: z.number().positive('Price must be positive').min(0.01, 'Price must be at least $0.01'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must be less than 500 characters'),
});

// Search filters validation
export const listingFiltersSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  sortBy: z.enum(['price', 'date', 'relevance']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Form validation helpers
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

export function validateField<T>(schema: z.ZodSchema<T>, value: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(value);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Invalid value' };
    }
    return { success: false, error: 'Validation failed' };
  }
}
