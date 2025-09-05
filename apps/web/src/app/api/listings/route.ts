import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbListings } from "@/lib/mockDb";
import { parsePagination } from "@/lib/pagination";
import { filterListings } from "@/lib/search";
import { success } from "@/lib/response";
import { CreateListingInput, SearchQuery } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const query = SearchQuery.parse(searchParams);
  
  const filters = {
    keyword: query.q,
    category: query.category,
    minPrice: query.min,
    maxPrice: query.max,
  };

  const result = await dbListings.search(filters, query.page, query.limit);
  
  // Apply sorting
  if (query.sort === 'priceAsc') {
    result.items.sort((a, b) => a.price - b.price);
  } else if (query.sort === 'priceDesc') {
    result.items.sort((a, b) => b.price - a.price);
  }
  // 'recent' is default sorting by creation date

  const body = { 
    items: result.items, 
    total: result.total, 
    page: query.page, 
    limit: query.limit, 
    hasMore: result.hasMore 
  };
  return success(body);
});

export const POST = withApi(async (req: NextRequest) => {
  const raw = (await req.json()) as unknown;
  const parsed = CreateListingInput.parse(raw);
  const sellerId = parsed.sellerId ?? req.headers.get("x-user-id") ?? "user1";
  const created = dbListings.create({ ...parsed, status: "active" }, sellerId);
  return success(created, { status: 201 });
});
