import { Listing } from "@marketplace/types";

export function textMatch(q: string, hay: string) {
  const n = (s: string) => s.toLowerCase().normalize("NFKD");
  return n(hay).includes(n(q));
}

export function filterListings(list: Listing[], q?: string | null, category?: string | null) {
  let out = list;
  if (q && q.trim()) {
    out = out.filter((x) => textMatch(q, x.title) || textMatch(q, x.description));
  }
  if (category) {
    out = out.filter((x) => x.category === category);
  }
  return out;
}
