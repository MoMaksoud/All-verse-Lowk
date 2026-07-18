import type { LucideIcon } from "lucide-react";

export interface NavItemData {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface Listing {
  id: string;
  title: string;
  meta: string;
  price: number;
  image: string;
  likes: number;
}

export interface CategoryData {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface FooterLinkData {
  label: string;
  href: string;
}

export interface FooterColumnData {
  heading: string;
  links: FooterLinkData[];
}

export interface TrustBadgeData {
  icon: LucideIcon;
  value: string;
  label: string;
}

export interface CategoryPickerCardData {
  id: string;
  label: string;
  image: string;
}

export interface StyleCardData {
  id: string;
  label: string;
  image: string;
}

export interface TrendingSearchData {
  term: string;
  count: string;
}
