import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of configuredOrigins) {
    allowed.add(origin);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    allowed.add(appUrl.replace(/\/$/, ''));
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
    allowed.add('http://localhost:8081');
    allowed.add('http://127.0.0.1:8081');
  }

  return allowed;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Explicitly exclude static assets and Next.js internal routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') && !pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }
  
  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/dev')) {
    return NextResponse.next();
  }

  // CORS headers for API routes (allowlist-based only)
  const response = NextResponse.next();
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = !!origin && allowedOrigins.has(origin);

  if (origin && !isAllowedOrigin) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 403 });
    }
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  if (isAllowedOrigin && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Only match API routes to reduce middleware processing overhead
     * This significantly reduces the number of requests processed by middleware
     */
    '/api/:path*',
  ],
};
