import Link from 'next/link';

const GUIDES: { title: string; steps: { label: string; href?: string; text?: string }[] }[] = [
  {
    title: 'Selling',
    steps: [
      { label: 'Add photos on the Sell page. The AI drafts the listing.', href: '/sell' },
      { label: 'Review the draft, set the price, and publish.' },
      { label: 'Connect Stripe on the Sales page so you can get paid.', href: '/sales' },
    ],
  },
  {
    title: 'Buying',
    steps: [
      { label: 'Browse or search for an item.', href: '/listings' },
      { label: 'Message the seller from the listing if you have questions.', href: '/messages' },
      { label: 'Check out with Stripe. Track the order on your Orders page.', href: '/orders' },
    ],
  },
  {
    title: 'Your account',
    steps: [
      { label: 'Change your name, email or phone under Settings, Account.', href: '/settings' },
      { label: 'Change your password, or delete your account, under Settings, Security.', href: '/settings' },
      { label: 'Didn’t get a verification email? Check your spam folder first.' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Help</h1>
      <p className="mt-3 text-zinc-600">
        Short guides for the most common things. For anything else,{' '}
        <a href="mailto:info@allversegpt.com" className="font-medium text-primary-600 hover:text-primary-700">email info@allversegpt.com</a>.
      </p>

      <div className="mt-10 space-y-12">
        {GUIDES.map((guide) => (
          <section key={guide.title}>
            <h2 className="text-lg font-semibold text-zinc-950">{guide.title}</h2>
            <ol className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
              {guide.steps.map((step, i) => (
                <li key={step.label} className="flex gap-4 py-3.5 text-sm">
                  <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-zinc-100 text-xs font-semibold tabular-nums text-zinc-600">
                    {i + 1}
                  </span>
                  {step.href ? (
                    <Link href={step.href} className="text-zinc-800 hover:text-primary-700">{step.label}</Link>
                  ) : (
                    <span className="text-zinc-800">{step.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-zinc-500">
        Pricing and fees are on the <Link href="/pricing" className="font-medium text-zinc-700 hover:text-zinc-950">Pricing</Link> page.
      </p>
    </div>
  );
}
