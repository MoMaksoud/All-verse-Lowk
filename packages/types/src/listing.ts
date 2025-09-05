export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[]; // data URLs or remote URLs
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ListingCreate = {
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[]; // allow data URLs (dev) or https URLs
};

export type ListingUpdate = Partial<ListingCreate>;
