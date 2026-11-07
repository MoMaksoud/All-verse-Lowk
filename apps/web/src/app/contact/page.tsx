export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Contact</h1>
      <p className="mt-3 text-zinc-600">
        Questions, feedback, or a problem with an order? Email us and we’ll reply.
      </p>

      <a
        href="mailto:info@allversegpt.com"
        className="btn btn-primary mt-8"
      >
        Email info@allversegpt.com
      </a>

      <p className="mt-10 text-sm text-zinc-500">
        For a problem with a specific order or listing, include the order or listing number from the page so we can find it quickly.
      </p>
    </div>
  );
}
