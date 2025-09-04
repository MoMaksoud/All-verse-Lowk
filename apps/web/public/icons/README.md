# Category Icons

This directory contains the icon images for category cards in the marketplace.

## Current Icons
- `electronics.svg` - Electronics category icon
- `fashion.svg` - Fashion category icon  
- `sports.svg` - Sports category icon
- `home.svg` - Home & Furniture category icon
- `books.svg` - Books category icon
- `automotive.svg` - Automotive category icon

## How to Add Your Icons

1. **Replace the placeholder files** with your actual icon images
2. **Supported formats**: SVG (recommended), PNG, JPG
3. **Recommended size**: 48x48px or larger (will be scaled down)
4. **Color**: Any color (the CSS filter will make them white)

## Icon Requirements

For best results:
- Use **SVG icons** for scalability
- Use **PNG with transparent background** if not SVG
- Make sure icons are **square** (1:1 aspect ratio)
- Icons will be **automatically made white** by CSS filters

## Usage

The icons are automatically loaded by the CategoryCard component when you add the `iconImage` property to your category data in `packages/lib/src/mockApi.ts`.

Example:
```typescript
{
  id: 'cat1',
  name: 'Electronics',
  slug: 'electronics',
  icon: '📱', // fallback emoji
  iconImage: '/icons/electronics.svg', // your image icon
  children: []
}
```
