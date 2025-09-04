import { NextRequest, NextResponse } from "next/server";
import { error, success } from "./response";
import { applySecurityHeaders } from "./securityHeaders";
import { checkRateLimit, getIp } from "./rateLimit";

export type ApiHandler<T = any> = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;

export function withApi(handler: ApiHandler, opts?: { rateLimit?: number }) {
  return async (req: NextRequest, context?: any) => {
    try {
      checkRateLimit(getIp(req), opts?.rateLimit ?? 60);
      const res = await handler(req, context);
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
