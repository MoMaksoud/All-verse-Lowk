import { NextResponse } from "next/server";

export function applySecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  // Set COOP to allow popups for Google sign-in (Firebase Auth requires this)
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  // Lightweight CSP; extend as needed for your frontend
  res.headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; object-src 'none'");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return res;
}
