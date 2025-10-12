export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[]; // data URLs or remote URLs
  createdAt: string; // ISO
  updatedAt: string; // ISO
  location?: {
    city: string;
    state: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  sellerId: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
};

export type ListingCreate = {
  title: string;
  description: string;
  price: number;
  category: string;
  photos: string[];
  location?: {
    city: string;
    state: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
};

export type ListingUpdate = Partial<ListingCreate>;
