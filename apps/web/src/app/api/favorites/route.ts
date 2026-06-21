import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/favorites — returns array of listing IDs the user has favorited
export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  const snap = await getAdminFirestore()
    .collection('favorites')
    .doc(req.userId)
    .get();

  const listingIds: string[] = snap.exists ? (snap.data()?.listingIds ?? []) : [];
  return NextResponse.json({ success: true, data: listingIds });
});

// POST /api/favorites — add a listing to favorites
export const POST = withApi(async (req: NextRequest & { userId: string }) => {
  const { listingId } = await req.json();
  if (!listingId || typeof listingId !== 'string') {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  }

  await getAdminFirestore()
    .collection('favorites')
    .doc(req.userId)
    .set(
      { listingIds: FieldValue.arrayUnion(listingId), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

  return NextResponse.json({ success: true });
});
