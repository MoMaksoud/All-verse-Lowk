// Listing categories shown in the storefront (home rail, marketplace filters).
// ids match the `category` field stored on listings.
export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'home', label: 'Home' },
  { id: 'sports', label: 'Sports & outdoors' },
  { id: 'tools', label: 'Tools' },
  { id: 'appliances', label: 'Appliances' },
  { id: 'toys', label: 'Toys & games' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'books', label: 'Books' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'other', label: 'Other' },
] as const;

export function categoryLabel(id?: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id ?? '';
}

// Listing conditions; ids match the `condition` field stored on listings.
export const CONDITIONS = [
  { id: 'new', label: 'New' },
  { id: 'like-new', label: 'Like new' },
  { id: 'good', label: 'Good' },
  { id: 'fair', label: 'Fair' },
  { id: 'poor', label: 'Poor' },
] as const;
