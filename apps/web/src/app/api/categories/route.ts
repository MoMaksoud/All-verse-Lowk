import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";
import { Category } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories: Category[] = [
  { 
    id: 'electronics', 
    name: 'Electronics', 
    slug: 'electronics', 
    icon: '📱',
    iconImage: '/icons/electronics.svg',
    children: [] 
  },
  { 
    id: 'fashion', 
    name: 'Fashion', 
    slug: 'fashion', 
    icon: '👕',
    iconImage: '/icons/fashion.svg',
    children: [] 
  },
  { 
    id: 'sports', 
    name: 'Sports', 
    slug: 'sports', 
    icon: '⚽',
    iconImage: '/icons/sports.svg',
    children: [] 
  },
  { 
    id: 'home-garden', 
    name: 'Home', 
    slug: 'home-garden', 
    icon: '🏠',
    iconImage: '/icons/home.svg',
    children: [] 
  },
  { 
    id: 'books', 
    name: 'Books', 
    slug: 'books', 
    icon: '📚',
    iconImage: '/icons/books.svg',
    children: [] 
  },
  { 
    id: 'automotive', 
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
