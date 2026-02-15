import { NextResponse } from 'next/server';
import { createTestLabel } from '@/lib/createTestLabel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await createTestLabel();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[test-shippo]', err);
    return NextResponse.json(
      { error: 'Shippo test label failed', message },
      { status: 500 }
    );
  }
}
