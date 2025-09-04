import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { dbListings } from "@/lib/mockDb";
import { parsePagination } from "@/lib/pagination";
import { filterListings } from "@/lib/search";
import { success } from "@/lib/response";
import { CreateListingInput, ListingSchema } from "@marketplace/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  const url = new URL(req.url);
  const { page, limit, offset } = parsePagination(url.searchParams);
  const q = url.searchParams.get("q");
  const category = url.searchParams.get("category");
  const min = Number(url.searchParams.get("min") ?? "NaN");
  const max = Number(url.searchParams.get("max") ?? "NaN");

  let rows = filterListings(dbListings.list(), q, category);
  if (Number.isFinite(min)) rows = rows.filter(r => r.price >= min);
  if (Number.isFinite(max)) rows = rows.filter(r => r.price <= max);

  const total = rows.length;
  const items = rows.slice(offset, offset + limit);
  const body = { items, total, page, limit, hasMore: offset + limit < total };
  return success(body);
});

export const POST = withApi(async (req: NextRequest) => {
  const raw = (await req.json()) as unknown;
  const parsed = (CreateListingInput.parse(raw));
  const sellerId = parsed.sellerId ?? req.headers.get("x-user-id") ?? "u2";
  const created = dbListings.create({ ...parsed, sellerId }, sellerId);
  return success(created, { status: 201 });
});
