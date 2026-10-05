import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Pricing</h1>
      <p className="mt-3 max-w-[60ch] text-zinc-600">
        Listing is free. AllVerse takes a fee only when an item sells.
      </p>

      <section className="mt-10 grid gap-10 border-t border-zinc-200 pt-10 sm:grid-cols-2">
        <div>
          <h2 className="font-semibold text-zinc-950">If you sell</h2>
          <p className="mt-2 text-sm text-zinc-600">
            AllVerse keeps 4.5% of the item price. The rest goes to your connected Stripe account.
          </p>
          <dl className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200 text-sm">
            <div className="flex justify-between py-2.5"><dt className="text-zinc-600">Item price</dt><dd className="tabular-nums text-zinc-950">$80.00</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-zinc-600">AllVerse fee (4.5%)</dt><dd className="tabular-nums text-zinc-950">−$3.60</dd></div>
            <div className="flex justify-between py-2.5 font-medium"><dt className="text-zinc-950">You receive</dt><dd className="tabular-nums text-zinc-950">$76.40</dd></div>
          </dl>
        </div>

        <div>
          <h2 className="font-semibold text-zinc-950">If you buy</h2>
          <p className="mt-2 text-sm text-zinc-600">
            You pay the item price, shipping, sales tax, and a card processing fee. The total is shown before you pay.
          </p>
          <p className="mt-5 text-sm text-zinc-600">
            Payments are processed by Stripe.
          </p>
        </div>
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link href="/sell" className="btn btn-primary">List an item</Link>
        <Link href="/listings" className="btn btn-outline">Browse listings</Link>
      </div>
    </div>
  );
}
