import { NextResponse } from 'next/server';

export function ok<T extends Record<string, unknown>>(payload: T, status = 200) {
  return NextResponse.json({ success: true, ...payload }, { status });
}

export function fail(params: {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}) {
  return NextResponse.json(
    {
      success: false,
      error: params.message, // Backward compatible for existing clients
      code: params.code,
      details: params.details,
    },
    { status: params.status }
  );
}
