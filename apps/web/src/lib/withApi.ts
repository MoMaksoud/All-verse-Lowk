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
    console.error('❌ Missing or invalid Authorization header');
    console.error('❌ Headers received:', Object.fromEntries(req.headers.entries()));
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log('🔍 Verifying token (length:', token.length, ')');
  
  try {
    const decodedToken = await verifyIdToken(token);
    console.log('✅ Token verified, user ID:', decodedToken.uid);
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
    try {
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
      }
      
      const res = await handler(req as NextRequest & { userId: string }, context);
      return applySecurityHeaders(res);
    } catch (e) {
      const res = error(e);
      return applySecurityHeaders(res);
    }
  };
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as any, init);
}
