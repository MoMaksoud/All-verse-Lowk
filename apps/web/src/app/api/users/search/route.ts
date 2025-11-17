import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/withApi';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export const GET = withApi(async (req: NextRequest & { userId: string }) => {
  try {
    if (!db || !isFirebaseConfigured()) {
      return NextResponse.json({ 
        error: 'Database not initialized or Firebase not configured' 
      }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('q');
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Search term must be at least 2 characters' 
      }, { status: 400 });
    }

    // Remove @ if present
    const cleanTerm = searchTerm.replace(/^@/, '').trim().toLowerCase();
    
    // Search profiles by username (case-insensitive partial match)
    // Note: Firestore doesn't support case-insensitive search natively
    // This is a simple prefix search - for production, consider Algolia/Elasticsearch
    const profilesRef = collection(db, 'profiles');
    const q = query(
      profilesRef,
      where('username', '>=', cleanTerm),
      where('username', '<=', cleanTerm + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const users = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          username: data.username,
          displayName: data.displayName || data.username, // Fallback to username if displayName doesn't exist (for old profiles)
          profilePicture: data.profilePicture || '',
          bio: data.bio || ''
        };
      })
      .filter(user => {
        // Exclude current user
        if (user.userId === req.userId) return false;
        // Case-insensitive filter: check if username starts with search term
        const usernameLower = (user.username || '').toLowerCase();
        return usernameLower.startsWith(cleanTerm);
      });

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ 
      error: 'Failed to search users' 
    }, { status: 500 });
  }
});

