import {
  Home,
  Store,
  Bot,
  MessageCircle,
  Shirt,
  Footprints,
  ShoppingBag,
  Laptop,
  Watch,
  Clock,
  ShieldCheck,
  Package,
  Sparkles,
} from "lucide-react";
import type {
  CategoryData,
  CategoryPickerCardData,
  FooterColumnData,
  FooterLinkData,
  Listing,
  NavItemData,
  StyleCardData,
  TrendingSearchData,
  TrustBadgeData,
} from "@/types/homepage";

export const navItems: NavItemData[] = [
  { label: "Home", href: "/", icon: Home, active: true },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { label: "Messages", href: "/messages", icon: MessageCircle },
];

export const popularSearches: string[] = [
  "iphone",
  "sneakers",
  "vintage",
  "laptop",
  "streetwear",
  "accessories",
];

export const featuredListings: Listing[] = [
  {
    id: "carhartt-active-jacket",
    title: "Carhartt Active Jacket",
    meta: "M • Good condition",
    price: 65,
    image:
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&h=600&fit=crop&q=75",
    likes: 128,
  },
  {
    id: "nike-dunk-low-retro",
    title: "Nike Dunk Low Retro",
    meta: "UK 8 • Excellent",
    price: 85,
    image:
      "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop&q=75",
    likes: 94,
  },
  {
    id: "coach-soho-shoulder-bag",
    title: "Coach Soho Shoulder Bag",
    meta: "One size • Good",
    price: 45,
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=600&fit=crop&q=75",
    likes: 72,
  },
  {
    id: "vintage-nike-sweatshirt",
    title: "Vintage Nike Sweatshirt",
    meta: "L • Very good",
    price: 40,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop&q=75",
    likes: 56,
  },
  {
    id: "iphone-13-128gb",
    title: "iPhone 13 128GB",
    meta: "Unlocked • Good",
    price: 360,
    image:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=600&fit=crop&q=75",
    likes: 41,
  },
  {
    id: "stussy-hoodie",
    title: "Stüssy Hoodie",
    meta: "M • Good condition",
    price: 55,
    image:
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop&q=75",
    likes: 33,
  },
];

export const categories: CategoryData[] = [
  { id: "streetwear", label: "Streetwear", icon: Shirt },
  { id: "sneakers", label: "Sneakers", icon: Footprints },
  { id: "bags", label: "Bags", icon: ShoppingBag },
  { id: "tech", label: "Tech", icon: Laptop },
  { id: "accessories", label: "Accessories", icon: Watch },
  { id: "home", label: "Home", icon: Home },
  { id: "vintage", label: "Vintage", icon: Clock },
];

export const footerColumns: FooterColumnData[] = [
  {
    heading: "Brand",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "News", href: "/news" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { label: "Sell on All Verse", href: "/sell" },
      { label: "Shipping", href: "/shipping" },
      { label: "Affiliates", href: "/affiliates" },
      { label: "Top Seller Program", href: "/top-seller-program" },
    ],
  },
  {
    heading: "Help",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Safety Center", href: "/safety" },
      { label: "Status", href: "/status" },
    ],
  },
];

export const trustBadges: TrustBadgeData[] = [
  { icon: ShieldCheck, value: "Buy Safely", label: "All Verse Protection" },
  { icon: Package, value: "10M+", label: "Items for sale" },
  { icon: Sparkles, value: "50K+", label: "New listings every day" },
];

export const categoryPickerCards: CategoryPickerCardData[] = [
  {
    id: "womenswear",
    label: "Womenswear",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=750&fit=crop&q=75",
  },
  {
    id: "menswear",
    label: "Menswear",
    image:
      "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=600&h=750&fit=crop&q=75",
  },
  {
    id: "kids",
    label: "Kids",
    image:
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=750&fit=crop&q=75",
  },
  {
    id: "everything",
    label: "Everything",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=750&fit=crop&q=75",
  },
];

export const styleCards: StyleCardData[] = [
  {
    id: "beach-basics",
    label: "Beach Basics",
    image:
      "https://images.unsplash.com/photo-1503785640985-f62e3aeee448?w=600&h=600&fit=crop&q=75",
  },
  {
    id: "trending-now",
    label: "Trending Now",
    image:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=600&fit=crop&q=75",
  },
  {
    id: "frills-and-thrills",
    label: "Frills and Thrills",
    image:
      "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600&h=600&fit=crop&q=75",
  },
  {
    id: "y2k-sportswear",
    label: "Y2K Sportswear",
    image:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop&q=75",
  },
  {
    id: "plaid-pieces",
    label: "Plaid Pieces",
    image:
      "https://images.unsplash.com/photo-1608234807905-4466023792f5?w=600&h=600&fit=crop&q=75",
  },
  {
    id: "simple-summer",
    label: "Simple Summer",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop&q=75",
  },
];

export const popularThisWeek: Listing[] = [...featuredListings].reverse();

export const trendingSearches: TrendingSearchData[] = [
  { term: "Staud", count: "+2.5k searches" },
  { term: "Marc Jacobs shoes", count: "+1.4k searches" },
  { term: "Rush Dress", count: "+2k searches" },
  { term: "School bag", count: "+1.4k searches" },
];

export const footerLegalLinks: FooterLinkData[] = [
  { label: "Sitemaps", href: "/sitemaps" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Cookies", href: "/cookies" },
];
