import { NextRequest, NextResponse } from "next/server";
import { error, success } from "./response";
import { applySecurityHeaders } from "./securityHeaders";
import { checkRateLimit, getIp } from "./rateLimit";
import { verifyIdToken } from "./firebase-admin";

// Extend NextRequest to include userId
declare module "next/server" {
  interface NextRequest {
    userId?: string;
  }
}

export type ApiHandler<T = any> = (req: NextRequest & { userId: string }, context?: any) => Promise<NextResponse> | NextResponse;

/**
 * Verifies Firebase Auth token from Authorization header
 * Returns userId or throws error
 */
async function verifyFirebaseToken(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const decodedToken = await verifyIdToken(token);
    return decodedToken.uid;
  } catch (err: any) {
    console.error('❌ Token verification error:', err?.message || err);
    throw new Error(`Invalid or expired token: ${err?.message || 'Unknown error'}`);
  }
}

export function withApi(
  handler: ApiHandler, 
  opts?: { 
    rateLimit?: number;
    requireAuth?: boolean; // Default: true
  }
) {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now();
    try {
      if (req.nextUrl.pathname.startsWith('/api/dev')) {
        const res = await handler(req as NextRequest & { userId: string }, context);
        res.headers.set('Server-Timing', `api;dur=${Date.now() - startTime}`);
        return applySecurityHeaders(res);
      }

      // Rate limiting
      checkRateLimit(getIp(req), opts?.rateLimit ?? 60);
      
      // Authentication (default: required)
      const requireAuth = opts?.requireAuth !== false;
      if (requireAuth) {
        try {
          const userId = await verifyFirebaseToken(req);
          (req as any).userId = userId;
        } catch (authError) {
          return NextResponse.json(
            { error: 'Unauthorized', message: authError instanceof Error ? authError.message : 'Authentication required' },
            { status: 401 }
          );
        }
      } else {
        // Even when auth is optional, try to get userId if token is provided
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const userId = await verifyFirebaseToken(req);
            (req as any).userId = userId;
          } catch {
            // Ignore auth errors when auth is optional - userId will remain undefined
          }
        }
      }
      
      const res = await handler(req as NextRequest & { userId: string }, context);
      res.headers.set('Server-Timing', `api;dur=${Date.now() - startTime}`);
      return applySecurityHeaders(res);
    } catch (e) {
      const res = error(e);
      res.headers.set('Server-Timing', `api;dur=${Date.now() - startTime}`);
      return applySecurityHeaders(res);
    }
  };
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as any, init);
}
