import { NextResponse } from 'next/server';
import { createTestLabel } from '@/lib/createTestLabel';
import { withApi } from '@/lib/withApi';
import { NextRequest } from 'next/server';
import { isDevOrTestRouteAllowed } from '@/lib/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  if (!isDevOrTestRouteAllowed(process.env.NODE_ENV, req.headers.get('x-dev-admin-token'), process.env.DEV_ADMIN_TOKEN)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
});
