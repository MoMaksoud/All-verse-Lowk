import Link from 'next/link';

const FAQS: { question: string; answer: React.ReactNode }[] = [
  {
    question: 'I didn’t get my verification email.',
    answer: 'Check your spam or junk folder. Marking it “Not spam” helps future emails reach your inbox.',
  },
  {
    question: 'How do I list an item?',
    answer: (
      <>
        Go to <Link href="/sell" className="font-medium text-primary-600 hover:text-primary-700">Sell</Link>, add photos, and the AI drafts the title, description, category and condition. It asks about anything the photos don’t show. You review everything before you publish.
      </>
    ),
  },
  {
    question: 'How is the price suggested?',
    answer: 'The AI looks at comparable listings and suggests a range. It shows how many listings the range is based on. You set the final price.',
  },
  {
    question: 'Can I negotiate?',
    answer: 'Yes. Buyers and sellers talk through Messages, which is linked from each listing.',
  },
  {
    question: 'How do I pay for something?',
    answer: 'Checkout is handled by Stripe. Use a debit or credit card. The total, including tax and fees, is shown before you pay.',
  },
  {
    question: 'When do I get paid as a seller?',
    answer: 'Connect a Stripe account from the Sales page before your first sale. After a buyer pays, the payout goes to your connected account. The seller fee is 4.5% of the item price.',
  },
  {
    question: 'My item arrived damaged. What now?',
    answer: (
      <>
        Message the seller first. If that doesn’t resolve it, email{' '}
        <a href="mailto:info@allversegpt.com" className="font-medium text-primary-600 hover:text-primary-700">info@allversegpt.com</a>{' '}
        with photos and your order number.
      </>
    ),
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Settings, open Security, and choose Delete account. This removes your listings and profile and can’t be undone.',
  },
  {
    question: 'How do I change my email or password?',
    answer: 'Your email is under Settings, Account. Your password is under Settings, Security. Changing either asks for your current password.',
  },
];

export default function FAQPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Frequently asked questions</h1>
      <p className="mt-3 text-zinc-600">
        Not here? <a href="mailto:info@allversegpt.com" className="font-medium text-primary-600 hover:text-primary-700">Email info@allversegpt.com</a>.
      </p>

      <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left font-medium text-zinc-950 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span aria-hidden="true" className="text-xl leading-none text-zinc-500 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="mt-3 max-w-[65ch] leading-relaxed text-zinc-600">{faq.answer}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
