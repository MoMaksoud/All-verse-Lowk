import { NextRequest, NextResponse } from "next/server";
import { dbListings } from "@/lib/mockDb";
import { SimpleListingCreate } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const min = url.searchParams.get('min') ? Number(url.searchParams.get('min')) : undefined;
    const max = url.searchParams.get('max') ? Number(url.searchParams.get('max')) : undefined;
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 20;
    const sort = url.searchParams.get('sort') || 'recent';

    const filters = {
      keyword: q,
      category: category,
      minPrice: min,
      maxPrice: max,
    };

    console.log('API Route - Received filters:', filters);
    const result = await dbListings.search(filters, page, limit);
    console.log('API Route - Search result:', result);
    
    // Apply sorting
    let sortedData = [...result.items];
    switch (sort) {
      case 'priceAsc':
        sortedData.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        sortedData.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        // For now, sort by newest since we don't have ratings in SimpleListing
        sortedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'recent':
      default:
        sortedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    
    return NextResponse.json({
      data: sortedData,
      total: result.total,
      page: page,
      limit: limit,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SimpleListingCreate;
    
    // Basic validation
    if (!body.title || !body.description || typeof body.price !== 'number' || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listing = dbListings.create(body, 'user1'); // Default seller ID
    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
