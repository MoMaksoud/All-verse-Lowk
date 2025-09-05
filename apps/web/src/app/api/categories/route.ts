import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";
import { Category } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories: Category[] = [
  { 
    id: 'cat1', 
    name: 'Electronics', 
    slug: 'electronics', 
    icon: '📱',
    iconImage: '/icons/electronics.svg',
    children: [] 
  },
  { 
    id: 'cat2', 
    name: 'Fashion', 
    slug: 'fashion', 
    icon: '👕',
    iconImage: '/icons/fashion.svg',
    children: [] 
  },
  { 
    id: 'cat3', 
    name: 'Sports', 
    slug: 'sports', 
    icon: '⚽',
    iconImage: '/icons/sports.svg',
    children: [] 
  },
  { 
    id: 'cat4', 
    name: 'Home', 
    slug: 'home-garden', 
    icon: '🏠',
    iconImage: '/icons/home.svg',
    children: [] 
  },
  { 
    id: 'cat5', 
    name: 'Books', 
    slug: 'books', 
    icon: '📚',
    iconImage: '/icons/books.svg',
    children: [] 
  },
  { 
    id: 'cat6', 
    name: 'Automotive', 
    slug: 'automotive', 
    icon: '🚗',
    iconImage: '/icons/automotive.svg',
    children: [] 
  },
];

export const GET = withApi(async (req: NextRequest) => {
  return success(categories);
});
