import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <nav className="backdrop-blur-xl bg-dark-900/80 border-b border-dark-700/50 h-[64px] flex items-center px-6">
        <Link href="/" className="text-white font-bold text-lg tracking-tight">
          ALL VERSE GPT
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-8xl font-bold text-accent-500 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-4">
          <Link
            href="/"
            className="bg-accent-500 hover:bg-accent-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/listings"
            className="bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Browse listings
          </Link>
        </div>
      </div>
    </div>
  );
}
