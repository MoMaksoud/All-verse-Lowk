import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only apply middleware to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // CORS headers for API routes
  const response = NextResponse.next();
  
  // Allow all origins for development (should be restricted in production)
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
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
