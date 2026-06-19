import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/favorites/[listingId] — remove from favorites
export const DELETE = withApi(async (
  req: NextRequest & { userId: string },
  { params }: { params: { listingId: string } }
) => {
  await getAdminFirestore()
    .collection('favorites')
    .doc(req.userId)
    .set(
      { listingIds: FieldValue.arrayRemove(params.listingId), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

  return NextResponse.json({ success: true });
});
