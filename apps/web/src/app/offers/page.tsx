import Link from 'next/link';

export default function OffersPage() {
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Offers</h1>
      <p className="mt-2 max-w-[60ch] text-zinc-600">
        Price offers aren’t available yet. For now, message the seller from a listing to agree on a price.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/listings" className="btn btn-primary">Browse listings</Link>
        <Link href="/messages" className="btn btn-outline">Go to messages</Link>
      </div>
    </div>
  );
}
