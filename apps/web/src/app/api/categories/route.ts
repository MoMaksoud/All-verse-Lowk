import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { success } from "@/lib/response";
import { Category } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = 'iad1';

const categories: Category[] = [
  { 
    id: 'electronics', 
    name: 'Electronics', 
    children: [] 
  },
  { 
    id: 'fashion', 
    name: 'Fashion', 
    children: [] 
  },
  { 
    id: 'sports', 
    name: 'Sports', 
    children: [] 
  },
  { 
    id: 'home-garden', 
    name: 'Home', 
    children: [] 
  },
  { 
    id: 'books', 
    name: 'Books', 
    children: [] 
  },
  { 
    id: 'automotive', 
    name: 'Automotive', 
    children: [] 
  },
];

export const GET = withApi(async (req: NextRequest) => {
  return success(categories, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    }
  });
}, { requireAuth: false }); // Categories should be public
