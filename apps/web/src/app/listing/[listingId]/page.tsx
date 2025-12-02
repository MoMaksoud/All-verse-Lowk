'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function ListingRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params?.listingId as string;

  useEffect(() => {
    if (listingId) {
      router.replace(`/listings/${listingId}`);
    }
  }, [listingId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

