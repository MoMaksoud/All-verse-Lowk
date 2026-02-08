import { rateLimited } from "@marketplace/shared-logic";

// Simple token bucket: N requests per minute per IP
const BUCKETS = new Map<string, { tokens: number; last: number }>();

export function checkRateLimit(ip: string, limitPerMin = 60) {
  const now = Date.now();
  const refillMs = 60_000;
  const b = BUCKETS.get(ip) ?? { tokens: limitPerMin, last: now };
  const elapsed = now - b.last;
  const refill = Math.floor((elapsed / refillMs) * limitPerMin);
  const tokens = Math.min(limitPerMin, b.tokens + (refill > 0 ? refill : 0));
  const next = { tokens, last: refill > 0 ? now : b.last };
  if (next.tokens <= 0) throw rateLimited("Too many requests");
  next.tokens -= 1;
  BUCKETS.set(ip, next);
}

export function getIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}
